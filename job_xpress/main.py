import asyncio
from fastapi import FastAPI, HTTPException, BackgroundTasks
from models.candidate import TallyWebhookPayload, CandidateProfile
from services.search_engine import search_engine
from services.llm_engine import llm_engine
from services.pdf_generator import pdf_generator
from services.database import db_service
from services.email_service import email_service
from core.config import settings
from services.ocr_service import ocr_service

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# Stockage mémoire simple pour dédoublonner les IDs récents (cache de 10 min idéalement)
# Pour la prod, Supabase est mieux, mais ceci suffit pour stopper les retries immédiats de Tally
PROCESSED_EVENTS = set()

@app.get("/")
def health_check():
    return {"status": "online", "version": settings.VERSION}

@app.head("/")
def health_check_head():
    return {}

# --- FONCTION DE TRAITEMENT EN ARRIÈRE-PLAN ---
async def process_application_task(payload: TallyWebhookPayload):
    """
    C'est ici que tout le travail lourd se fait, sans bloquer Tally.
    """
    event_id = payload.eventId
    print(f"\n🚀 [Background] Démarrage traitement Event ID: {event_id}")

    try:
        # 1. PROFIL
        candidate = CandidateProfile.from_tally(payload)
        print(f"👤 Candidat : {candidate.first_name} {candidate.last_name}")

        # --- NOUVEAU : ETAPE OCR ---
        if candidate.cv_url:
            candidate.cv_text = await asyncio.to_thread(ocr_service.extract_text_from_cv, candidate.cv_url)
        else:
            print("⚠️ Pas de CV fourni, on utilise uniquement les champs du formulaire.")

        # 2. RECHERCHE
        raw_jobs = await search_engine.find_jobs(candidate)
        total_found = len(raw_jobs)
        print(f"🔍 {total_found} offres trouvées.")

        if not raw_jobs:
            print("❌ Aucune offre trouvée. Fin du traitement.")
            return

        # 3. ANALYSE
        valid_jobs = []
        BATCH_SIZE = 5 
        
        for i in range(0, total_found, BATCH_SIZE):
            batch = raw_jobs[i : i + BATCH_SIZE]
            print(f"🧠 Analyse lot {i+1}-{i+len(batch)}...")
            
            analyzed_batch = await llm_engine.analyze_offers_parallel(candidate, batch)
            new_matches = [j for j in analyzed_batch if j.match_score >= 50]
            valid_jobs.extend(new_matches)

        if not valid_jobs:
            print("⚠️ Aucune offre pertinente après analyse.")
            return

        # Tri final
        valid_jobs.sort(key=lambda x: x.match_score, reverse=True)

        # 4. SÉLECTION & LIVRABLES
        best_offer = valid_jobs[0]
        other_offers = valid_jobs[1:]
        print(f"🏆 Gagnant : {best_offer.title} ({best_offer.company})")

        letter_data = await llm_engine.generate_cover_letter(candidate, best_offer)
        pdf_path = pdf_generator.create_application_pdf(candidate, best_offer, letter_data.get("html_content", ""))

        if pdf_path:
            # 5. SAUVEGARDE & ENVOI
            db_service.save_application(candidate, best_offer, pdf_path)
            email_service.send_application_email(candidate, best_offer, other_offers, pdf_path)
            print(f"✅ Cycle terminé avec succès pour {candidate.email}")

    except Exception as e:
        print(f"❌ CRASH Background Task : {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Nettoyage éventuel
        pass

# --- ENDPOINT API (Réponse Rapide) ---
@app.post("/webhook/tally")
async def receive_tally_webhook(payload: TallyWebhookPayload, background_tasks: BackgroundTasks):
    """
    Reçoit la requête, valide, et lance le travail en fond.
    Répond instantanément à Tally.
    """
    # 1. Déduplication basique
    if payload.eventId in PROCESSED_EVENTS:
        print(f"♻️ Doublon détecté (Event {payload.eventId}), ignoré.")
        return {"status": "ignored", "reason": "duplicate_event"}
    
    PROCESSED_EVENTS.add(payload.eventId)

    # 2. Lancement de la tâche de fond
    background_tasks.add_task(process_application_task, payload)

    # 3. Réponse immédiate (< 1s)
    print(f"📨 Webhook reçu (Event {payload.eventId}). Traitement lancé en arrière-plan.")
    return {"status": "received", "message": "Processing started in background"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
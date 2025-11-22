import asyncio
import time
from fastapi import FastAPI, HTTPException, BackgroundTasks
from models.candidate import TallyWebhookPayload, CandidateProfile
from services.search_engine import search_engine
from services.llm_engine import llm_engine
from services.pdf_generator import pdf_generator
from services.database import db_service
from services.email_service import email_service
from services.ocr_service import ocr_service
from core.config import settings

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# --- DÉDUPLICATION INTELLIGENTE ---
# Stocke { "email": timestamp }
# Si un candidat resoumet avant 5 minutes (300s), on ignore.
PROCESSED_EMAILS = {}
COOLDOWN_SECONDS = 300 

@app.get("/")
def health_check():
    return {"status": "online", "version": settings.VERSION}

@app.head("/")
def health_check_head():
    return {}

async def process_application_task(payload: TallyWebhookPayload):
    event_id = payload.eventId
    print(f"\n🚀 [Background] Démarrage traitement Event ID: {event_id}")

    try:
        # 1. PROFIL
        candidate = CandidateProfile.from_tally(payload)
        print(f"👤 Candidat : {candidate.first_name} {candidate.last_name} ({candidate.email})")

        # --- OCR ---
        if candidate.cv_url:
            candidate.cv_text = await ocr_service.extract_text_from_cv(candidate.cv_url)
        else:
            print("⚠️ Pas de CV fourni.")

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
            
            # Seuil à 1 pour garder les "non-écoles"
            new_matches = [j for j in analyzed_batch if j.match_score > 0]
            valid_jobs.extend(new_matches)
            
            print(f"   -> {len(new_matches)} offre(s) conservée(s).")

        if not valid_jobs:
            print("⚠️ Aucune offre retenue (que des écoles).")
            return

        # Tri final
        valid_jobs.sort(key=lambda x: x.match_score, reverse=True)

        print("\n📊 PODIUM FINAL :")
        for j in valid_jobs[:3]:
            print(f"   🥇 {j.match_score}% - {j.title} ({j.company})")

        # 4. SÉLECTION & LIVRABLES
        best_offer = valid_jobs[0]
        other_offers = valid_jobs[1:]
        print(f"\n🏆 GAGNANT : {best_offer.title} chez {best_offer.company}")

        letter_data = await llm_engine.generate_cover_letter(candidate, best_offer)
        pdf_path = pdf_generator.create_application_pdf(candidate, best_offer, letter_data.get("html_content", ""))

        if pdf_path:
            db_service.save_application(candidate, best_offer, pdf_path)
            email_service.send_application_email(candidate, best_offer, other_offers, pdf_path)
            print(f"✅ Cycle terminé avec succès pour {candidate.email}")

    except Exception as e:
        print(f"❌ CRASH Background Task : {str(e)}")
        import traceback
        traceback.print_exc()

@app.post("/webhook/tally")
async def receive_tally_webhook(payload: TallyWebhookPayload, background_tasks: BackgroundTasks):
    """
    Endpoint avec protection anti-doublon par EMAIL.
    """
    try:
        # On extrait l'email AVANT de lancer le traitement lourd
        # Pour faire propre, on utilise une méthode légère pour choper l'email
        fields = {f.key: f.value for f in payload.data.fields}
        # ID de l'email dans Tally (question_D7V1kj)
        candidate_email = fields.get("question_D7V1kj", "unknown")

        # --- VÉRIFICATION DOUBLON ---
        current_time = time.time()
        last_time = PROCESSED_EMAILS.get(candidate_email, 0)

        if (current_time - last_time) < COOLDOWN_SECONDS:
            print(f"⛔ Doublon bloqué pour {candidate_email} (Trop tôt, attend 5 min).")
            return {"status": "ignored", "reason": "rate_limited"}
        
        # Mise à jour du timestamp
        PROCESSED_EMAILS[candidate_email] = current_time

        # Nettoyage du cache (simple) : si plus de 1000 entrées, on vide tout
        if len(PROCESSED_EMAILS) > 1000:
            PROCESSED_EMAILS.clear()

        # Lancement
        background_tasks.add_task(process_application_task, payload)

        print(f"📨 Webhook reçu pour {candidate_email}. Traitement lancé.")
        return {"status": "received", "message": "Processing started"}

    except Exception as e:
        # Si l'extraction de l'email plante, on accepte quand même par sécurité
        print(f"⚠️ Erreur extraction email pour dédup : {e}")
        background_tasks.add_task(process_application_task, payload)
        return {"status": "received_fallback"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
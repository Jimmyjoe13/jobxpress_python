from fastapi import FastAPI, HTTPException
from models.candidate import TallyWebhookPayload, CandidateProfile
from services.search_engine import search_engine
from services.llm_engine import llm_engine
from services.pdf_generator import pdf_generator
from services.database import db_service
from services.email_service import email_service
from core.config import settings

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

@app.get("/")
def health_check():
    return {"status": "online", "version": settings.VERSION}

@app.head("/")
def health_check_head():
    return {}

@app.post("/webhook/tally")
async def receive_tally_webhook(payload: TallyWebhookPayload):
    """
    Orchestrateur Complet (Mode Performance) :
    Analyse TOUTES les offres trouvées pour dénicher la meilleure.
    """
    try:
        # 1. PROFIL
        candidate = CandidateProfile.from_tally(payload)
        print(f"\n✅ Profil reçu : {candidate.first_name} {candidate.last_name}")

        # 2. RECHERCHE (Multi-Sources)
        raw_jobs = await search_engine.find_jobs(candidate)
        total_found = len(raw_jobs)
        print(f"🔍 {total_found} offres brutes trouvées.")

        if not raw_jobs:
            return {"status": "no_jobs_found", "message": "Aucune offre trouvée."}

        # 3. ANALYSE INTELLIGENTE (Scan Complet)
        valid_jobs = []
        BATCH_SIZE = 5 
        
        # On boucle sur TOUTES les offres par paquets
        for i in range(0, total_found, BATCH_SIZE):
            
            # --- MODIFICATION ICI : On a retiré le "break" pour tout analyser ---
            
            batch = raw_jobs[i : i + BATCH_SIZE]
            print(f"\n🧠 Analyse du lot {i+1}-{i+len(batch)} (sur {total_found})...")
            
            # Analyse parallèle du lot courant
            analyzed_batch = await llm_engine.analyze_offers_parallel(candidate, batch)
            
            # On garde celles qui ont la moyenne (> 50%)
            new_matches = [j for j in analyzed_batch if j.match_score >= 50]
            valid_jobs.extend(new_matches)
            
            print(f"   -> {len(new_matches)} offre(s) pertinente(s) dans ce lot.")

        # --- BILAN ---
        if not valid_jobs:
            print("\n⚠️ Aucune offre pertinente après analyse complète.")
            return {"status": "no_match_found"}

        # Tri final : On met la meilleure offre tout en haut
        valid_jobs.sort(key=lambda x: x.match_score, reverse=True)

        # Affichage du Top 3 pour info
        print("\n📊 PODIUM FINAL :")
        for j in valid_jobs[:3]:
            print(f"   🥇 {j.match_score}% - {j.title} ({j.company})")

        # 4. GÉNÉRATION LIVRABLES (Top 1 absolu)
        best_offer = valid_jobs[0]
        print(f"\n🏆 GAGNANT : {best_offer.title} chez {best_offer.company}")

        # Rédaction & PDF
        letter_data = await llm_engine.generate_cover_letter(candidate, best_offer)
        pdf_path = pdf_generator.create_application_pdf(candidate, best_offer, letter_data.get("html_content", ""))

        if pdf_path:
            print(f"✅ PDF généré : {pdf_path}")
            
            # 5. SAUVEGARDE DB
            db_service.save_application(candidate, best_offer, pdf_path)
            
            # 6. ENVOI EMAIL
            email_service.send_application_email(candidate, best_offer, pdf_path)

        return {
            "status": "completed",
            "candidate": candidate.email,
            "best_match": best_offer.company,
            "score": best_offer.match_score
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
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
    Orchestrateur Complet avec Email Enrichi.
    """
    try:
        # 1. PROFIL
        candidate = CandidateProfile.from_tally(payload)
        print(f"\n✅ Profil reçu : {candidate.first_name} {candidate.last_name}")

        # 2. RECHERCHE
        raw_jobs = await search_engine.find_jobs(candidate)
        total_found = len(raw_jobs)
        print(f"🔍 {total_found} offres brutes trouvées.")

        if not raw_jobs:
            return {"status": "no_jobs_found", "message": "Aucune offre trouvée."}

        # 3. ANALYSE INTELLIGENTE
        valid_jobs = []
        BATCH_SIZE = 5 
        
        for i in range(0, total_found, BATCH_SIZE):
            batch = raw_jobs[i : i + BATCH_SIZE]
            print(f"\n🧠 Analyse du lot {i+1}-{i+len(batch)} (sur {total_found})...")
            
            analyzed_batch = await llm_engine.analyze_offers_parallel(candidate, batch)
            new_matches = [j for j in analyzed_batch if j.match_score >= 50]
            valid_jobs.extend(new_matches)
            
            print(f"   -> {len(new_matches)} offre(s) pertinente(s) dans ce lot.")

        if not valid_jobs:
            print("\n⚠️ Aucune offre pertinente après analyse complète.")
            return {"status": "no_match_found"}

        # Tri final
        valid_jobs.sort(key=lambda x: x.match_score, reverse=True)

        print("\n📊 PODIUM FINAL :")
        for j in valid_jobs[:3]:
            print(f"   🥇 {j.match_score}% - {j.title} ({j.company})")

        # 4. SÉLECTION
        best_offer = valid_jobs[0]       # Le gagnant (Lettre PDF)
        other_offers = valid_jobs[1:]    # Les suivants (Liste dans l'email)

        print(f"\n🏆 GAGNANT : {best_offer.title} chez {best_offer.company}")

        # 5. GÉNÉRATION LIVRABLES
        letter_data = await llm_engine.generate_cover_letter(candidate, best_offer)
        pdf_path = pdf_generator.create_application_pdf(candidate, best_offer, letter_data.get("html_content", ""))

        if pdf_path:
            print(f"✅ PDF généré : {pdf_path}")
            
            # SAUVEGARDE DB
            db_service.save_application(candidate, best_offer, pdf_path)
            
            # 6. ENVOI EMAIL (Avec la liste des autres offres !)
            email_service.send_application_email(candidate, best_offer, other_offers, pdf_path)

        return {
            "status": "completed",
            "candidate": candidate.email,
            "best_match": best_offer.company,
            "other_matches_count": len(other_offers)
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
from fastapi import FastAPI, HTTPException
from models.candidate import TallyWebhookPayload, CandidateProfile
from services.search_engine import search_engine
from services.llm_engine import llm_engine
from services.pdf_generator import pdf_generator
from core.config import settings

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

@app.get("/")
def health_check():
    return {"status": "online", "version": settings.VERSION}

@app.post("/webhook/tally")
async def receive_tally_webhook(payload: TallyWebhookPayload):
    """
    Orchestrateur avec "Smart Batching" :
    Tant qu'on n'a pas de match, on continue d'analyser les offres suivantes.
    """
    try:
        # --- ÉTAPE 1 : CRÉATION DU PROFIL ---
        candidate = CandidateProfile.from_tally(payload)
        print(f"\n✅ Profil reçu : {candidate.first_name} {candidate.last_name} - {candidate.job_title}")

        # --- ÉTAPE 2 : RECHERCHE JSEARCH ---
        raw_jobs = await search_engine.find_jobs(candidate)
        total_found = len(raw_jobs)
        print(f"🔍 {total_found} offres brutes trouvées.")

        if not raw_jobs:
            return {"status": "no_jobs_found", "message": "Aucune offre trouvée sur JSearch."}

        # --- ÉTAPE 3 : ANALYSE IA INTELLIGENTE (BOUCLE) ---
        valid_jobs = []
        BATCH_SIZE = 5  # On analyse par paquets de 5
        
        # On boucle sur les offres par paquets
        for i in range(0, total_found, BATCH_SIZE):
            # Si on a déjà trouvé au moins 1 bonne offre, on peut s'arrêter 
            # (ou continuer si on veut absolument un Top 3, ici on optimise les coûts : 1 suffit)
            if len(valid_jobs) >= 1:
                break

            # Sélection du lot courant (ex: 0 à 5, puis 5 à 10...)
            batch = raw_jobs[i : i + BATCH_SIZE]
            print(f"\n🧠 Analyse du lot {i+1}-{i+len(batch)} (sur {total_found})...")
            
            # Analyse parallèle du lot
            analyzed_batch = await llm_engine.analyze_offers_parallel(candidate, batch)
            
            # Filtrage des succès (> 50%)
            new_matches = [j for j in analyzed_batch if j.match_score >= 50]
            valid_jobs.extend(new_matches)
            
            print(f"   -> {len(new_matches)} offre(s) pertinente(s) trouvée(s) dans ce lot.")

        # --- VÉRIFICATION FINALE ---
        if not valid_jobs:
            print("\n⚠️  Toutes les offres ont été analysées et aucune ne convient (probablement que des écoles).")
            return {"status": "no_match_found", "message": "Aucune offre pertinente après analyse complète."}

        # Tri final des résultats (du meilleur au moins bon)
        valid_jobs.sort(key=lambda x: x.match_score, reverse=True)

        print("\n📊 RÉSULTATS FINAUX (Top 3 retenus) :")
        for job in valid_jobs[:3]:
            print(f"   ★ {job.match_score}% - {job.title} ({job.company})")

        # --- ÉTAPE 4 : GÉNÉRATION DES LIVRABLES ---
        best_offer = valid_jobs[0]
        print(f"\n🏆 Meilleure offre sélectionnée : {best_offer.title} chez {best_offer.company}")

        letter_data = await llm_engine.generate_cover_letter(candidate, best_offer)
        
        pdf_path = pdf_generator.create_application_pdf(
            candidate, 
            best_offer, 
            letter_data.get("html_content", "")
        )

        if pdf_path:
            print(f"✅ PDF généré : {pdf_path}")

        return {
            "status": "completed",
            "candidate": candidate.email,
            "jobs_found_total": total_found,
            "best_match": {
                "company": best_offer.company,
                "score": best_offer.match_score,
                "pdf_path": pdf_path
            }
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
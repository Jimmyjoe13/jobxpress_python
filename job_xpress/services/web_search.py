from ddgs import DDGS
import asyncio

class WebSearchService:
    def __init__(self):
        self.ddgs = DDGS()

    async def get_company_reputation(self, company_name: str) -> str:
        """
        Cherche des infos neutres sur l'activité réelle de l'entreprise.
        """
        # NOUVELLE REQUÊTE : On cherche l'activité et ce que disent les employés
        # Ex: "Media-Start activité avis employé" -> remonte Glassdoor, LinkedIn, Societe.com
        query = f"{company_name} activité secteur avis employé recrutement"
        
        print(f"🌐 Vérification web pour : {company_name}...")
        
        try:
            results = await asyncio.to_thread(self._search_sync, query)
            
            if not results:
                return "Aucune info web trouvée."

            # On prend un peu plus de contexte (4 résultats) pour être sûr
            context = "\n".join([f"- {r['title']}: {r['body']}" for r in results[:4]])
            return context

        except Exception as e:
            print(f"⚠️ Erreur recherche web ({company_name}): {e}")
            return "Recherche indisponible."

    def _search_sync(self, query):
        # On demande des résultats en Français
        return list(self.ddgs.text(query, region='fr-fr', max_results=4))

web_search = WebSearchService()
from duckduckgo_search import DDGS
import asyncio

class WebSearchService:
    def __init__(self):
        self.ddgs = DDGS()

    async def get_company_reputation(self, company_name: str) -> str:
        """
        Cherche des infos sur l'entreprise pour détecter si c'est une école/formation.
        """
        # On cible la recherche pour piéger les centres de formation
        query = f"{company_name} avis école formation recrutement"
        
        print(f"🌐 Vérification web pour : {company_name}...")
        
        try:
            # On exécute la recherche dans un thread séparé pour ne pas bloquer l'async
            results = await asyncio.to_thread(self._search_sync, query)
            
            if not results:
                return "Aucune info web trouvée."

            # On concatène les 3 premiers snippets pour l'IA
            context = "\n".join([f"- {r['title']}: {r['body']}" for r in results[:3]])
            return context

        except Exception as e:
            print(f"⚠️ Erreur recherche web ({company_name}): {e}")
            return "Recherche indisponible."

    def _search_sync(self, query):
        """Wrapper synchrone pour DuckDuckGo"""
        # max_results=3 suffit largement pour se faire une idée
        return list(self.ddgs.text(query, region='fr-fr', max_results=3))

web_search = WebSearchService()
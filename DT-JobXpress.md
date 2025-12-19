# DOCUMENTATION TECHNIQUE - JOBXPRESS (V2)

## 1. Vue d'ensemble (Overview)

JobXpress est une solution d'automatisation de candidature structurée autour d'une API RESTful (Python) et d'un client web (Next.js). Le système privilégie la robustesse (Circuit Breakers, Retries) et la qualité des données (Déduplication, Scoring IA).

## 2. Stack Technique

### Backend

* **Langage** : Python 3.10+
* **Framework** : FastAPI `>=0.100.0`
* **IA / LLM** : DeepSeek API (Modèle `deepseek-chat`)
* **Traitement de Données** :
* Parsing HTML/XML : `trafilatura`, `lxml`
* Matching flou : `thefuzz`, `python-Levenshtein`
* PDF : `xhtml2pdf`


* **Monitoring** : `sentry-sdk`, `slowapi` (Rate Limiting)
* **Testing** : `pytest`, `pytest-asyncio`

### Frontend

* **Framework** : Next.js 16 (App Router)
* **Langage** : TypeScript
* **UI Library** : Tailwind CSS v4, Lucide React, Framer Motion
* **Auth** : Supabase Auth Helpers (`@supabase/auth-helpers-nextjs`)

### Infrastructure & Data

* **Base de données** : PostgreSQL (via Supabase)
* **Cache/Queue** : SQLite (Dev) / *Recommandation Prod : Redis*
* **Container** : Docker (Dockerfile multi-stage standard)

## 3. Architecture des Services Backend

### 3.1. Moteur de Recherche (SearchEngineV2)

Le moteur opère en étapes séquentielles asynchrones :

1. **Fetch Parallèle** : Lancement simultané des requêtes vers JSearch, Active Jobs et SerpAPI.
2. **Normalisation** : Conversion des réponses brutes JSON en objets `JobOffer`.
3. **Déduplication Fuzzy** :
* Création d'une clé composite : `slug(company) | lower(title)`
* Si l'entreprise correspond, calcul de la distance de Levenshtein sur le titre.
* Seuil de similarité : **90%**.
* *Règle de résolution* : L'offre la plus récente est conservée.


4. **Smart Filtering** :
* Detection de cabinet de recrutement via regex (`AGENCY_PATTERNS`).
* Validation temporelle (`cutoff_date`).



### 3.2. Moteur d'Intelligence (LLMEngine)

Le service gère l'interaction avec le LLM DeepSeek.

* **Scoring** : Analyse JSON stricte. Le prompt force une réponse JSON contenant 3 scores (Tech, Structure, Expérience).
* **Pondération** : Score final calculé côté Python : `0.4*Tech + 0.3*Struct + 0.3*Exp`.
* **Circuit Breaker** : Si DeepSeek échoue 3 fois consécutives, le circuit s'ouvre pour 180s.
* **Fallback** : Mode dégradé utilisant des heuristiques (mots-clés dans le titre/description) pour garantir un score, même approximatif.

## 4. Modèle de Données (Supabase & Pydantic)

Les échanges de données sont validés par Pydantic V2.

### Entités Principales (Conceptual Data Model)

* **CandidateProfile** : Données extraites du CV ou du formulaire Tally/Onboarding.
* **JobOffer** : Représentation unifiée d'une offre (titre, compagnie, description, score, métadonnées).
* **ApplicationV2** : Représente le cycle de vie d'une candidature.
* `status` : Enum (`DRAFT`, `SEARCHING`, `WAITING_SELECTION`, `ANALYZING`, `GENERATING_DOCS`, `COMPLETED`, `FAILED`).
* `raw_jobs` : JSONB (Stockage des résultats bruts de recherche).
* `selected_jobs` : JSONB (Offres retenues par l'utilisateur).



## 5. API Contract (Endpoints Critiques)

Le backend expose une API REST documentée (Swagger/OpenAPI).

| Méthode | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/v2/search/start` | Initialise une nouvelle candidature, lance la recherche asynchrone. |
| `GET` | `/api/v2/applications` | Récupère l'historique de l'utilisateur (RLS activé). |
| `GET` | `/health` | Healthcheck complet vérifiant Supabase, DeepSeek et RapidAPI. |
| `POST` | `/webhook/tally` | Point d'entrée pour l'automatisation via formulaire externe. |

## 6. Sécurité et Performance

* **Rate Limiting** : Configuré globalement et par endpoint (ex: `10/minute` pour les webhooks) via `slowapi` basé sur l'IP.
* **CORS** : Strictement limité aux origines définies dans les variables d'environnement (`ALLOWED_ORIGINS`).
* **Middleware** : Gestion centralisée des erreurs (`core/error_handlers.py`) pour ne jamais exposer de stacktrace au client.
* **Async/Await** : Utilisation intensive de `asyncio` et `httpx` pour la non-bloquance des I/O (Recherche et LLM).

## 7. Recommandations de Déploiement

1. **Variables d'Environnement** :
* `DEEPSEEK_API_KEY`, `RAPIDAPI_KEY`, `SERPAPI_KEY` (Obligatoires pour le moteur).
* `SUPABASE_URL`, `SUPABASE_KEY`.
* `SENTRY_DSN` (Pour la prod).


2. **Docker** : Le service est conteneurisé. Assurez-vous de passer les arguments `--shm-size` adéquats si utilisation de Chrome headless (pour scraping avancé non visible ici mais possible).
3. **Migration** : Les scripts SQL dans `migrations/` doivent être appliqués via le CLI Supabase ou un outil de migration avant le déploiement de la V2.

---

<style>
.title {
    text-align: center;
}
h1 {
    background: linear-gradient(to right, #0066ff, #00ccff);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: #0066ff;
}
h2 {
    background: linear-gradient(to right, #00a36c, #50c878);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    color: #00a36c;
}
.logo {
    font-size: 4.5rem;
    display: inline-block;
    margin: 1.5rem 0;
    filter: drop-shadow(0 4px 8px rgba(0, 163, 108, 0.3));
    transition: all 0.3s ease;
    cursor: pointer;
}

.logo:hover {
    transform: translateY(-5px) scale(1.15);
    filter: drop-shadow(0 8px 16px rgba(0, 163, 108, 0.5));
}
</style>

<div class="title">
    <h1>JobXpress</h1>
    <div class="logo">🤖</div>
    <p>Votre compagnon pour votre recherche d'emploi boosté au stéroïde !</p>
</div>


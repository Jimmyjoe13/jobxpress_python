# 🚀 JobXpress v1.1.0 - L'Assistant de Candidature IA

JobXpress est une application d'automatisation intelligente (Growth Engineering) conçue pour révolutionner la recherche d'emploi.

Elle transforme un simple formulaire de candidature en un pipeline complet : recherche d'offres multi-sources, filtrage "anti-bullshit" par IA, rédaction de lettres de motivation ultra-personnalisées et envoi automatique par email.

---

## ✨ Fonctionnalités Clés

### 📥 Acquisition & Traitement

- **Webhook Tally** : Réception des données candidat via formulaire
- **OCR CV** : Extraction du contenu des CVs via **Mistral OCR**
- **Validation Renforcée** : Sanitization anti-XSS, validation téléphone FR

### 🔍 Recherche Multi-Sources

- **JSearch** (Google Jobs) + **Active Jobs DB**
- **Stratégie Cascade** : Expert → Large → Simple
- **Synonymes Métiers** : Base étendue de 50+ métiers avec leurs variantes
- **Deep Fetching** : Extraction du contenu complet des pages carrières

### 🧠 Intelligence Artificielle (DeepSeek)

- **Scoring Multi-critères** : Technique (40%), Structurel (30%), Expérience (30%)
- **Filtre Anti-École** : Vérification de l'e-réputation (DuckDuckGo)
- **Fallback Heuristique** : Mode dégradé automatique si l'IA est indisponible
- **Génération de Lettres** : Lettres de motivation personnalisées

### 📤 Livrables

- **PDF Professionnel** : Lettre convertie en PDF avec template moderne
- **Email Enrichi** : Top 1 + autres opportunités via **Brevo API**
- **Sauvegarde Supabase** : Historique des candidatures

---

## 🛡️ Robustesse & Fiabilité (v1.1.0)

### Résilience

| Fonctionnalité       | Description                                            |
| -------------------- | ------------------------------------------------------ |
| **Retry Pattern**    | Tentatives automatiques (3x) avec backoff exponentiel  |
| **Circuit Breaker**  | Protection contre les services défaillants             |
| **Rate Limiting**    | 10 req/min par IP sur `/webhook/tally`                 |
| **Cache Persistant** | SQLite pour la déduplication (survit aux redémarrages) |

### Observabilité

| Fonctionnalité        | Description                                           |
| --------------------- | ----------------------------------------------------- |
| **Logging Structuré** | JSON en production, coloré en développement           |
| **Health Checks**     | `/health` avec vérification de toutes les dépendances |
| **Request ID**        | Tracking unique pour chaque requête                   |
| **Sentry**            | Monitoring d'erreurs en production (optionnel)        |

### Gestion des Erreurs

| Code         | Service  | Description        |
| ------------ | -------- | ------------------ |
| `JXP-001`    | API      | Payload invalide   |
| `JXP-002`    | API      | Rate limit dépassé |
| `JXP-003`    | API      | Requête dupliquée  |
| `SEARCH-001` | Search   | Timeout recherche  |
| `LLM-001`    | LLM      | Timeout DeepSeek   |
| `OCR-001`    | OCR      | Timeout Mistral    |
| `EMAIL-001`  | Email    | Échec envoi Brevo  |
| `DB-001`     | Database | Connexion Supabase |

---

## 🛠️ Stack Technique

```
Python 3.10+
├── Framework API    : FastAPI
├── IA / LLM         : DeepSeek API
├── OCR CV           : Mistral OCR
├── Recherche        : httpx, trafilatura, ddgs
├── Base de données  : Supabase (PostgreSQL)
├── Cache            : SQLite
├── Email            : Brevo API
├── PDF              : xhtml2pdf
├── Robustesse       : tenacity, slowapi, sentry-sdk
└── Tests            : pytest, pytest-asyncio
```

---

## 🚀 Installation & Démarrage

### 1. Prérequis

- Python 3.10 ou supérieur
- Comptes API : Supabase, DeepSeek, RapidAPI, Brevo, Mistral

### 2. Installation

```bash
# Cloner le projet
git clone https://github.com/votre-repo/jobxpress.git
cd jobxpress/job_xpress

# Environnement virtuel
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Dépendances
pip install -r requirements.txt
```

### 3. Configuration

Copiez `.env.example` vers `.env` et remplissez vos clés :

```env
# Environnement
ENVIRONMENT=development  # development, staging, production

# Base de Données
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_KEY=votre-cle-anon

# IA & Recherche
DEEPSEEK_API_KEY=sk-votre-cle
MISTRAL_API_KEY=votre-cle-mistral
RAPIDAPI_KEY=votre-cle-rapidapi

# Email
BREVO_API_KEY=xkeysib-votre-cle
SENDER_EMAIL=votre.email@valide.com

# Robustesse (optionnel)
REQUEST_TIMEOUT=30
MAX_RETRIES=3
LOG_LEVEL=INFO
SENTRY_DSN=  # Production uniquement
```

### 4. Lancement

```bash
# Développement
python main.py

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

Le serveur démarrera sur `http://127.0.0.1:8000`

---

## 🧪 Tests

```bash
# Lancer tous les tests
python -m pytest tests/ -v

# Tests avec coverage
python -m pytest tests/ --cov=. --cov-report=html

# Tests spécifiques
python -m pytest tests/test_exceptions.py -v
python -m pytest tests/test_api.py -v
```

**Couverture actuelle : 87 tests**

---

## 📂 Structure du Projet

```
job_xpress/
├── core/
│   ├── config.py           # Configuration & variables d'environnement
│   ├── exceptions.py       # Hiérarchie d'exceptions personnalisées
│   ├── error_handlers.py   # Handlers d'erreurs FastAPI
│   ├── logging_config.py   # Système de logging structuré
│   └── retry.py            # Patterns de retry & circuit breaker
├── models/
│   ├── candidate.py        # Modèle candidat avec validation
│   └── job_offer.py        # Modèle offre d'emploi
├── services/
│   ├── cache_service.py    # Cache SQLite persistant
│   ├── database.py         # Connecteur Supabase
│   ├── email_service.py    # Envoi emails Brevo
│   ├── llm_engine.py       # Moteur IA DeepSeek
│   ├── ocr_service.py      # OCR Mistral
│   ├── pdf_generator.py    # Génération PDF
│   ├── search_engine.py    # Recherche multi-sources
│   └── web_search.py       # Vérification e-réputation
├── tests/
│   ├── conftest.py         # Fixtures pytest
│   ├── test_api.py         # Tests endpoints
│   ├── test_cache_service.py
│   ├── test_candidate.py
│   ├── test_exceptions.py
│   └── test_search_engine.py
├── output/                 # PDF générés
├── logs/                   # Logs (si configuré)
├── main.py                 # Point d'entrée FastAPI
├── requirements.txt        # Dépendances
├── pytest.ini              # Configuration pytest
└── .env.example            # Template de configuration
```

---

## 🌍 Déploiement

### Render (Free Tier)

1. Poussez votre code sur GitHub
2. Créez un Web Service sur Render
3. Configuration :
   - **Root Directory** : `job_xpress`
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Ajoutez vos variables d'environnement

### Docker

```dockerfile
FROM python:3.10-slim
WORKDIR /app
COPY job_xpress/ .
RUN pip install -r requirements.txt
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## 📊 Endpoints API

| Méthode | Endpoint         | Description                              |
| ------- | ---------------- | ---------------------------------------- |
| `GET`   | `/`              | Health check simple                      |
| `HEAD`  | `/`              | Health check pour load balancers         |
| `GET`   | `/health`        | Health check approfondi avec dépendances |
| `POST`  | `/webhook/tally` | Réception des webhooks Tally             |
| `GET`   | `/docs`          | Documentation Swagger                    |
| `GET`   | `/openapi.json`  | Schéma OpenAPI                           |

---

## 🛡️ Licence

Ce projet est sous licence MIT. Libre à vous de le modifier et de l'améliorer.

---

Développé avec ❤️ par **JobXpress Team** - Automatisation Intelligente des Candidatures

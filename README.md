# 🚀 JobXpress v2.0.0 - L'Assistant de Candidature IA

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
- **JobyJoba** : Coach IA pour préparer les entretiens

### 📤 Livrables

- **PDF Professionnel** : Lettre convertie en PDF avec template moderne
- **Email Enrichi** : Top 1 + autres opportunités via **Brevo API**
- **Sauvegarde Supabase** : Historique des candidatures

### 👤 Gestion de Profil (v2.0.0)

- **Profil Complet** : Informations personnelles et professionnelles
- **Upload Avatar** : Photo de profil avec preview et crop
- **Upload CV** : CV par défaut pour les candidatures
- **Préférences** : Type de contrat, mode de travail, compétences clés
- **Crédits** : Système de crédits avec plans FREE et PRO

---

## 🛡️ Robustesse & Fiabilité (v2.0.0)

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
Backend (Python 3.10+)
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

Frontend (Next.js 14+)
├── Framework        : Next.js 14 (App Router)
├── Styling          : Tailwind CSS + Design System Dark
├── Animations       : Framer Motion
├── Auth             : Supabase Auth
├── State            : React Hooks
└── Components       : Radix UI + Custom
```

---

## 📊 API V2 - Endpoints

### Authentification (JWT Supabase)

| Méthode | Endpoint          | Description                |
| ------- | ----------------- | -------------------------- |
| `GET`   | `/api/v2/me`      | Infos utilisateur connecté |
| `GET`   | `/api/v2/credits` | État des crédits           |

### Profil Utilisateur

| Méthode  | Endpoint                 | Description                 |
| -------- | ------------------------ | --------------------------- |
| `GET`    | `/api/v2/profile`        | Récupérer le profil complet |
| `PUT`    | `/api/v2/profile`        | Mettre à jour le profil     |
| `POST`   | `/api/v2/profile/avatar` | Upload avatar               |
| `DELETE` | `/api/v2/profile/avatar` | Supprimer avatar            |
| `POST`   | `/api/v2/profile/cv`     | Upload CV par défaut        |
| `DELETE` | `/api/v2/profile/cv`     | Supprimer CV                |

### Workflow Candidature (Human-in-the-Loop)

| Méthode | Endpoint                            | Description             |
| ------- | ----------------------------------- | ----------------------- |
| `POST`  | `/api/v2/search/start`              | Lancer une recherche    |
| `GET`   | `/api/v2/applications/{id}/results` | Polling résultats       |
| `POST`  | `/api/v2/applications/{id}/select`  | Sélectionner des offres |
| `GET`   | `/api/v2/applications`              | Historique candidatures |

### Notifications & Chat

| Méthode | Endpoint                          | Description                   |
| ------- | --------------------------------- | ----------------------------- |
| `GET`   | `/api/v2/notifications`           | Liste des notifications       |
| `PUT`   | `/api/v2/notifications/{id}/read` | Marquer comme lue             |
| `POST`  | `/api/v2/chat/{app_id}`           | Envoyer un message à JobyJoba |

### Health & Monitoring

| Méthode | Endpoint        | Description                      |
| ------- | --------------- | -------------------------------- |
| `GET`   | `/`             | Health check simple              |
| `HEAD`  | `/`             | Health check pour load balancers |
| `GET`   | `/health`       | Health check approfondi          |
| `GET`   | `/health/tasks` | Statistiques des tâches          |

---

## 🚀 Installation & Démarrage

### 1. Prérequis

- Python 3.10 ou supérieur
- Node.js 18 ou supérieur
- Comptes API : Supabase, DeepSeek, RapidAPI, Brevo, Mistral

### 2. Installation Backend

```bash
cd job_xpress

# Environnement virtuel
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate  # Mac/Linux

# Dépendances
pip install -r requirements.txt
```

### 3. Installation Frontend

```bash
cd frontend

# Dépendances
npm install
```

### 4. Configuration

#### Backend (.env)

```env
# Environnement
ENVIRONMENT=development

# Base de Données
SUPABASE_URL=https://votre-projet.supabase.co
SUPABASE_KEY=votre-cle-anon
SUPABASE_SERVICE_KEY=votre-service-role-key

# IA & Recherche
DEEPSEEK_API_KEY=sk-votre-cle
MISTRAL_API_KEY=votre-cle-mistral
RAPIDAPI_KEY=votre-cle-rapidapi

# Email
BREVO_API_KEY=xkeysib-votre-cle
SENDER_EMAIL=votre.email@valide.com

# Robustesse
REQUEST_TIMEOUT=30
MAX_RETRIES=3
LOG_LEVEL=INFO
```

#### Frontend (.env)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
```

### 5. Migrations Supabase

Exécutez les migrations dans Supabase SQL Editor :

1. `migrations/002_applications_v2.sql` - Tables de base
2. `migrations/005_notifications_chat.sql` - Notifications
3. `migrations/007_user_profile_extended.sql` - Profil étendu

### 6. Lancement

```bash
# Backend (depuis job_xpress/)
python main.py

# Frontend (depuis frontend/)
npm run dev
```

---

## 📂 Structure du Projet

```
jobxpress_python/
├── job_xpress/                 # Backend Python
│   ├── api/
│   │   ├── v2_endpoints.py     # Endpoints V2 Human-in-the-Loop
│   │   ├── profile_endpoints.py # Endpoints profil utilisateur
│   │   └── notifications_chat.py
│   ├── core/
│   │   ├── config.py           # Configuration
│   │   ├── auth.py             # Auth JWT Supabase
│   │   └── exceptions.py       # Exceptions personnalisées
│   ├── models/
│   │   ├── candidate.py        # Modèle candidat
│   │   ├── user_profile.py     # Modèle profil (NEW)
│   │   └── application_v2.py   # Modèle candidature V2
│   ├── services/
│   │   ├── database.py         # Supabase client
│   │   ├── billing.py          # Gestion crédits
│   │   ├── llm_engine.py       # IA DeepSeek
│   │   └── search_engine_v2.py # Recherche V2
│   ├── migrations/             # Migrations SQL Supabase
│   └── main.py                 # Point d'entrée FastAPI
│
└── frontend/                   # Frontend Next.js
    ├── src/
    │   ├── app/
    │   │   ├── dashboard/
    │   │   │   ├── profile/    # Page profil (NEW)
    │   │   │   ├── apply/      # Nouvelle candidature
    │   │   │   └── settings/   # Paramètres
    │   │   └── layout.tsx
    │   ├── components/
    │   │   ├── ui/             # Composants UI
    │   │   │   ├── avatar-upload.tsx  # Upload avatar (NEW)
    │   │   │   ├── skill-tags.tsx     # Tags compétences (NEW)
    │   │   │   └── ...
    │   │   └── profile/        # Composants profil (NEW)
    │   │       └── cv-section.tsx
    │   └── lib/
    │       ├── api.ts          # Client API
    │       ├── hooks/          # Custom hooks
    │       │   └── useUserProfile.ts  # Hook profil (NEW)
    │       └── supabase/       # Client Supabase
    └── package.json
```

---

## 🧪 Tests

```bash
# Backend
cd job_xpress
python -m pytest tests/ -v

# Frontend
cd frontend
npm test
```

---

## 🛡️ Licence

Ce projet est sous licence MIT.

---

Développé avec ❤️ par **JobXpress Team** - Automatisation Intelligente des Candidatures

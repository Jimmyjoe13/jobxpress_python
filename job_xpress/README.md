# 🚀 JobXpress - L'Assistant de Candidature IA

JobXpress est une application d'automatisation intelligente (Growth Engineering) conçue pour révolutionner la recherche d'emploi. 

Elle transforme un simple formulaire de candidature en un pipeline complet : recherche d'offres multi-sources, filtrage "anti-bullshit" par IA, rédaction de lettres de motivation ultra-personnalisées et envoi automatique par email.

---

## ✨ Fonctionnalités Clés

* **📥 Acquisition** : Réception des données candidat via Webhook (Tally, Typeform...).
* **🕵️‍♂️ Recherche Multi-Sourcing** :
    * Agrégation d'offres via **JSearch** (Google Jobs) et **Active Jobs DB**.
    * Stratégie de recherche résiliente (Cascade : Expert -> Large -> Simple).
* **🧠 Intelligence Artificielle (DeepSeek)** :
    * **Deep Fetching** : Analyse du contenu complet des pages carrières (pas juste le résumé).
    * **Filtre Anti-École** : Vérification de la e-réputation (DuckDuckGo) pour exclure les fausses offres (formations déguisées).
    * **Scoring** : Classement des offres par pertinence (0-100%).
* **✍️ Rédaction & PDF** : Génération d'une lettre de motivation HTML convertie en PDF professionnel.
* **💾 Base de Données** : Sauvegarde des profils et historiques dans **Supabase** (PostgreSQL).
* **📧 Notification** : Envoi d'un email enrichi (Top 1 + autres opportunités) via l'API **Brevo**.

---

## 🛠️ Stack Technique

* **Langage** : Python 3.10+
* **Framework API** : FastAPI
* **IA / LLM** : DeepSeek (via API)
* **Scraping & Search** : `trafilatura`, `httpx`, `ddgs` (DuckDuckGo)
* **Base de données** : Supabase
* **Emailing** : Brevo API (Port 443)
* **PDF** : `xhtml2pdf`
* **Déploiement** : Compatible Render / Railway / Docker

---

## 🚀 Installation & Démarrage

### 1. Prérequis
* Python 3.10 ou supérieur installé.
* Un compte **Supabase** (URL + Key).
* Une clé API **DeepSeek**.
* Une clé API **RapidAPI** (pour JSearch et Active Jobs DB).
* Une clé API **Brevo** (pour l'envoi d'emails).

### 2. Cloner le projet
```bash
git clone [https://github.com/votre-repo/jobxpress.git](https://github.com/votre-repo/jobxpress.git)
cd jobxpress/job_xpress
3. Environnement Virtuel
Bash

# Windows
python -m venv venv
.\venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
4. Installer les dépendances
Bash

pip install -r requirements.txt
5. Configuration (.env)
Créez un fichier .env à la racine du dossier job_xpress et remplissez-le :

Extrait de code

# API Globale
PYTHON_VERSION=3.10.0

# Base de Données (Supabase)
SUPABASE_URL=[https://votre-projet.supabase.co](https://votre-projet.supabase.co)
SUPABASE_KEY=votre-cle-anon-publique

# IA & Recherche
DEEPSEEK_API_KEY=sk-votre-cle-deepseek
RAPIDAPI_KEY=votre-cle-rapidapi

# Email (Brevo API)
BREVO_API_KEY=xkeysib-votre-cle-brevo
SENDER_EMAIL=votre.email@valide-brevo.com
6. Lancer le serveur local
Bash

python main.py
Le serveur démarrera sur http://127.0.0.1:8000.

🧪 Tester l'application
Un script de test est inclus pour simuler une requête Tally sans interface web.

Assurez-vous que le serveur tourne (python main.py).

Dans un autre terminal, lancez :

Bash

python test_local.py
Observez les logs du serveur pour voir la magie opérer (Recherche -> Analyse -> PDF -> Email).

📂 Structure du Projet
job_xpress/
├── core/
│   └── config.py          # Gestion des variables d'environnement
├── models/
│   ├── candidate.py       # Modèle de données (Input Tally)
│   └── job_offer.py       # Modèle d'une offre d'emploi standardisée
├── services/
│   ├── database.py        # Connecteur Supabase
│   ├── email_service.py   # Gestionnaire d'envoi Brevo
│   ├── llm_engine.py      # Cerveau IA (DeepSeek) + Logique de filtrage
│   ├── pdf_generator.py   # Création du PDF (xhtml2pdf)
│   ├── search_engine.py   # Moteur de recherche multi-sources & Deep Fetching
│   └── web_search.py      # Module de vérification e-réputation (DDGS)
├── output/                # Dossier temporaire pour les PDF générés
├── main.py                # Point d'entrée FastAPI & Orchestrateur
├── requirements.txt       # Liste des dépendances
└── test_local.py          # Script de simulation
🌍 Déploiement (Render)
Ce projet est configuré pour être déployé facilement sur Render (Free Tier).

Poussez votre code sur GitHub.

Créez un Web Service sur Render connecté à votre repo.

Root Directory : job_xpress.

Build Command : pip install -r requirements.txt.

Start Command : uvicorn main:app --host 0.0.0.0 --port $PORT.

Ajoutez vos variables d'environnement dans le dashboard Render.

🛡️ Licence
Ce projet est sous licence MIT. Libre à vous de le modifier et de l'améliorer pour votre propre usage.

Développé avec passion par [Votre Nom] - Architecte Growth Python.
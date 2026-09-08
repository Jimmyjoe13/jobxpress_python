# Registre des Agents — JobXpress

Ce document consigne l'ensemble des agents spécialisés mobilisés pour le projet JobXpress. Chaque agent possède un périmètre d'action strict, des compétences dédiées et un historique d'intervention.

---

## 1. Orchestrateur en Chef
- **Identifiant** : `antigravity_orchestrator`
- **Rôle** : Pilote de mission, architecte système et superviseur.
- **Compétences** :
  - Conception de la stratégie globale et décomposition en micro-tâches.
  - Coordination et allocation des tâches aux agents spécialisés.
  - Synthèse des livrables et contrôle qualité strict avant validation utilisateur.
  - Interfaçage avec le second cerveau SynaptiQ (`antigravity_orchestrator`).
- **Statut** : Actif (Créé le 08/09/2026).

---

## 2. Agent Spécialiste Infra & Prod VPS
- **Identifiant** : `infra_prod_auditor`
- **Rôle** : Audit et contrôle de l'infrastructure de production sur le serveur VPS.
- **Compétences** :
  - Audit du serveur VPS (51.38.99.226) et des conteneurs Docker (Web Next.js, API FastAPI, GoTrue, Postgres, Redis, Storage).
  - Contrôle du reverse proxy Caddy, certificats SSL, routes réseau et règles pare-feu (UFW).
  - Inspection des healthchecks, endpoints publics (`/health`, `/health/tasks`, etc.) et logs d'exécution.
  - Vérification de la cohérence entre l'environnement VPS et le repository local (CI/CD GitHub Actions).
- **Statut** : Actif (Créé le 08/09/2026).

---

## 3. Agent Spécialiste Architecture & Code Local
- **Identifiant** : `code_arch_auditor`
- **Rôle** : Audit statique et dynamique de la base de code locale (Backend & Frontend).
- **Compétences** :
  - Analyse du backend FastAPI (moteur de scraping reverse API, scoring DeepSeek, OCR Mistral, billing Stripe).
  - Analyse du frontend Next.js 16 (App Router, Tailwind CSS, composants UI, gestion d'état, Auth GoTrue).
  - Détection des failles de sécurité résiduelles (XSS, injections, bypass d'auth, CORS, gestion des secrets).
  - Évaluation de la robustesse (gestion des exceptions, typage TypeScript/Python, couverture de tests).
- **Statut** : Actif (Créé le 08/09/2026).

---

## 4. Agent Veille Marché & Concurrence
- **Identifiant** : `market_benchmark_analyst`
- **Rôle** : Benchmark concurrentiel et analyse des meilleures pratiques du marché SaaS Recrutement & IA.
- **Compétences** :
  - Analyse des leaders du marché (Teal HQ, Simplify Jobs, Huntr, Careerflow, LazyApply, Sonara, Final Round AI).
  - Cartographie des fonctionnalités différenciantes (Chrome extensions, auto-apply intelligent, ATS tailoring, match scoring explicable, mock interviews, job tracker Kanban).
  - Définition des attentes UX/UI standard en 2025-2026 pour les plateformes de recherche d'emploi assistées par IA.
- **Statut** : Actif (Créé le 08/09/2026).

---

## 5. Agent UX/UI & Conception Produit
- **Identifiant** : `ux_product_designer`
- **Rôle** : Audit ergonomique et proposition de refonte du parcours utilisateur et des fonctionnalités.
- **Compétences** :
  - Audit du parcours candidat (onboarding, import CV, recherche d'offres, analyse d'adéquation, génération de candidatures, suivi).
  - Identification des points de friction cognitive et des ruptures d'expérience utilisateur.
  - Structuration d'un plan d'amélioration UX actionnable (wireframing conceptuel, refonte fonctionnelle, feedback loops, engagement et rétention).
- **Statut** : Actif (Créé le 08/09/2026).

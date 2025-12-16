# 🚀 JobXpress Frontend - Interface SaaS

Interface graphique moderne pour JobXpress, remplaçant le formulaire Tally par une expérience utilisateur complète.

## ✨ Fonctionnalités

- **Landing page** attractive avec présentation du produit
- **Authentification** Supabase (inscription, connexion)
- **Dashboard** utilisateur avec statistiques
- **Formulaire multi-étapes** pour soumettre une candidature
- **Upload CV** avec drag & drop
- **Design responsive** et moderne

## 🛠️ Stack Technique

- **Next.js 14** avec App Router
- **TypeScript** pour la type-safety
- **TailwindCSS** pour le styling
- **Supabase** pour l'authentification et le stockage
- **Lucide React** pour les icônes

## 📦 Installation

```bash
# Installation des dépendances
npm install

# Configuration des variables d'environnement
# Créez un fichier .env.local avec :
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon
NEXT_PUBLIC_API_URL=https://votre-backend.onrender.com

# Lancement en développement
npm run dev
```

## 🚀 Déploiement sur Netlify

1. Connectez votre repository à Netlify
2. Configurez les variables d'environnement :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_API_URL` (URL de votre backend sur Render)
3. Le build se fait automatiquement avec `npm run build`

## 🔗 Connexion avec le Backend

Le frontend communique avec le backend FastAPI via l'endpoint `/api/v2/apply`.
Assurez-vous que CORS est configuré côté backend pour accepter les requêtes depuis votre domaine Netlify.

## 📁 Structure

```
src/
├── app/                    # App Router Next.js
│   ├── (auth)/            # Pages d'authentification
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/         # Pages protégées
│   │   ├── apply/         # Formulaire candidature
│   │   └── page.tsx       # Vue dashboard
│   ├── layout.tsx
│   └── page.tsx           # Landing page
├── components/
│   └── ui/                # Composants réutilisables
├── lib/
│   ├── api.ts             # Client API backend
│   ├── supabase/          # Clients Supabase
│   └── utils.ts
└── middleware.ts          # Protection des routes
```

## 🎨 Personnalisation

- **Couleurs** : Modifiez les variables dans `globals.css`
- **Composants** : Personnalisez dans `components/ui/`
- **Logo** : Remplacez l'icône Sparkles par votre logo

---

Développé avec ❤️ pour **JobXpress**

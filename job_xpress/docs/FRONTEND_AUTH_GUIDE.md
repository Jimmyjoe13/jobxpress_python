# Guide d'intégration Frontend - Authentification JWT

Ce document explique comment le frontend Next.js doit interagir avec les nouveaux
endpoints sécurisés de l'API JobXpress.

## Vue d'ensemble

L'API utilise désormais les JWT Supabase pour authentifier les requêtes utilisateur.
Cela permet de respecter les politiques RLS (Row Level Security) de Supabase.

## Configuration requise

### Variables d'environnement (Netlify)

```env
NEXT_PUBLIC_API_URL=https://jobxpress-python.onrender.com
NEXT_PUBLIC_SUPABASE_URL=<votre-url-supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<votre-clé-anon>
```

## Endpoints disponibles

### Endpoints publics (pas de token requis)

| Endpoint         | Méthode | Description               |
| ---------------- | ------- | ------------------------- |
| `/`              | GET     | Health check simple       |
| `/health`        | GET     | Health check détaillé     |
| `/health/tasks`  | GET     | Stats des tâches          |
| `/api/v2/apply`  | POST    | Soumettre une candidature |
| `/webhook/tally` | POST    | Webhook Tally             |

### Endpoints authentifiés (token JWT requis)

| Endpoint               | Méthode | Description                   |
| ---------------------- | ------- | ----------------------------- |
| `/api/v2/me`           | GET     | Info utilisateur authentifié  |
| `/api/v2/applications` | GET     | Candidatures de l'utilisateur |

## Comment passer le token JWT

### 1. Récupérer le token depuis Supabase Auth

```typescript
// Dans votre composant/page Next.js
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const supabase = createClientComponentClient();

// Récupérer la session
const {
  data: { session },
} = await supabase.auth.getSession();

// Le token JWT est dans session.access_token
const accessToken = session?.access_token;
```

### 2. Appeler l'API avec le token

```typescript
// Exemple: récupérer les candidatures de l'utilisateur
async function getMyApplications() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    console.error("Utilisateur non connecté");
    return null;
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v2/applications`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 401) {
      console.error("Token expiré ou invalide");
      // Rediriger vers login
    }
    throw new Error("Erreur API");
  }

  return await response.json();
}
```

### 3. Soumettre une candidature (utilisateur connecté)

```typescript
async function submitApplication(formData: ApplicationFormData) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const payload = {
    first_name: formData.firstName,
    last_name: formData.lastName,
    email: formData.email,
    phone: formData.phone,
    job_title: formData.jobTitle,
    contract_type: formData.contractType,
    work_type: formData.workType,
    experience_level: formData.experienceLevel,
    location: formData.location,
    cv_url: formData.cvUrl,
    // Si l'utilisateur est connecté, envoyer son ID
    user_id: session?.user?.id || null,
  };

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/v2/apply`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Token optionnel pour /api/v2/apply mais recommandé
        ...(session && { Authorization: `Bearer ${session.access_token}` }),
      },
      body: JSON.stringify(payload),
    }
  );

  return await response.json();
}
```

## Gestion des erreurs

### Codes HTTP

| Code | Signification                   | Action                          |
| ---- | ------------------------------- | ------------------------------- |
| 200  | Succès                          | -                               |
| 401  | Token manquant/invalide         | Rediriger vers login            |
| 403  | Token valide mais accès refusé  | Vérifier RLS                    |
| 429  | Rate limited (trop de requêtes) | Attendre `retry_after` secondes |
| 500  | Erreur serveur                  | Réessayer plus tard             |

### Exemple de gestion d'erreur

```typescript
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(session && { Authorization: `Bearer ${session.access_token}` }),
        ...options.headers,
      },
    }
  );

  if (response.status === 401) {
    // Token expiré - essayer de rafraîchir
    await supabase.auth.refreshSession();
    // Réessayer l'appel...
  }

  if (response.status === 429) {
    const data = await response.json();
    console.warn(`Rate limited. Réessayer dans ${data.retry_after} secondes`);
    throw new Error("RATE_LIMITED");
  }

  return response;
}
```

## Test manuel (curl)

```bash
# 1. Récupérer un token (depuis le frontend ou via Supabase)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6..."

# 2. Tester l'endpoint /api/v2/me
curl -X GET https://jobxpress-python.onrender.com/api/v2/me \
  -H "Authorization: Bearer $TOKEN"

# 3. Récupérer les candidatures
curl -X GET https://jobxpress-python.onrender.com/api/v2/applications \
  -H "Authorization: Bearer $TOKEN"
```

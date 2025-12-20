# Environment Variables for JobXpress Frontend

## Required Variables

### Supabase Configuration (Same project as backend)

NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon

### Backend API URL

NEXT_PUBLIC_API_URL=https://votre-backend.onrender.com

## Optional: Sentry Error Tracking

### Client-side DSN (required for Sentry)

# Get this from: https://sentry.io > Project Settings > Client Keys

NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

### For source maps upload (build-time only, optional)

# SENTRY_ORG=your-org-slug

# SENTRY_PROJECT=your-project-slug

# SENTRY_AUTH_TOKEN=your-auth-token

## Development (Local)

# NEXT_PUBLIC_API_URL=http://localhost:8000

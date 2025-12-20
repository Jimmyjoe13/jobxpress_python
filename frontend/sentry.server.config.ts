// Sentry Server-side configuration for Next.js (Node.js runtime)
// This file configures Sentry for server-side error tracking

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: 0.1,
    
    // Environment
    environment: process.env.NODE_ENV,
    
    // Debug mode for development
    debug: process.env.NODE_ENV === "development",
    
    // Limit breadcrumbs to avoid memory issues
    maxBreadcrumbs: 50,
  });
}

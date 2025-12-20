// Sentry Edge configuration for Next.js (Middleware, API Routes on Edge)
// This file configures Sentry for edge runtime functions

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance Monitoring (lighter for edge)
    tracesSampleRate: 0.05,
    
    // Environment
    environment: process.env.NODE_ENV,
    
    // Debug mode for development
    debug: process.env.NODE_ENV === "development",
  });
}

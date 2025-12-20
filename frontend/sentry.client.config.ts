// Sentry Client-side configuration for Next.js
// This file configures Sentry for error tracking in the browser
//
// HOW TO USE:
// 1. Go to https://sentry.io and create a free account
// 2. Create a new project (select "Next.js")
// 3. Copy your DSN and paste it in .env.local as NEXT_PUBLIC_SENTRY_DSN
// 4. Sentry will automatically capture errors!

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance Monitoring
    // Capture 10% of transactions for performance monitoring
    tracesSampleRate: 0.1,
    
    // Session Replay
    // Capture 1% of sessions for replay
    replaysSessionSampleRate: 0.01,
    // Capture 100% of sessions with errors for replay
    replaysOnErrorSampleRate: 1.0,
    
    // Environment
    environment: process.env.NODE_ENV,
    
    // Release version (optional, helps with source maps)
    // release: process.env.NEXT_PUBLIC_VERSION,
    
    // Debug mode for development
    debug: process.env.NODE_ENV === "development",
    
    // Filter out known non-critical errors
    beforeSend(event) {
      // Ignore ResizeObserver loop errors (common in modern browsers)
      if (event.exception?.values?.[0]?.value?.includes("ResizeObserver loop")) {
        return null;
      }
      // Ignore network errors that are expected
      if (event.exception?.values?.[0]?.type === "ChunkLoadError") {
        return null;
      }
      return event;
    },
    
    // Trace API calls to your backend (for distributed tracing)
    tracePropagationTargets: [
      "localhost",
      /^https:\/\/.*\.onrender\.com/,
    ],
    
    // Integrations
    integrations: [
      Sentry.browserTracingIntegration(),
    ],
  });
}

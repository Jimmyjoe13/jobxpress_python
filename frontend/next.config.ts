import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Required for Sentry source maps
  productionBrowserSourceMaps: true,
  
  // Empty turbopack config to acknowledge Next.js 16 default
  // Required because Sentry uses webpack config internally
  turbopack: {},
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  
  // Organization and project in Sentry
  // These can be provided via environment variables:
  // SENTRY_ORG and SENTRY_PROJECT
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // Auth token for uploading source maps
  // Set via environment variable SENTRY_AUTH_TOKEN
  authToken: process.env.SENTRY_AUTH_TOKEN,
  
  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,
  
  // Automatically tree-shake Sentry logger statements
  disableLogger: true,
  
  // Hides source maps from generated client bundles
  hideSourceMaps: true,
};

// Make sure adding Sentry options is the last code to run before exporting
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
const config = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;

export default config;


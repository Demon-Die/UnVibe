import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN_WEB,
  tracesSampleRate: 1.0,
  debug: false,
});

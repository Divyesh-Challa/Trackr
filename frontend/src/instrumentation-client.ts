import * as Sentry from "@sentry/nextjs";

// Off until NEXT_PUBLIC_SENTRY_DSN is set.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  // Don't collect user details, cookies, headers or request bodies (see /privacy).
  dataCollection: { userInfo: false, cookies: false, httpHeaders: false, httpBodies: [] },
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

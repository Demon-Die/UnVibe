import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

const isMockSentry = !process.env.SENTRY_DSN_WEB || process.env.SENTRY_DSN_WEB.includes("example");

export default withSentryConfig(
  nextConfig,
  {
    silent: true,
    org: "unvibe",
    project: "web",
  },
  {
    widenClientSandbox: true,
    tunnelRoute: "/monitoring",
    hideSourceMaps: true,
    disableLogger: true,
    disableServerWebpackPlugin: isMockSentry,
    disableClientWebpackPlugin: isMockSentry,
  }
);

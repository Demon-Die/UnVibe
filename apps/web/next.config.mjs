import dotenv from "dotenv";
import { withSentryConfig } from "@sentry/nextjs";

// Load env vars from the root .env.local so both API and web read from the same file
dotenv.config({ path: "../../.env.local" });

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

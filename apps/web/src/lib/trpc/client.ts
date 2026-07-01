import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@unvibe/api";

/**
 * tRPC client for the UnVibe API.
 *
 * Infers the full router type from the API package via the @unvibe/api
 * tsconfig path alias. As the API router grows in Phase 2/3, the client
 * automatically gains access to new procedures with full type safety.
 *
 * Usage in client components:
 *   import { trpc } from "@/lib/trpc/client";
 *   const { data } = trpc.health.useQuery();
 */
export const trpc = createTRPCReact<AppRouter>();

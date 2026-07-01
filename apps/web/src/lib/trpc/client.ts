import { createTRPCReact } from "@trpc/react-query";

/**
 * tRPC client for the UnVibe API.
 *
 * The AppRouter type is defined locally as a placeholder. Once the API
 * routers are fully built in Phase 2, this will be replaced with the
 * shared AppRouter type import from @unvibe/types or a direct reference
 * to apps/api/src/index.ts (e.g. via a tsconfig path alias).
 *
 * Usage in client components:
 *   import { trpc } from "@/lib/trpc/client";
 *   const { data } = trpc.health.useQuery();
 */
export interface AppRouter {
  health: {
    query: () => { status: string; timestamp: Date };
  };
  // More routers added as they're built in Phase 2/3
}

export const trpc = createTRPCReact<AppRouter>();

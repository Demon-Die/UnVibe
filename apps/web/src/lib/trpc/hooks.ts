"use client";

import { trpc } from "./client";

/**
 * tRPC-powered query hooks that parallel the mock-data hooks.
 *
 * These are placeholder implementations that will be replaced with real
 * router calls once the API routers are built in Phase 2b.
 *
 * Usage in Phase 3 (frontend swap):
 *   import { useDashboardData } from "@/lib/trpc/hooks";
 *   // replaces: import { useDashboardQuery } from "@/lib/mock-data/hooks";
 */

export function useDashboardData() {
  return trpc.health.useQuery();
}

export function useTracksData() {
  // Placeholder — returns empty until tracks router is built
  return trpc.health.useQuery();
}

export function useModuleData(_trackId: string, _moduleId: string) {
  // Placeholder — returns empty until modules router is built
  return trpc.health.useQuery();
}

export function useWarRoomData() {
  // Placeholder — returns empty until war-room router is built
  return trpc.health.useQuery();
}

export function useProfileData() {
  // Placeholder — returns empty until profile router is built
  return trpc.health.useQuery();
}

export function useBlindspotsData() {
  // Placeholder — returns empty until blindspots router is built
  return trpc.health.useQuery();
}

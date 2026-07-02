"use client";

import { trpc } from "./client";

/**
 * tRPC-powered query hooks that parallel the original mock-data hooks.
 */

export function useDashboardData() {
  return trpc.health.useQuery();
}

export function useTracksData() {
  // Placeholder — returns empty until tracks router is built
  return trpc.health.useQuery();
}

export function useModuleData(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _trackId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _moduleId: string,
) {
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

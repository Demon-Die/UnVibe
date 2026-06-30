"use client";

import { useQuery } from "@tanstack/react-query";
import { getBlindspots, getDashboard, getModule, getProfile, getTracks, getWarRoom } from "./api";

export function useDashboardQuery() {
  return useQuery({ queryKey: ["dashboard"], queryFn: getDashboard });
}

export function useTracksQuery() {
  return useQuery({ queryKey: ["tracks"], queryFn: getTracks });
}

export function useModuleQuery(trackId: string, moduleId: string) {
  return useQuery({ queryKey: ["module", trackId, moduleId], queryFn: () => getModule(trackId, moduleId) });
}

export function useWarRoomQuery() {
  return useQuery({ queryKey: ["war-room"], queryFn: getWarRoom });
}

export function useProfileQuery() {
  return useQuery({ queryKey: ["profile"], queryFn: getProfile });
}

export function useBlindspotsQuery() {
  return useQuery({ queryKey: ["blindspots"], queryFn: getBlindspots });
}

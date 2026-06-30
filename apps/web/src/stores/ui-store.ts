"use client";

import { create } from "zustand";

interface UIStore {
  darkMode: boolean;
  sidebarOpen: boolean;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
}

function getInitialDarkMode(): boolean {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("unvibe-theme");
    if (stored !== null) return stored === "dark";
  }
  return true;
}

export const useUIStore = create<UIStore>((set) => ({
  darkMode: getInitialDarkMode(),
  sidebarOpen: false,
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      if (typeof window !== "undefined") {
        localStorage.setItem("unvibe-theme", next ? "dark" : "light");
      }
      return { darkMode: next };
    }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));

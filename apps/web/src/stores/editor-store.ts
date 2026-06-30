"use client";

import { create } from "zustand";
import type { ModulePhase } from "@/lib/mock-data/types";

interface EditorStore {
  phase: ModulePhase;
  code: string;
  language: string;
  isDirty: boolean;
  setPhase: (phase: ModulePhase) => void;
  setCode: (code: string) => void;
  resetCode: (code: string) => void;
  setLanguage: (language: string) => void;
}

export const useEditorStore = create<EditorStore>((set) => ({
  phase: "decode",
  code: "",
  language: "typescript",
  isDirty: false,
  setPhase: (phase) => set({ phase }),
  setCode: (code) => set({ code, isDirty: true }),
  resetCode: (code) => set({ code, isDirty: false }),
  setLanguage: (language) => set({ language }),
}));

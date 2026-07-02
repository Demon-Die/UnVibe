"use client";

import { create } from "zustand";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<boolean>;
  signUp: (name: string, email: string) => Promise<boolean>;
  signOut: () => void;
  checkSession: () => Promise<void>;
  restoreSession: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: true,

  restoreSession: () => {
    try {
      const stored = localStorage.getItem("unvibe_session");
      if (stored) {
        set({ user: JSON.parse(stored), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  checkSession: async () => {
    try {
      const res = await fetch(`${API_URL}/trpc/auth.getSession`, {
        credentials: "include",
      });
      const json = await res.json();
      if (json?.result?.data?.user) {
        set({ user: json.result.data.user });
        localStorage.setItem("unvibe_session", JSON.stringify(json.result.data.user));
      } else {
        set({ user: null });
        localStorage.removeItem("unvibe_session");
      }
    } catch {
      set({ user: null });
    }
  },

  signIn: async (email: string) => {
    try {
      const res = await fetch(
        `${API_URL}/trpc/auth.signIn?input=${encodeURIComponent(JSON.stringify({ email }))}`,
        { credentials: "include" },
      );
      const json = await res.json();
      if (json?.result?.data?.user) {
        set({ user: json.result.data.user });
        localStorage.setItem("unvibe_session", JSON.stringify(json.result.data.user));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  signUp: async (name: string, email: string) => {
    try {
      const res = await fetch(`${API_URL}/trpc/auth.signUp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          input: { name, email },
        }),
      });
      const json = await res.json();
      if (json?.result?.data?.user) {
        set({ user: json.result.data.user });
        localStorage.setItem("unvibe_session", JSON.stringify(json.result.data.user));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  signOut: async () => {
    try {
      await fetch(`${API_URL}/trpc/auth.signOut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch {
      // Graceful — always clear local state
    }
    set({ user: null });
    localStorage.removeItem("unvibe_session");
  },
}));

"use client";

import { create } from "zustand";

interface SessionData {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  sessionToken: string | null;
}

interface AuthStore {
  user: SessionData | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<boolean>;
  signUp: (name: string, email: string) => Promise<boolean>;
  signOut: () => void;
  checkSession: () => Promise<void>;
  restoreSession: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const useAuthStore = create<AuthStore>((set) => ({
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
      const stored = localStorage.getItem("unvibe_session");
      const token = stored ? JSON.parse(stored)?.sessionToken : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_URL}/trpc/auth.getSession`, { headers });
      const json = await res.json();
      if (json?.result?.data?.user) {
        const userData = { ...json.result.data.user, sessionToken: token };
        set({ user: userData });
        localStorage.setItem("unvibe_session", JSON.stringify(userData));
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
      const res = await fetch(`${API_URL}/trpc/auth.signIn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { email } }),
      });
      const json = await res.json();
      if (json?.result?.data?.user && json?.result?.data?.sessionToken) {
        const sessionData = {
          id: json.result.data.user.id,
          name: json.result.data.user.name,
          email: json.result.data.user.email,
          image: json.result.data.user.image ?? null,
          sessionToken: json.result.data.sessionToken,
        };
        set({ user: sessionData });
        localStorage.setItem("unvibe_session", JSON.stringify(sessionData));
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
        body: JSON.stringify({ input: { name, email } }),
      });
      const json = await res.json();
      if (json?.result?.data?.user && json?.result?.data?.sessionToken) {
        const sessionData = {
          id: json.result.data.user.id,
          name: json.result.data.user.name,
          email: json.result.data.user.email,
          image: json.result.data.user.image ?? null,
          sessionToken: json.result.data.sessionToken,
        };
        set({ user: sessionData });
        localStorage.setItem("unvibe_session", JSON.stringify(sessionData));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  signOut: async () => {
    try {
      const stored = localStorage.getItem("unvibe_session");
      const token = stored ? JSON.parse(stored)?.sessionToken : null;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch(`${API_URL}/trpc/auth.signOut`, {
        method: "POST",
        headers,
      });
    } catch {
      // Graceful — always clear local state
    }
    set({ user: null });
    localStorage.removeItem("unvibe_session");
  },
}));

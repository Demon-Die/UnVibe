"use client";

import { create } from "zustand";

interface MockUser {
  name: string;
  email: string;
  image?: string;
}

interface AuthStore {
  user: MockUser | null;
  signIn: () => void;
  signOut: () => void;
}

const defaultUser: MockUser = {
  name: "Sourabh Patne",
  email: "sourabh@unvibe.dev",
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: defaultUser,
  signIn: () => set({ user: defaultUser }),
  signOut: () => set({ user: null }),
}));

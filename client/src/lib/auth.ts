import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "admin" | "operator";

export interface User {
  id: string;
  username: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,

      login: async (username, password) => {
        set({ isLoading: true });
        try {
          const res = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
            credentials: "include",
          });
          if (!res.ok) {
            set({ isLoading: false });
            return false;
          }
          const user = await res.json();
          set({ user, isLoading: false });
          return true;
        } catch {
          set({ isLoading: false });
          return false;
        }
      },

      logout: async () => {
        await fetch("/api/logout", { method: "POST", credentials: "include" });
        set({ user: null });
      },

      checkSession: async () => {
        try {
          const res = await fetch("/api/me", { credentials: "include" });
          if (res.ok) {
            const user = await res.json();
            set({ user });
          } else {
            set({ user: null });
          }
        } catch {
          set({ user: null });
        }
      },
    }),
    { name: "eea-auth-v2" }
  )
);

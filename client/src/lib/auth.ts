import { create } from "zustand";

export type Role = "admin" | "operator";

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  isLoading: true,

  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),

  logout: async () => {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
    set({ user: null });
  },
}));

export async function checkSession(): Promise<void> {
  const { setUser } = useAuth.getState();
  try {
    const res = await fetch("/api/me", { credentials: "include" });
    if (res.ok) {
      const user = await res.json();
      setUser(user);
    } else {
      setUser(null);
    }
  } catch {
    setUser(null);
  }
}

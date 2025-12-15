import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'admin' | 'operator';

export interface User {
  username: string;
  role: Role;
  name: string;
}

interface AuthState {
  user: User | null;
  login: (username: string, role: Role) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      login: (username, role) => set({ 
        user: { 
          username, 
          role, 
          name: role === 'admin' ? 'Administrador' : 'Operador' 
        } 
      }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);

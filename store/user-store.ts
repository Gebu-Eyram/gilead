import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/utils/types";

interface UserStore {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: UserRole | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  role: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  setRole: (role) => set({ role }),
  setLoading: (loading) => set({ loading }),
}));

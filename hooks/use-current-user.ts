import { useQuery } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import type { UserRole } from "@/utils/types";

export interface CurrentUser {
  user: User | null;
  role: UserRole | null;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ["currentUser"],
    queryFn: async (): Promise<CurrentUser> => {
      const { supabase } = await import("@/utils/supabase");
      const { data } = await supabase.auth.getUser();

      return {
        user: data.user ?? null,
        role: (data.user?.user_metadata?.role as UserRole) ?? null,
      };
    },
    staleTime: Infinity,
  });
}

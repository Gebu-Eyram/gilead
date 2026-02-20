"use client";

import { useEffect } from "react";
import { supabase } from "@/utils/supabase";
import { useUserStore } from "@/store/user-store";
import { useTeamStore } from "@/store/team-store";
import type { UserRole } from "@/utils/types";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useUserStore((s) => s.setUser);
  const setRole = useUserStore((s) => s.setRole);
  const setTeam = useTeamStore((s) => s.setTeam);

  useEffect(() => {
    // Hydrate on mount
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      const role = (data.user?.user_metadata?.role as UserRole) ?? null;
      setRole(role);

      // Set current team based on user role
      if (role === "admin") {
        const companyId = data.user?.user_metadata?.company_id as string;
        setTeam(data.user?.user_metadata?.company_name as string, companyId);
      } else if (role === "superadmin") {
        setTeam("Gilead", "gilead");
      } else {
        setTeam(null, null);
      }
    });

    // Keep in sync with auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      const role = (session?.user?.user_metadata?.role as UserRole) ?? null;
      setRole(role);

      // Set current team based on user role
      if (role === "admin") {
        const companyId = session?.user?.user_metadata?.company_id as string;
        setTeam(
          session?.user?.user_metadata?.company_name as string,
          companyId,
        );
      } else if (role === "superadmin") {
        setTeam("Gilead", "gilead");
      } else {
        setTeam(null, null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setRole, setTeam]);

  return <>{children}</>;
}

"use client";

import * as React from "react";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useTeamStore } from "@/store/team-store";

interface UserMembership {
  id: string;
  company_id: string;
  role: string;
  company: {
    id: string;
    name: string;
  };
}

interface UserWithMemberships {
  id: string;
  name: string;
  role: string;
  company_memberships: UserMembership[];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: currentUserData } = useCurrentUser();
  const setTeam = useTeamStore((s) => s.setTeam);
  const currentTeam = useTeamStore((s) => s.currentTeam);

  const { data: membershipData } = useQuery<UserWithMemberships>({
    queryKey: ["memberships"],
    queryFn: () => fetch("/api/users/memberships").then((r) => r.json()),
    staleTime: 1000 * 60 * 5,
  });

  const teams = React.useMemo(() => {
    if (!membershipData) return [];
    const builtTeams: Array<{
      name: string;
      logo: typeof Building2;
      plan: string;
      companyId: string;
      role: string;
    }> = [];

    if (membershipData.role === "superadmin") {
      builtTeams.push({
        name: "Gilead Consult",
        logo: Building2,
        plan: "superadmin",
        companyId: "gilead",
        role: "superadmin",
      });
    }

    if (membershipData.company_memberships?.length > 0) {
      membershipData.company_memberships.forEach((membership) => {
        builtTeams.push({
          name: membership.company.name,
          logo: Building2,
          plan: membership.role,
          companyId: membership.company_id,
          role: membership.role,
        });
      });
    }

    return builtTeams;
  }, [membershipData]);

  useEffect(() => {
    if (!membershipData || currentTeam) return;

    if (membershipData.role === "superadmin") {
      setTeam("Gilead Consult", "gilead", "superadmin");
    } else if (
      membershipData.role === "admin" &&
      membershipData.company_memberships?.length > 0
    ) {
      const first = membershipData.company_memberships[0];
      setTeam(first.company.name, first.company_id, "admin");
    } else if (membershipData.role === "applicant") {
      setTeam("Personal", "personal", "applicant");
    }
  }, [membershipData, currentTeam, setTeam]);

  return (
    <Sidebar collapsible="icon" {...props}>
      {teams.length > 0 && (
        <SidebarHeader>
          <TeamSwitcher teams={teams} />
        </SidebarHeader>
      )}
      <SidebarContent>
        <NavMain />
        <NavProjects />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

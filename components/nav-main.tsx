"use client";

import {
  Briefcase,
  Compass,
  FileText,
  GalleryVerticalEnd,
  Home,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";
import { useTeamStore } from "@/store/team-store";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

export function NavMain() {
  const currentRole = useTeamStore((state) => state.currentRole);
  const currentTeam = useTeamStore((state) => state.currentTeam);

  const items = useMemo(() => {
    const baseNav: NavItem[] = [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Home,
      },
    ];

    switch (currentRole) {
      case "superadmin":
        return [
          ...baseNav,
          {
            title: "Jobs",
            url: "/superadmin/jobs",
            icon: Briefcase,
          },
          {
            title: "Applications",
            url: "/superadmin/applications",
            icon: FileText,
          },
          {
            title: "Companies",
            url: "/companies",
            icon: GalleryVerticalEnd,
          },
        ];
      case "admin":
        return [
          ...baseNav,
          {
            title: "Jobs",
            url: "/admin/jobs",
            icon: Briefcase,
          },
          {
            title: "Applications",
            url: "/admin/applications",
            icon: FileText,
          },
        ];
      case "applicant":
        return [
          ...baseNav,
          {
            title: "Explore",
            url: "/explore",
            icon: Compass,
          },
        ];
      default:
        return baseNav;
    }
  }, [currentRole]);

  return (
    <SidebarGroup key={currentRole}>
      <SidebarGroupLabel>Navigation</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton asChild tooltip={item.title}>
              <a href={item.url}>
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

"use client";

import {
  Briefcase,
  FileText,
  Folder,
  Forward,
  GalleryVerticalEnd,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useTeamStore } from "@/store/team-store";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { Company } from "@/utils/types";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavProjects() {
  const { isMobile } = useSidebar();
  const { data: currentUserData } = useCurrentUser();
  const role = currentUserData?.role;

  const { data: companies = [], isLoading: loadingCompanies } = useQuery<
    Company[]
  >({
    queryKey: ["companies"],
    queryFn: () => fetch("/api/companies").then((r) => r.json()),
    enabled: role === "superadmin",
    staleTime: 1000 * 60 * 5,
  });

  const { data: jobs = [], isLoading: loadingJobs } = useQuery<any[]>({
    queryKey: ["jobs"],
    queryFn: () => fetch("/api/jobs").then((r) => r.json()),
    enabled: role === "admin",
    staleTime: 1000 * 60 * 5,
  });

  const { data: applications = [], isLoading: loadingApps } = useQuery<any[]>({
    queryKey: ["applications"],
    queryFn: () => fetch("/api/applications").then((r) => r.json()),
    enabled: role === "applicant",
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = loadingCompanies || loadingJobs || loadingApps;

  const { label, projects } = (() => {
    if (role === "superadmin") {
      return {
        label: "Companies",
        projects: companies.map((c) => ({
          name: c.name,
          url: `/companies/${c.id}`,
          icon: GalleryVerticalEnd,
        })),
      };
    }
    if (role === "admin") {
      return {
        label: "Jobs",
        projects: jobs.slice(0, 5).map((j) => ({
          name: j.title,
          url: `/admin/jobs/${j.id}`,
          icon: Briefcase,
        })),
      };
    }
    if (role === "applicant") {
      return {
        label: "Applications",
        projects: applications.slice(0, 5).map((a) => ({
          name: a.job?.title || "Application",
          url: `/applications/${a.id}`,
          icon: FileText,
        })),
      };
    }
    return { label: "Projects", projects: [] };
  })();

  if (isLoading) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarMenu>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-muted rounded animate-pulse my-1" />
          ))}
        </SidebarMenu>
      </SidebarGroup>
    );
  }

  if (!projects.length) {
    return (
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <div className="text-xs text-muted-foreground px-2 py-2">
          No {label.toLowerCase()} found
        </div>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {projects.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <a href={item.url}>
                <item.icon />
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover>
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem>
                  <Folder className="text-muted-foreground" />
                  <span>View</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Forward className="text-muted-foreground" />
                  <span>Share</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Trash2 className="text-muted-foreground" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton className="text-sidebar-foreground/70">
            <MoreHorizontal className="text-sidebar-foreground/70" />
            <span>More</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
}

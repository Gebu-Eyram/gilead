import React from "react";
import { redirect } from "next/navigation";
import { createClientForServer } from "@/utils/supabase-server";
import { AppSidebar } from "@/components/app-sidebar";
import SiteHeader from "@/components/siteheader";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function Page({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClientForServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/signin");
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <SiteHeader />
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

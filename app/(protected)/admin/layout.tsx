import React from "react";
import { redirect } from "next/navigation";
import { createClientForServer } from "@/utils/supabase-server";

export default async function AdminLayout({
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

  return <>{children}</>;
}

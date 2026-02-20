import { createClientForServer } from "@/utils/supabase-server";
import { NextResponse } from "next/server";

// GET /api/users/memberships - get current user's company memberships
export async function GET() {
  const supabase = await createClientForServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .select(
      `
      id,
      name,
      role,
      email,
      company_members (
        id,
        company_id,
        role,
        company:companies(id, name)
      )
    `,
    )
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Error fetching user memberships:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

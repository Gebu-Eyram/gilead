import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { UpdateUserInput } from "@/utils/types";

// GET /api/users - list all users
export async function GET() {
  const { data, error } = await supabase.from("users").select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// PATCH /api/users - update the current authenticated user
export async function PATCH(request: NextRequest) {
  const body: UpdateUserInput = await request.json();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("users")
    .update(body)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

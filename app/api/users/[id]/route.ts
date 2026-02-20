import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { UpdateUserInput } from "@/utils/types";

type Params = { params: Promise<{ id: string }> };

// GET /api/users/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("users")
    .select("*, company_memberships:company_members(*, company:companies(*))")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/users/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body: UpdateUserInput = await request.json();

  const { data, error } = await supabase
    .from("users")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/users/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const { error } = await supabase.from("users").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

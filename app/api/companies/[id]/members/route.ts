import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// GET /api/companies/[id]/members - list all members of a company
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("company_members")
    .select("*, user:users(*)")
    .eq("company_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/companies/[id]/members - add a member to a company
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("company_members")
    .insert({ ...body, company_id: id })
    .select("*, user:users(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

// DELETE /api/companies/[id]/members - remove a member (by user_id in body)
export async function DELETE(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user_id } = await request.json();

  const { error } = await supabase
    .from("company_members")
    .delete()
    .eq("company_id", id)
    .eq("user_id", user_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

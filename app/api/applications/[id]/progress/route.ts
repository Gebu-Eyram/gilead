import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

// GET /api/applications/[id]/progress - list all progress records for an application
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("application_progress")
    .select("*, recruitment_step:recruitment_steps(*)")
    .eq("application_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/applications/[id]/progress - create a progress record for an application step
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("application_progress")
    .insert({ ...body, application_id: id })
    .select("*, recruitment_step:recruitment_steps(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

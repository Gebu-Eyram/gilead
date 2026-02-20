import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { UpdateApplicationProgressInput } from "@/utils/types";

type Params = { params: Promise<{ id: string; progressId: string }> };

// GET /api/applications/[id]/progress/[progressId]
export async function GET(_request: NextRequest, { params }: Params) {
  const { progressId } = await params;

  const { data, error } = await supabase
    .from("application_progress")
    .select("*, recruitment_step:recruitment_steps(*)")
    .eq("id", progressId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/applications/[id]/progress/[progressId]
export async function PATCH(request: NextRequest, { params }: Params) {
  const { progressId } = await params;
  const body: UpdateApplicationProgressInput = await request.json();

  const { data, error } = await supabase
    .from("application_progress")
    .update(body)
    .eq("id", progressId)
    .select("*, recruitment_step:recruitment_steps(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/applications/[id]/progress/[progressId]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { progressId } = await params;

  const { error } = await supabase
    .from("application_progress")
    .delete()
    .eq("id", progressId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

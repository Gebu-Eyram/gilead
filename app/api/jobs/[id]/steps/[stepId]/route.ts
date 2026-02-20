import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string; stepId: string }> };

// GET /api/jobs/[id]/steps/[stepId]
export async function GET(_request: NextRequest, { params }: Params) {
  const { stepId } = await params;

  const { data, error } = await supabase
    .from("recruitment_steps")
    .select("*")
    .eq("id", stepId)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/jobs/[id]/steps/[stepId]
export async function PATCH(request: NextRequest, { params }: Params) {
  const { stepId } = await params;
  const body = await request.json();

  const { data, error } = await supabase
    .from("recruitment_steps")
    .update(body)
    .eq("id", stepId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/jobs/[id]/steps/[stepId]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { stepId } = await params;

  const { error } = await supabase
    .from("recruitment_steps")
    .delete()
    .eq("id", stepId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

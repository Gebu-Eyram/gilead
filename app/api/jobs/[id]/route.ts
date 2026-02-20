import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { UpdateJobInput } from "@/utils/types";

type Params = { params: Promise<{ id: string }> };

// GET /api/jobs/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "*, company:companies(*), recruitment_steps(*), applications(*, applicant:users(*), progress:application_progress(*, recruitment_step:recruitment_steps(*)))",
    )
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

// PATCH /api/jobs/[id]
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body: UpdateJobInput = await request.json();

  const { data, error } = await supabase
    .from("jobs")
    .update(body)
    .eq("id", id)
    .select("*, company:companies(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/jobs/[id]
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const { error } = await supabase.from("jobs").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

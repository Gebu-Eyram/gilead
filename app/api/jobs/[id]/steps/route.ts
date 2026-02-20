import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { CreateRecruitmentStepInput } from "@/utils/types";

type Params = { params: Promise<{ id: string }> };

// GET /api/jobs/[id]/steps - list all recruitment steps for a job
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const { data, error } = await supabase
    .from("recruitment_steps")
    .select("*")
    .eq("job_id", id)
    .order("step_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/jobs/[id]/steps - create a recruitment step
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body: Omit<CreateRecruitmentStepInput, "job_id"> = await request.json();

  const { data, error } = await supabase
    .from("recruitment_steps")
    .insert({
      ...body,
      job_id: id,
      release_results: body.release_results ?? false,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating recruitment step:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

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
  const { id, stepId } = await params;

  // Check if there are any application progress records for this step
  const { data: progressData, error: countError } = await supabase
    .from("application_progress")
    .select("id", { count: "exact", head: true })
    .eq("step_id", stepId);

  if (countError) {
    return NextResponse.json(
      { error: "Failed to check step usage" },
      { status: 500 }
    );
  }

  // If there are application progress records, don't allow deletion
  if (progressData && progressData.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete step that has been used by applicants" },
      { status: 400 }
    );
  }

  // Delete the recruitment step
  const { error } = await supabase
    .from("recruitment_steps")
    .delete()
    .eq("id", stepId)
    .eq("job_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

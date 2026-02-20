import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { CreateApplicationInput } from "@/utils/types";

// GET /api/applications - list applications
// Query params: ?job_id=xxx&user_id=xxx&status=pending
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const job_id = searchParams.get("job_id");
  const user_id = searchParams.get("user_id");
  const status = searchParams.get("status");

  let query = supabase.from("applications").select(
    `*,
     job:jobs(*, company:companies(*)),
     applicant:users(*),
     progress:application_progress(*, recruitment_step:recruitment_steps(*))`
  );

  if (job_id) query = query.eq("job_id", job_id);
  if (user_id) query = query.eq("user_id", user_id);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/applications - create an application
export async function POST(request: NextRequest) {
  const body: CreateApplicationInput = await request.json();

  const { data, error } = await supabase
    .from("applications")
    .insert(body)
    .select(
      "*, job:jobs(*, company:companies(*)), applicant:users(*)"
    )
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

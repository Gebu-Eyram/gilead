import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { CreateJobInput } from "@/utils/types";

// GET /api/jobs - list all jobs
// Query params: ?company_id=xxx&status=open&type=full-time
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const company_id = searchParams.get("company_id");
  const status = searchParams.get("status");
  const type = searchParams.get("type");

  let query = supabase
    .from("jobs")
    .select("*, company:companies(*), recruitment_steps(*)");

  if (company_id) query = query.eq("company_id", company_id);
  if (status) query = query.eq("status", status);
  if (type) query = query.eq("type", type);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/jobs - create a job
export async function POST(request: NextRequest) {
  const body: CreateJobInput = await request.json();

  const { data, error } = await supabase
    .from("jobs")
    .insert(body)
    .select("*, company:companies(*)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

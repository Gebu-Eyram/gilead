import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { CreateCompanyInput } from "@/utils/types";

// GET /api/companies - list all companies
export async function GET() {
  const { data, error } = await supabase.from("companies").select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST /api/companies - create a company
export async function POST(request: NextRequest) {
  const body: CreateCompanyInput = await request.json();

  const { data, error } = await supabase
    .from("companies")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

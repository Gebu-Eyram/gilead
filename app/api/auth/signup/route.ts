import { supabase } from "@/utils/supabase";
import { NextRequest, NextResponse } from "next/server";
import type { SignUpInput } from "@/utils/types";

// POST /api/auth/signup
export async function POST(request: NextRequest) {
  const body: SignUpInput = await request.json();
  const { email, password, full_name, role = "applicant", linkedin_url } = body;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        role,
        linkedin_url: linkedin_url ?? null,
      },
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user }, { status: 201 });
}

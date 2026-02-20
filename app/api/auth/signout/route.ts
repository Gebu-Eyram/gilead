import { supabase } from "@/utils/supabase";
import { NextResponse } from "next/server";

// POST /api/auth/signout
export async function POST() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

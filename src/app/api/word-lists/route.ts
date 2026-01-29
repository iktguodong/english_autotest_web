import { NextResponse } from "next/server";

import { supabase } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { data, error } = await supabase
    .from("word_lists")
    .select("id, title, source_type, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load lists" }, { status: 500 });
  }

  return NextResponse.json({ lists: data ?? [] });
}

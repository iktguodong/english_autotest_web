import { NextResponse } from "next/server";

import { supabase } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { data, error } = await supabase
    .from("test_sessions")
    .select("id, mode, accuracy, finished_at")
    .eq("user_id", user.id)
    .eq("status", "finished")
    .order("finished_at", { ascending: false })
    .limit(12);

  if (error) {
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

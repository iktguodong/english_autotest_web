import { NextResponse } from "next/server";

import { supabase } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";

export async function GET() {
  const { user, response } = await requireUser();
  if (!user) return response;

  const { data: session, error } = await supabase
    .from("test_sessions")
    .select("id, mode, status, order_ids, current_index, correct_ids, incorrect_ids, word_list_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ session: null });
  }

  const { data: words, error: wordError } = await supabase
    .from("words")
    .select("id, word, meaning")
    .in("id", session.order_ids);

  if (wordError) {
    return NextResponse.json({ error: "Failed to load words" }, { status: 500 });
  }

  const wordMap = new Map((words ?? []).map((word) => [word.id, word]));
  const orderedWords = session.order_ids.map((id) => wordMap.get(id)).filter(Boolean);

  return NextResponse.json({ session, words: orderedWords });
}

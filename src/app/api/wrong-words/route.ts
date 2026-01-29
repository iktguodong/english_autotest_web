import { NextResponse } from "next/server";

import { supabase } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const url = new URL(request.url);
  const listId = url.searchParams.get("listId");
  const scope = url.searchParams.get("scope");

  let query = supabase
    .from("wrong_words")
    .select("word_id, wrong_count, last_wrong_at, word_list_id, words(word, meaning)")
    .eq("user_id", user.id);

  if (listId) {
    query = query.eq("word_list_id", listId);
  } else if (scope === "global") {
    query = query.is("word_list_id", null);
  }

  const { data, error } = await query.order("wrong_count", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load wrong words" }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}

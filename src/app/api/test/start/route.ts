import { NextResponse } from "next/server";

import { supabase } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { testStartSchema } from "@/lib/validation";

export const runtime = "nodejs";

const shuffleArray = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const parsed = testStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { listId, mode, shuffle, wrongOnly } = parsed.data;

  let words: Array<{ id: string; word: string; meaning: string }> = [];
  let wordListId: string | null = listId;

  if (wrongOnly) {
    if (listId) {
      const { data: list, error: listError } = await supabase
        .from("word_lists")
        .select("id")
        .eq("id", listId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (listError || !list) {
        return NextResponse.json({ error: "List not found" }, { status: 404 });
      }

      const { data, error } = await supabase
        .from("wrong_words")
        .select("word_id, words(id, word, meaning)")
        .eq("user_id", user.id)
        .eq("word_list_id", listId);

      if (error) {
        return NextResponse.json({ error: "Failed to load wrong words" }, { status: 500 });
      }

      words =
        data
          ?.map((row) => row.words)
          .filter((row): row is { id: string; word: string; meaning: string } => Boolean(row)) ?? [];

      wordListId = listId;
    } else {
      const { data, error } = await supabase
        .from("wrong_words")
        .select("word_id, words(id, word, meaning)")
        .eq("user_id", user.id)
        .is("word_list_id", null);

      if (error) {
        return NextResponse.json({ error: "Failed to load wrong words" }, { status: 500 });
      }

      words =
        data
          ?.map((row) => row.words)
          .filter((row): row is { id: string; word: string; meaning: string } => Boolean(row)) ?? [];

      wordListId = null;
    }
  } else if (listId) {
    const { data: list, error: listError } = await supabase
      .from("word_lists")
      .select("id")
      .eq("id", listId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (listError || !list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("words")
      .select("id, word, meaning")
      .eq("word_list_id", listId);

    if (error) {
      return NextResponse.json({ error: "Failed to load words" }, { status: 500 });
    }

    words = data ?? [];
  } else {
    return NextResponse.json({ error: "List required" }, { status: 400 });
  }

  if (words.length === 0) {
    return NextResponse.json({ error: "No words available" }, { status: 400 });
  }

  const ordered = shuffle ? shuffleArray(words) : words;
  const orderIds = ordered.map((word) => word.id);

  const { data: session, error: sessionError } = await supabase
    .from("test_sessions")
    .insert({
      user_id: user.id,
      word_list_id: wordListId,
      mode,
      status: "active",
      order_ids: orderIds,
    })
    .select("id, mode, status, order_ids, current_index, correct_ids, incorrect_ids")
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Failed to start test" }, { status: 500 });
  }

  return NextResponse.json({ session, words: ordered });
}

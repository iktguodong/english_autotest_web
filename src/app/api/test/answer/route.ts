import { NextResponse } from "next/server";

import { supabase } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";
import { testUpdateSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const parsed = testUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { sessionId, wordId, correct, currentIndex, correctIds, incorrectIds } = parsed.data;

  const { data: session, error: sessionError } = await supabase
    .from("test_sessions")
    .select("id, user_id, status, word_list_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (sessionError || !session || session.user_id !== user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "active") {
    return NextResponse.json({ error: "Session is not active" }, { status: 400 });
  }

  await supabase.from("test_answers").insert({
    test_session_id: sessionId,
    word_id: wordId,
    correct,
  });

  if (!correct) {
    const touchWrong = async (wordListId: string | null) => {
      const { data: existing } = await supabase
        .from("wrong_words")
        .select("wrong_count")
        .eq("user_id", user.id)
        .eq("word_id", wordId)
        .eq("word_list_id", wordListId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("wrong_words")
          .update({
            wrong_count: existing.wrong_count + 1,
            last_wrong_at: new Date().toISOString(),
          })
          .eq("user_id", user.id)
          .eq("word_id", wordId)
          .eq("word_list_id", wordListId);
      } else {
        await supabase.from("wrong_words").insert({
          user_id: user.id,
          word_id: wordId,
          word_list_id: wordListId,
          wrong_count: 1,
          last_wrong_at: new Date().toISOString(),
        });
      }
    };

    await touchWrong(session.word_list_id ?? null);
    await touchWrong(null);
  }

  const { error: updateError } = await supabase
    .from("test_sessions")
    .update({
      current_index: currentIndex,
      correct_ids: correctIds,
      incorrect_ids: incorrectIds,
    })
    .eq("id", sessionId);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

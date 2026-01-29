import { NextResponse } from "next/server";

import { normalizeFromText } from "@/lib/dashscope";
import { supabase } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const text = body?.text?.toString().trim();
  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  const entries = await normalizeFromText(text);
  if (entries.length === 0) {
    return NextResponse.json({ error: "No words found" }, { status: 400 });
  }

  const title = `手动输入 ${new Date().toLocaleString("zh-CN")}`;

  const { data: list, error: listError } = await supabase
    .from("word_lists")
    .insert({
      user_id: user.id,
      title,
      source_type: "text",
    })
    .select("id, title")
    .single();

  if (listError || !list) {
    return NextResponse.json({ error: "Failed to create list" }, { status: 500 });
  }

  const { error: wordError } = await supabase.from("words").insert(
    entries.map((entry) => ({
      word_list_id: list.id,
      word: entry.word,
      meaning: entry.meaning,
    }))
  );

  if (wordError) {
    return NextResponse.json({ error: "Failed to save words" }, { status: 500 });
  }

  return NextResponse.json({ list, words: entries });
}

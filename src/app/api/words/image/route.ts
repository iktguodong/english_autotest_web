import { NextResponse } from "next/server";

import { extractWordsFromImage } from "@/lib/dashscope";
import { supabase } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";

const fileToDataUrl = async (file: File) => {
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");
  return `data:${file.type};base64,${base64}`;
};

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const formData = await request.formData();
  const file = formData.get("image");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Image file is required" }, { status: 400 });
  }

  const dataUrl = await fileToDataUrl(file);
  const entries = await extractWordsFromImage(dataUrl);

  if (entries.length === 0) {
    return NextResponse.json({ error: "No words found" }, { status: 400 });
  }

  const title = `图片导入 ${new Date().toLocaleString("zh-CN")}`;

  const { data: list, error: listError } = await supabase
    .from("word_lists")
    .insert({
      user_id: user.id,
      title,
      source_type: "image",
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

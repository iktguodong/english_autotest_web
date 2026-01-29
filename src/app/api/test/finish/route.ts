import { NextResponse } from "next/server";

import { supabase } from "@/lib/db";
import { requireUser } from "@/lib/requireUser";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (!user) return response;

  const body = await request.json().catch(() => null);
  const sessionId = body?.sessionId?.toString();
  const accuracy = Number(body?.accuracy ?? 0);

  if (!sessionId) {
    return NextResponse.json({ error: "Session id required" }, { status: 400 });
  }

  const { data: session } = await supabase
    .from("test_sessions")
    .select("id, user_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session || session.user_id !== user.id) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("test_sessions")
    .update({
      status: "finished",
      finished_at: new Date().toISOString(),
      accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
    })
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json({ error: "Failed to finish session" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

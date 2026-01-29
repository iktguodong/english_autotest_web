import { NextResponse } from "next/server";

import { getSessionUser } from "./session";

export const requireUser = async () => {
  const user = await getSessionUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { user, response: null };
};

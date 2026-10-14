import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isDemoEnabled, isDemoEmail } from "@/lib/demo";

export async function POST(req: Request) {
  if (!isDemoEnabled())
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const { email } = await req.json();
    if (typeof email !== "string" || !isDemoEmail(email)) {
      return NextResponse.json(
        { error: "Select a demo profile." },
        { status: 400 },
      );
    }
    const cookieStore = await cookies();
    // A preview must not retain a live session for direct storage uploads.
    for (const cookie of cookieStore.getAll()) {
      if (
        cookie.name.startsWith("sb-") &&
        cookie.name.includes("-auth-token")
      ) {
        cookieStore.delete(cookie.name);
      }
    }
    cookieStore.set("demo_user_email", email, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return NextResponse.json({ ok: true, email });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid demo request." },
      { status: 400 },
    );
  }
}

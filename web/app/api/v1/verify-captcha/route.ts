import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "../../../../lib/logger";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  try {
    const { token } = await req.json();
    const secret = process.env.NEXT_PRIVATE_CAPTCHA_SECRET!;
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${token}`,
    });
    const data = await res.json();
    if (!data.success) {
      await logEvent({
        level: "WARN",
        endpoint: "/api/v1/verify-captcha",
        message: "Invalid captcha verification",
        metadata: { ip, error: data },
      });
      return NextResponse.json({ valid: false }, { status: 400 });
    }
    return NextResponse.json({ valid: true });
  } catch (error: any) {
    await logEvent({
      level: "ERROR",
      endpoint: "/api/v1/verify-captcha",
      message: error.message,
      metadata: { ip, stack: error.stack },
    });
    return new Response("Internal Server Error", { status: 500 });
  }
}

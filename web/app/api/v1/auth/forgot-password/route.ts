import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import { protectEndpoint, RATE_LIMIT_CONFIGS } from "@/lib/server/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  try {
    const rateLimitError = await protectEndpoint(req, RATE_LIMIT_CONFIGS.AUTH, "auth/forgot-password");
    if (rateLimitError) {
      return rateLimitError;
    }

    const { captchaToken /*, ...forgotPasswordData*/ } = await req.json();

    const captchaRes = await fetch(`${req.nextUrl.origin}/api/v1/verify-captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: captchaToken }),
    });

    const captchaData = await captchaRes.json();

    if (!captchaData.valid) {
      return new Response("Invalid CAPTCHA", { status: 400 });
    }

    // …rest of forgot password logic (using forgotPasswordData)…
    return NextResponse.json({ message: "Forgot password logic goes here." });
  } catch (error: unknown) {
    let message = "An unknown error occurred";
    let stack;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
    }

    await logEvent({
      level: "ERROR",
      endpoint: "/api/v1/forgot-password",
      message: message,
      metadata: { ip, stack: stack },
    });
    return new Response("Internal Server Error", { status: 500 });
  }
}

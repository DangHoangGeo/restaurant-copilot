import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import { verifyRecaptchaToken } from "@/lib/utils/captcha";
import { createClient } from "@/lib/supabase/server";
import { protectEndpoint, RATE_LIMIT_CONFIGS } from "@/lib/server/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  try {
    const protectionError = await protectEndpoint(
      req,
      RATE_LIMIT_CONFIGS.AUTH,
      "auth-forgot-password",
    );
    if (protectionError) {
      return protectionError;
    }

    const { email, captchaToken } = await req.json();
    const captchaValid =
      typeof captchaToken === "string" && captchaToken.length > 0
        ? await verifyRecaptchaToken(captchaToken)
        : false;

    if (!captchaValid) {
      return new Response("Invalid CAPTCHA", { status: 400 });
    }

    if (typeof email !== "string" || email.length === 0) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const redirectBase =
      process.env.NEXT_PUBLIC_APP_URL ||
      req.nextUrl.origin;
    const redirectTo = `${redirectBase}/auth/callback?type=recovery`;

    await supabase.auth.resetPasswordForEmail(email, { redirectTo });

    return NextResponse.json({
      message: "If an account with this email exists, a password reset link has been sent.",
    });
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

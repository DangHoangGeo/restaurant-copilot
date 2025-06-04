import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "../../../lib/logger";

let ipCounters: Record<string, { tokens: number; lastRefill: number }> = {};

function rateLimit(ip: string, limit = 10, windowSec = 60): boolean {
  const now = Date.now();
  const entry = ipCounters[ip] || { tokens: limit, lastRefill: now };

  const timePassed = (now - entry.lastRefill) / 1000;
  entry.tokens = Math.min(limit, entry.tokens + timePassed * (limit / windowSec));
  entry.lastRefill = now;

  if (entry.tokens >= 1) {
    entry.tokens -= 1;
    ipCounters[ip] = entry;
    return true;
  }

  ipCounters[ip] = entry;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  try {
    if (!rateLimit(ip)) {
      return new Response("Too Many Requests", { status: 429 });
    }

    const { captchaToken, ...loginData } = await req.json();

    const captchaRes = await fetch(`${req.nextUrl.origin}/api/v1/verify-captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: captchaToken }),
    });

    const captchaData = await captchaRes.json();

    if (!captchaData.valid) {
      return new Response("Invalid CAPTCHA", { status: 400 });
    }

    // …rest of login logic (using loginData)…
    return NextResponse.json({ message: "Login logic goes here." });
  } catch (error: any) {
    await logEvent({
      level: "ERROR",
      endpoint: "/api/v1/login",
      message: error.message,
      metadata: { ip, stack: error.stack },
    });
    return new Response("Internal Server Error", { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "../../../../../lib/logger";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import jwt from "jsonwebtoken";
import { serialize } from "cookie";

const ipCounters: Record<string, { tokens: number; lastRefill: number }> = {};

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

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key"; // TODO: Use a strong, environment-variable-based secret

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  try {
    if (!rateLimit(ip)) {
      return new Response("Too Many Requests", { status: 429 });
    }

    const { email, password, captchaToken } = await req.json();

    // Verify CAPTCHA
    const captchaRes = await fetch(`${req.nextUrl.origin}/api/v1/verify-captcha`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: captchaToken }),
    });

    const captchaData = await captchaRes.json();

    if (!captchaData.valid) {
      return new Response("Invalid CAPTCHA", { status: 400 });
    }

    // Authenticate user with Supabase
    const { data, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/auth/login",
        message: `Authentication failed: ${authError.message}`,
        metadata: { ip, email },
      });
      return new Response(authError.message, { status: 401 });
    }

    if (!data.user) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/auth/login",
        message: "Authentication successful but no user data returned.",
        metadata: { ip, email },
      });
      return new Response("Authentication failed: No user data", { status: 401 });
    }

    // Fetch user's restaurant_id and subdomain
    // 1. Get the user's restaurant_id
    const { data: userRecord, error } = await supabaseAdmin
      .from("users")
      .select("restaurant_id")
      .eq("id", data.user.id)
      .single();

    const restaurantId = userRecord?.restaurant_id;

    if (error || !restaurantId) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/auth/login",
        message: `Failed to retrieve user data: ${error?.message || "No restaurant_id found"}`,
        metadata: { ip, userId: data.user.id },
      });
      return new Response("Failed to retrieve user information: No restaurant_id", { status: 500 });
    }

    // 2. Get the restaurant's subdomain
    const { data: restaurant, error: restError } = await supabaseAdmin
      .from("restaurants")
      .select("subdomain, default_language")
      .eq("id", restaurantId)
      .single();

    if (restError || !restaurant?.subdomain) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/auth/login",
        message: `Failed to retrieve restaurant data: ${restError?.message || "No subdomain found"}`,
        metadata: { ip, userId: data.user.id },
      });
      return new Response("Failed to retrieve restaurant information: No subdomain", { status: 500 });
    }

    const restaurantSubdomain = restaurant.subdomain;
    const defaultLanguage = restaurant.default_language || "en"; // Fallback to English if not set
    if (!restaurantSubdomain) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/auth/login",
        message: "Restaurant subdomain not found for user.",
        metadata: { ip, userId: data.user.id },
      });
      return new Response("Failed to retrieve restaurant information: Subdomain missing", { status: 500 });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: data.user.id,
        restaurantId: restaurantId,
        subdomain: restaurantSubdomain,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 1 week expiration
      },
      JWT_SECRET
    );

    // Set JWT as an HTTP-only cookie
    const cookie = serialize("auth_token", token, {
      httpOnly: true,
      secure: process.env.NEXT_PRIVATE_DEVELOPMENT !== "true", // Use secure in production
      sameSite: "lax",
      path: "/",
      domain: process.env.NEXT_PRIVATE_DEVELOPMENT !== "true" ? "."+process.env.NEXT_PRIVATE_PRODUCTION_URL:undefined, // Set domain for cross-subdomain access in production
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
    const isDevelopment = process.env.NEXT_PRIVATE_DEVELOPMENT!;
    const productionUrl = process.env.NEXT_PRIVATE_PRODUCTION_URL || "baoan.jp";
    let redirectUrl = `https://${restaurantSubdomain}.${productionUrl}/${defaultLanguage}/dashboard`;
    if (isDevelopment) {
      redirectUrl = `http://${restaurantSubdomain}.localhost:3000/${defaultLanguage}/dashboard`;
    }

    const response = NextResponse.json({
      message: "Login successful",
      subdomain: restaurantSubdomain,
      redirectUrl: redirectUrl,
    });
    response.headers.set("Set-Cookie", cookie);
    return response;

  } catch (error: unknown) {
    let message = "An unknown error occurred";
    let stack;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
    }

    await logEvent({
      level: "ERROR",
      endpoint: "/api/v1/login",
      message: message,
      metadata: { ip, stack: stack },
    });
    return new Response("Internal Server Error", { status: 500 });
  }
}

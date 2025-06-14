import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "../../../../../lib/logger";
import { createClient } from "@/lib/supabase/server";

const ipCounters: Record<string, { tokens: number; lastRefill: number }> = {};

function rateLimit(ip: string, limit = 10, windowSec = 60): boolean {
  const now = Date.now();
  const entry = ipCounters[ip] || { tokens: limit, lastRefill: now };

  const timePassed = (now - entry.lastRefill) / 1000;
  entry.tokens = Math.min(
    limit,
    entry.tokens + timePassed * (limit / windowSec),
  );
  entry.lastRefill = now;

  if (entry.tokens >= 1) {
    entry.tokens -= 1;
    ipCounters[ip] = entry;
    return true;
  }

  ipCounters[ip] = entry;
  return false;
}

// JWT_SECRET will be retrieved and checked within the POST handler.

export async function POST(req: NextRequest) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("FATAL: JWT_SECRET environment variable is not set.");
    return new Response("Internal Server Error: JWT_SECRET not configured.", {
      status: 500,
    });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  try {
    if (!rateLimit(ip)) {
      return new Response("Too Many Requests", { status: 429 });
    }

    const { email, password, captchaToken } = await req.json();

    // Verify CAPTCHA
    const captchaRes = await fetch(
      `${req.nextUrl.origin}/api/v1/verify-captcha`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: captchaToken }),
      },
    );

    const captchaData = await captchaRes.json();

    if (!captchaData.valid) {
      return new Response("Invalid CAPTCHA", { status: 400 });
    }
    const supabase = await createClient()
    // Authenticate user with Supabase
    const { data, error: authError } =
      await supabase.auth.signInWithPassword({
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
      return new Response("Authentication failed: No user data", {
        status: 401,
      });
    }

    // Fetch user's restaurant_id and subdomain
    // 1. Get the user's restaurant_id
    const { data: userRecord, error } = await supabase
      .from("users")
      .select("restaurant_id, two_factor_enabled, role")
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
      return new Response(
        "Failed to retrieve user information: No restaurant_id",
        { status: 500 },
      );
    }

    // 2. Get the restaurant's subdomain
    const { data: restaurant, error: restError } = await supabase
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
      return new Response(
        "Failed to retrieve restaurant information: No subdomain",
        { status: 500 },
      );
    }

    const restaurantSubdomain = restaurant.subdomain;
    const defaultLanguage = restaurant.default_language || "en";

    // No two_factor_enabled check for now, directly proceed to login.
    // if (userRecord.two_factor_enabled && userRecord.role === "owner") {
    //   // Handle 2FA logic if necessary, e.g., by returning a different response
    //   // or setting a temporary cookie and redirecting to a 2FA verification page.
    //   // For now, we assume 2FA is handled elsewhere or not strictly enforced at this step.
    // }

    // JWT token generation and auth_token cookie are removed.
    // Supabase client's signInWithPassword handles session cookies.

    const isDevelopment = process.env.NEXT_PRIVATE_DEVELOPMENT === "true";
    const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || "coorder.ai";
    let redirectUrl = `https://${restaurantSubdomain}.${productionUrl}/${defaultLanguage}/dashboard`;
    if (isDevelopment) {
      redirectUrl = `http://${restaurantSubdomain}.localhost:3000/${defaultLanguage}/dashboard`;
    }

    const response = NextResponse.json({
      message: "Login successful",
      subdomain: restaurantSubdomain,
      redirectUrl: redirectUrl,
    });
    // response.headers.set("Set-Cookie", cookie); // Removed: Supabase handles its own session cookies
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

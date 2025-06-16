import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import { signupSchema } from "@/shared/schemas/signup";
import { z } from "zod";
import { ZodError } from "zod"; // Import ZodError explicitly
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  let body: z.infer<typeof signupSchema> | null = null; // Initialize body to null
  try {
    if (!rateLimit(ip)) {
      await logEvent({
        level: "WARN",
        endpoint: "/api/v1/register",
        message: "Rate limit exceeded",
        metadata: { ip },
      });
      return new Response("Too Many Requests", { status: 429 });
    }

    body = await req.json(); // Assign to the outer-scoped body
    const { name, subdomain, email, password, defaultLanguage, policyAgreement } = signupSchema.parse(body);

    // Ensure user has agreed to the policy (this is already validated by the schema, but explicit check for clarity)
    if (!policyAgreement) {
      await logEvent({
        level: "WARN",
        endpoint: "/api/v1/register",
        message: "Registration attempted without policy agreement",
        metadata: { email, subdomain },
      });
      return NextResponse.json({ error: "You must agree to the Terms of Service and Privacy Policy" }, { status: 400 });
    }

    // 2. Recheck subdomain in restaurants; if taken, return 409.
    const { data: existingRestaurant, error: checkError } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("subdomain", subdomain)
      .single();

    if (existingRestaurant) {
      await logEvent({
        level: "INFO",
        endpoint: "/api/v1/register",
        message: "Subdomain already taken",
        metadata: { subdomain, email },
      });
      return NextResponse.json({ error: "Subdomain already taken" }, { status: 409 });
    }
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found
      throw checkError;
    }
    // 3. Create Supabase Auth user
    const { data: userData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Automatically confirm email
      user_metadata: { name },
    });

    if (authError) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/register",
        message: `Supabase Auth user creation failed: ${authError.message}`,
        metadata: { email, stack: authError.stack },
      });
      console.error("Supabase Auth user creation failed:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!userData.user) {
      throw new Error("User data not returned after creation.");
    }

    // 4. Insert into restaurants with { name, subdomain, default_language }, returning restaurant_id.
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .insert([{ name, subdomain, default_language: defaultLanguage }])
      .select("id")
      .single();

    if (restaurantError) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/register",
        message: `Restaurant insertion failed: ${restaurantError.message}`,
        metadata: { email, subdomain, stack: restaurantError.stack },
      });
      // Attempt to delete the auth user if restaurant creation fails
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json({ error: "Restaurant creation failed" }, { status: 500 });
    }

    const restaurantId = restaurantData.id;

    // 5. Update Auth user to set custom claims
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
      app_metadata: { subdomain: subdomain, restaurant_id: restaurantId, role: "owner" },
    });

    if (updateAuthError) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/register",
        message: `Auth user metadata update failed: ${updateAuthError.message}`,
        metadata: { userId: userData.user.id, restaurantId, stack: updateAuthError.stack },
      });
      // This is a critical error, but the user is already created.
      // We might need a background job to clean this up or manual intervention.
      return NextResponse.json({ error: "User metadata update failed" }, { status: 500 });
    }

    // 6. Insert into users table
    const { error: userInsertError } = await supabaseAdmin.from("users").insert([
      {
        id: userData.user.id,
        restaurant_id: restaurantId,
        email,
        name,
        role: "owner",
      },
    ]);

    if (userInsertError) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/register",
        message: `User table insertion failed: ${userInsertError.message}`,
        metadata: { userId: userData.user.id, restaurantId, stack: userInsertError.stack },
      });
      // Similar to above, critical error.
      return NextResponse.json({ error: "User record creation failed" }, { status: 500 });
    }

    // 7. Return { success: true, redirect: "https://{subdomain}.coorder.ai/en/login" }.

    const isDevelopment = process.env.NEXT_PRIVATE_DEVELOPMENT === "true";
    const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || "coorder.ai";
    let redirectUrl = `https://${subdomain}.${productionUrl}/${defaultLanguage}/login`;
    if (isDevelopment) {
      redirectUrl = `http://${subdomain}.localhost:3000/${defaultLanguage}/login`;
    }
    await logEvent({
      level: "INFO",
      endpoint: "/api/v1/register",
      message: "User registered successfully",
      metadata: { email, subdomain, restaurantId },
    });
    return NextResponse.json({ success: true, redirect: redirectUrl });
  } catch (error: unknown) {
    // 8. On any error, call logEvent({ level: "ERROR", endpoint: "/api/v1/register", message: error.message })
    let message = "An unknown error occurred";
    let stack;

    if (error instanceof Error) {
      message = error.message;
      stack = error.stack;
    }

    await logEvent({
      level: "ERROR",
      endpoint: "/api/v1/register",
      message: message,
      metadata: { ip, stack: stack, body: JSON.stringify(body) }, // Log body for debugging
    });
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid input data", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

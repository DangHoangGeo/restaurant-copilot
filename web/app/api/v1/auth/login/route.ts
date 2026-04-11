import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
    // 1. Get the user's restaurant_id - handle potential duplicates
    const { data: userRecords, error } = await supabase
      .from("users")
      .select("restaurant_id, two_factor_enabled, role")
      .eq("id", data.user.id);

    if (error) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/auth/login",
        message: `Failed to query user data: ${error.message}`,
        metadata: { ip, userId: data.user.id },
      });
      return new Response(
        "Failed to retrieve user information",
        { status: 500 },
      );
    }

    let userRecord;
    let restaurantId;

    if (!userRecords || userRecords.length === 0) {
      // User record not found in users table - this might be a query issue, let's try again with admin client
      await logEvent({
        level: "WARN",
        endpoint: "/api/v1/auth/login",
        message: "No user record found with regular client, trying admin client",
        metadata: { ip, userId: data.user.id },
      });

      // Try with admin client in case there are RLS issues
      const { data: adminUserRecords, error: adminError } = await supabaseAdmin
        .from("users")
        .select("restaurant_id, two_factor_enabled, role")
        .eq("id", data.user.id);

      if (!adminError && adminUserRecords && adminUserRecords.length > 0) {
        await logEvent({
          level: "INFO",
          endpoint: "/api/v1/auth/login",
          message: "Found user record with admin client",
          metadata: { ip, userId: data.user.id, recordCount: adminUserRecords.length },
        });
        
        userRecord = adminUserRecords[0];
        restaurantId = userRecord?.restaurant_id;
      } else {
        // Still no user record found - check if we can create it from auth metadata
        await logEvent({
          level: "WARN",
          endpoint: "/api/v1/auth/login",
          message: "No user record found even with admin client, checking auth metadata for fallback creation",
          metadata: { ip, userId: data.user.id, adminError: adminError?.message },
        });

        // Check if user has restaurant metadata from registration
        const authRestaurantId = data.user.app_metadata?.restaurant_id;
        const authRole = data.user.app_metadata?.role;

        if (authRestaurantId && authRole) {
          // Try to create the missing user record
          try {
            const { error: insertError } = await supabaseAdmin.from("users").insert([
              {
                id: data.user.id,
                restaurant_id: authRestaurantId,
                email: data.user.email,
                name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'User',
                role: authRole,
              },
            ]);

            if (insertError) {
              // Check if it's a duplicate key constraint - if so, the record exists but our query had issues
              if (insertError.code === '23505') { // PostgreSQL unique constraint violation
                await logEvent({
                  level: "WARN",
                  endpoint: "/api/v1/auth/login",
                  message: "User record already exists but query didn't find it, retrying query",
                  metadata: { ip, userId: data.user.id, authRestaurantId },
                });
                
                // Retry the query one more time
                const { data: retryUserRecords, error: retryError } = await supabaseAdmin
                  .from("users")
                  .select("restaurant_id, two_factor_enabled, role")
                  .eq("id", data.user.id);

                if (!retryError && retryUserRecords && retryUserRecords.length > 0) {
                  userRecord = retryUserRecords[0];
                  restaurantId = userRecord?.restaurant_id;
                  await logEvent({
                    level: "INFO",
                    endpoint: "/api/v1/auth/login",
                    message: "Successfully found user record on retry",
                    metadata: { ip, userId: data.user.id },
                  });
                }
              } else {
                await logEvent({
                  level: "ERROR",
                  endpoint: "/api/v1/auth/login",
                  message: `Failed to create missing user record: ${insertError.message}`,
                  metadata: { ip, userId: data.user.id, authRestaurantId, errorCode: insertError.code },
                });
              }
            } else {
              await logEvent({
                level: "INFO",
                endpoint: "/api/v1/auth/login",
                message: "Successfully created missing user record from auth metadata",
                metadata: { ip, userId: data.user.id, authRestaurantId },
              });
              
              userRecord = {
                restaurant_id: authRestaurantId,
                two_factor_enabled: false,
                role: authRole
              };
              restaurantId = authRestaurantId;
            }
          } catch (createError) {
            await logEvent({
              level: "ERROR",
              endpoint: "/api/v1/auth/login",
              message: `Exception creating missing user record: ${createError instanceof Error ? createError.message : String(createError)}`,
              metadata: { ip, userId: data.user.id, authRestaurantId },
            });
          }
        }

        // If we still don't have a user record, return error
        if (!userRecord) {
          await logEvent({
            level: "ERROR",
            endpoint: "/api/v1/auth/login",
            message: "No user record found and unable to create from auth metadata",
            metadata: { 
              ip, 
              userId: data.user.id, 
              hasAuthMetadata: !!authRestaurantId,
              adminQueryError: adminError?.message 
            },
          });
          return new Response(
            "User record not found. Please contact support or re-register your account.",
            { status: 404 },
          );
        }
      }
    } else {
      if (userRecords.length > 1) {
        await logEvent({
          level: "WARN",
          endpoint: "/api/v1/auth/login",
          message: `Multiple user records found (${userRecords.length} records) - using first record`,
          metadata: { ip, userId: data.user.id, recordCount: userRecords.length },
        });
      }

      // Use the first record (or only record if there's just one)
      userRecord = userRecords[0];
      restaurantId = userRecord?.restaurant_id;
    }

    if (!restaurantId) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/auth/login",
        message: "No restaurant_id found in user record",
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
      .select("subdomain, default_language, is_verified, is_active, suspended_at")
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
    const isDevelopment = process.env.NEXT_PRIVATE_DEVELOPMENT === "true";
    const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || "coorder.ai";

    if (!restaurant.is_verified) {
      let pendingApprovalUrl = `https://${restaurantSubdomain}.${productionUrl}/${defaultLanguage}/pending-approval`;
      if (isDevelopment) {
        pendingApprovalUrl = `http://${restaurantSubdomain}.localhost:3000/${defaultLanguage}/pending-approval`;
      }

      await supabase.auth.signOut();
      return NextResponse.json(
        {
          message: "Your restaurant account is pending admin approval.",
          pendingApproval: true,
          redirectUrl: pendingApprovalUrl,
        },
        { status: 403 },
      );
    }

    if (!restaurant.is_active || restaurant.suspended_at) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { message: "Your restaurant account is currently suspended." },
        { status: 403 },
      );
    }

    // No two_factor_enabled check for now, directly proceed to login.
    // if (userRecord.two_factor_enabled && userRecord.role === "owner") {
    //   // Handle 2FA logic if necessary, e.g., by returning a different response
    //   // or setting a temporary cookie and redirecting to a 2FA verification page.
    //   // For now, we assume 2FA is handled elsewhere or not strictly enforced at this step.
    // }

    // JWT token generation and auth_token cookie are removed.
    // Supabase client's signInWithPassword handles session cookies.

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

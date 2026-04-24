import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import {
  buildBranchDashboardUrl,
  buildRootControlUrl,
  getRootDashboardAccess,
} from "@/lib/server/organizations/root-dashboard";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyRecaptchaToken } from "@/lib/utils/captcha";
import { protectEndpoint, RATE_LIMIT_CONFIGS } from "@/lib/server/rateLimit";

function resolveLocaleFromRequest(req: NextRequest): string {
  const referer = req.headers.get("referer");
  if (!referer) return "en";

  try {
    const pathname = new URL(referer).pathname;
    const locale = pathname.split("/").filter(Boolean)[0];
    return locale || "en";
  } catch {
    return "en";
  }
}

function buildPlatformRedirectUrl(req: NextRequest, locale: string): string {
  const isDevelopment = process.env.NEXT_PRIVATE_DEVELOPMENT === "true";
  const productionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL || "coorder.ai";
  const rootOrigin = isDevelopment
    ? req.nextUrl.origin
    : `https://${productionUrl}`;

  return `${rootOrigin}/${locale}/platform`;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  try {
    const protectionError = await protectEndpoint(
      req,
      RATE_LIMIT_CONFIGS.AUTH,
      "auth-login",
    );
    if (protectionError) {
      return protectionError;
    }

    const { email, password, captchaToken } = await req.json();

    const captchaValid =
      typeof captchaToken === "string" && captchaToken.length > 0
        ? await verifyRecaptchaToken(captchaToken)
        : false;
    if (!captchaValid) {
      return new Response("Invalid CAPTCHA", { status: 400 });
    }
    const supabase = await createClient();
    // Authenticate user with Supabase
    const { data, error: authError } = await supabase.auth.signInWithPassword({
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

    const { data: platformAdmin, error: platformAdminError } =
      await supabaseAdmin
        .from("platform_admins")
        .select("id")
        .eq("user_id", data.user.id)
        .eq("is_active", true)
        .maybeSingle();

    if (platformAdminError) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/auth/login",
        message: `Failed to query platform admin access: ${platformAdminError.message}`,
        metadata: { ip, userId: data.user.id },
      });
    }

    if (platformAdmin) {
      const locale = resolveLocaleFromRequest(req);

      await logEvent({
        level: "INFO",
        endpoint: "/api/v1/auth/login",
        message: "Platform admin login successful",
        metadata: {
          ip,
          userId: data.user.id,
          platformAdminId: platformAdmin.id,
        },
      });

      return NextResponse.json({
        message: "Login successful",
        role: "platform_admin",
        redirectUrl: buildPlatformRedirectUrl(req, locale),
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
      return new Response("Failed to retrieve user information", {
        status: 500,
      });
    }

    let userRecord;
    let restaurantId;

    if (!userRecords || userRecords.length === 0) {
      // User record not found in users table - this might be a query issue, let's try again with admin client
      await logEvent({
        level: "WARN",
        endpoint: "/api/v1/auth/login",
        message:
          "No user record found with regular client, trying admin client",
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
          metadata: {
            ip,
            userId: data.user.id,
            recordCount: adminUserRecords.length,
          },
        });

        userRecord = adminUserRecords[0];
        restaurantId = userRecord?.restaurant_id;
      } else {
        // Still no user record found - check if we can create it from auth metadata
        await logEvent({
          level: "WARN",
          endpoint: "/api/v1/auth/login",
          message:
            "No user record found even with admin client, checking auth metadata for fallback creation",
          metadata: {
            ip,
            userId: data.user.id,
            adminError: adminError?.message,
          },
        });

        // Check if user has restaurant metadata from registration
        const authRestaurantId = data.user.app_metadata?.restaurant_id;
        const authRole = data.user.app_metadata?.role;

        if (authRestaurantId && authRole) {
          // Try to create the missing user record
          try {
            const { error: insertError } = await supabaseAdmin
              .from("users")
              .insert([
                {
                  id: data.user.id,
                  restaurant_id: authRestaurantId,
                  email: data.user.email,
                  name:
                    data.user.user_metadata?.name ||
                    data.user.email?.split("@")[0] ||
                    "User",
                  role: authRole,
                },
              ]);

            if (insertError) {
              // Check if it's a duplicate key constraint - if so, the record exists but our query had issues
              if (insertError.code === "23505") {
                // PostgreSQL unique constraint violation
                await logEvent({
                  level: "WARN",
                  endpoint: "/api/v1/auth/login",
                  message:
                    "User record already exists but query didn't find it, retrying query",
                  metadata: { ip, userId: data.user.id, authRestaurantId },
                });

                // Retry the query one more time
                const { data: retryUserRecords, error: retryError } =
                  await supabaseAdmin
                    .from("users")
                    .select("restaurant_id, two_factor_enabled, role")
                    .eq("id", data.user.id);

                if (
                  !retryError &&
                  retryUserRecords &&
                  retryUserRecords.length > 0
                ) {
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
                  metadata: {
                    ip,
                    userId: data.user.id,
                    authRestaurantId,
                    errorCode: insertError.code,
                  },
                });
              }
            } else {
              await logEvent({
                level: "INFO",
                endpoint: "/api/v1/auth/login",
                message:
                  "Successfully created missing user record from auth metadata",
                metadata: { ip, userId: data.user.id, authRestaurantId },
              });

              userRecord = {
                restaurant_id: authRestaurantId,
                two_factor_enabled: false,
                role: authRole,
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
            message:
              "No user record found and unable to create from auth metadata",
            metadata: {
              ip,
              userId: data.user.id,
              hasAuthMetadata: !!authRestaurantId,
              adminQueryError: adminError?.message,
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
          metadata: {
            ip,
            userId: data.user.id,
            recordCount: userRecords.length,
          },
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

    // 2. Get the restaurant's subdomain and approval status
    const { data: restaurant, error: restError } = await supabase
      .from("restaurants")
      .select(
        "subdomain, default_language, is_verified, is_active, suspended_at",
      )
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
    const productionUrl =
      process.env.NEXT_PUBLIC_PRODUCTION_URL || "coorder.ai";
    const { data: orgLink } = await supabaseAdmin
      .from("organization_restaurants")
      .select("owner_organizations(public_subdomain)")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    const ownerOrganization = Array.isArray(orgLink?.owner_organizations)
      ? orgLink.owner_organizations[0]
      : orgLink?.owner_organizations;
    const appSubdomain =
      ownerOrganization?.public_subdomain || restaurantSubdomain;

    // Check approval/suspension status before allowing access to the dashboard.
    const isSuspended = restaurant.suspended_at != null;
    const isPendingApproval = !restaurant.is_verified || !restaurant.is_active;

    if (isSuspended || isPendingApproval) {
      const reason = isSuspended ? "suspended" : "pending";
      const rootOrigin = isDevelopment
        ? "http://localhost:3000"
        : `https://${productionUrl}`;
      const pendingRedirectUrl = `${rootOrigin}/${defaultLanguage}/pending-approval?reason=${reason}`;

      await logEvent({
        level: "WARN",
        endpoint: "/api/v1/auth/login",
        message: `Login blocked for restaurant ${restaurantId}: ${reason}`,
        metadata: { ip, userId: data.user.id, restaurantId },
      });

      return NextResponse.json(
        {
          message: "Your restaurant account is not yet approved.",
          redirectUrl: pendingRedirectUrl,
        },
        { status: 403 },
      );
    }

    const rootDashboardAccess = await getRootDashboardAccess(data.user.id);

    const redirectUrl = rootDashboardAccess
      ? buildRootControlUrl(
          defaultLanguage,
          rootDashboardAccess.public_subdomain,
          rootDashboardAccess.onboarding_completed_at,
        )
      : buildBranchDashboardUrl(appSubdomain, defaultLanguage);

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

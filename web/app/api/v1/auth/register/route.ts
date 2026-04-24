import { NextRequest, NextResponse } from "next/server";
import { logEvent } from "@/lib/logger";
import { signupSchema } from "@/shared/schemas/signup";
import { z } from "zod";
import { ZodError } from "zod"; // Import ZodError explicitly
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { bootstrapOrganizationForRestaurant } from "@/lib/server/organizations/service";
import { verifyRecaptchaToken } from "@/lib/utils/captcha";
import { protectEndpoint, RATE_LIMIT_CONFIGS } from "@/lib/server/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  let body: z.infer<typeof signupSchema> | null = null; // Initialize body to null
  try {
    const protectionError = await protectEndpoint(
      req,
      RATE_LIMIT_CONFIGS.AUTH,
      "auth-register",
    );
    if (protectionError) {
      return protectionError;
    }

    body = await req.json(); // Assign to the outer-scoped body
    const {
      name,
      subdomain,
      email,
      password,
      defaultLanguage,
      selectedBillingCycle,
      policyAgreement,
      selectedPlan,
      captchaToken,
    } = signupSchema.parse(body);

    // Server-side CAPTCHA verification — client-side check alone is bypassable.
    const captchaValid =
      typeof captchaToken === "string" && captchaToken.length > 0
        ? await verifyRecaptchaToken(captchaToken)
        : false;

    if (!captchaValid) {
      await logEvent({
        level: "WARN",
        endpoint: "/api/v1/register",
        message: "Registration blocked: invalid or missing CAPTCHA token",
        metadata: { ip, email },
      });
      return NextResponse.json(
        { error: "CAPTCHA verification failed" },
        { status: 400 },
      );
    }

    // Ensure user has agreed to the policy (this is already validated by the schema, but explicit check for clarity)
    if (!policyAgreement) {
      await logEvent({
        level: "WARN",
        endpoint: "/api/v1/register",
        message: "Registration attempted without policy agreement",
        metadata: { email, subdomain },
      });
      return NextResponse.json(
        { error: "You must agree to the Terms of Service and Privacy Policy" },
        { status: 400 },
      );
    }

    // 2. Recheck subdomain in restaurants and organizations; if taken, return 409.
    const [
      { data: existingRestaurant, error: restaurantCheckError },
      { data: existingOrganization, error: organizationCheckError },
    ] = await Promise.all([
      supabaseAdmin
        .from("restaurants")
        .select("id")
        .eq("subdomain", subdomain)
        .maybeSingle(),
      supabaseAdmin
        .from("owner_organizations")
        .select("id")
        .or(`public_subdomain.eq.${subdomain},slug.eq.${subdomain}`)
        .maybeSingle(),
    ]);

    if (existingRestaurant || existingOrganization) {
      await logEvent({
        level: "INFO",
        endpoint: "/api/v1/register",
        message: "Subdomain already taken",
        metadata: { subdomain, email },
      });
      return NextResponse.json(
        { error: "Subdomain already taken" },
        { status: 409 },
      );
    }
    if (restaurantCheckError) {
      throw restaurantCheckError;
    }
    if (organizationCheckError) {
      throw organizationCheckError;
    }
    // 3. Create Supabase Auth user
    const { data: userData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
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

    // 4. Insert into restaurants with { name, subdomain, default_language, brand_color }, returning restaurant_id.
    const { data: restaurantData, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .insert([
        {
          name,
          subdomain,
          branch_code: subdomain,
          default_language: defaultLanguage,
          brand_color: "#00a3d7",
          email,
          is_verified: false,
        },
      ])
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
      return NextResponse.json(
        { error: "Restaurant creation failed" },
        { status: 500 },
      );
    }

    const restaurantId = restaurantData.id;

    // 5. Update Auth user to set custom claims
    const { error: updateAuthError } =
      await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
        app_metadata: {
          subdomain: subdomain,
          restaurant_id: restaurantId,
          role: "owner",
        },
      });

    if (updateAuthError) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/register",
        message: `Auth user metadata update failed: ${updateAuthError.message}`,
        metadata: {
          userId: userData.user.id,
          restaurantId,
          stack: updateAuthError.stack,
        },
      });
      // Compensating rollback: auth user and restaurant already exist but are incomplete.
      await supabaseAdmin.from("restaurants").delete().eq("id", restaurantId);
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      return NextResponse.json(
        { error: "User metadata update failed" },
        { status: 500 },
      );
    }

    // 6. Insert into users table
    const { error: userInsertError } = await supabaseAdmin
      .from("users")
      .insert([
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
        metadata: {
          userId: userData.user.id,
          restaurantId,
          stack: userInsertError.stack,
        },
      });
      // The auth user and restaurant already exist at this point. Roll them
      // back so approval cannot later see an orphaned, unowned branch.
      const restaurantDelete = await supabaseAdmin
        .from("restaurants")
        .delete()
        .eq("id", restaurantId);
      if (restaurantDelete.error) {
        await logEvent({
          level: "ERROR",
          endpoint: "/api/v1/register",
          message: `Rollback failed: could not delete restaurant after user insert failure: ${restaurantDelete.error.message}`,
          metadata: { userId: userData.user.id, restaurantId, subdomain },
        });
      }

      const authDelete = await supabaseAdmin.auth.admin.deleteUser(
        userData.user.id,
      );
      if (authDelete.error) {
        await logEvent({
          level: "ERROR",
          endpoint: "/api/v1/register",
          message: `Rollback failed: could not delete auth user after user insert failure: ${authDelete.error.message}`,
          metadata: { userId: userData.user.id, restaurantId, subdomain },
        });
      }

      return NextResponse.json(
        { error: "User record creation failed" },
        { status: 500 },
      );
    }

    // 7. Bootstrap organization for the new restaurant (Phase 1)
    const bootstrapResult = await bootstrapOrganizationForRestaurant(
      userData.user.id,
      restaurantId,
      {
        name,
        slug: subdomain,
        requested_plan: selectedPlan ?? "starter",
        requested_billing_cycle: selectedBillingCycle ?? "monthly",
      },
    );

    if (!bootstrapResult) {
      await logEvent({
        level: "ERROR",
        endpoint: "/api/v1/register",
        message:
          "Organization bootstrap failed after restaurant and user creation",
        metadata: { userId: userData.user.id, restaurantId, subdomain },
      });

      // Best-effort compensating rollback. Order matters: rows in `users` have a
      // FK back to `restaurants`, and `auth.users` is deleted last so we still
      // have an admin handle for the other two cleanups. Any step that fails
      // must be logged so an operator can finish the cleanup manually — silent
      // failures here leave orphan rows behind.
      const usersDelete = await supabaseAdmin
        .from("users")
        .delete()
        .eq("id", userData.user.id);
      if (usersDelete.error) {
        await logEvent({
          level: "ERROR",
          endpoint: "/api/v1/register",
          message: `Rollback failed: could not delete users row: ${usersDelete.error.message}`,
          metadata: { userId: userData.user.id, restaurantId, subdomain },
        });
      }

      const restaurantsDelete = await supabaseAdmin
        .from("restaurants")
        .delete()
        .eq("id", restaurantId);
      if (restaurantsDelete.error) {
        await logEvent({
          level: "ERROR",
          endpoint: "/api/v1/register",
          message: `Rollback failed: could not delete restaurants row: ${restaurantsDelete.error.message}`,
          metadata: { userId: userData.user.id, restaurantId, subdomain },
        });
      }

      const authDelete = await supabaseAdmin.auth.admin.deleteUser(
        userData.user.id,
      );
      if (authDelete.error) {
        await logEvent({
          level: "ERROR",
          endpoint: "/api/v1/register",
          message: `Rollback failed: could not delete auth user: ${authDelete.error.message}`,
          metadata: { userId: userData.user.id, restaurantId, subdomain },
        });
      }

      return NextResponse.json(
        { error: "Organization bootstrap failed" },
        { status: 500 },
      );
    }

    // 8. Send the founder into the pending-approval flow on the root domain.
    const redirectUrl =
      `/${defaultLanguage}/signup/pending-approval?org=${encodeURIComponent(subdomain)}` +
      `&plan=${encodeURIComponent(selectedPlan ?? "starter")}` +
      `&billing=${encodeURIComponent(selectedBillingCycle ?? "monthly")}`;
    await logEvent({
      level: "INFO",
      endpoint: "/api/v1/register",
      message: "User registered successfully and is waiting for approval",
      metadata: { email, subdomain, restaurantId, selectedPlan },
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
      return NextResponse.json(
        { error: "Invalid input data", details: error.errors },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

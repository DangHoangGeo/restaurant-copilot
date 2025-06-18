import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";

export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ error: "Verification code is required" }, { status: 400 });
    }

    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's secret
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("two_factor_secret, two_factor_enabled")
      .eq("id", user.id)
      .single();

    if (userError || !userData.two_factor_secret) {
      return NextResponse.json({ error: "Two-factor setup not initiated" }, { status: 400 });
    }

    if (userData.two_factor_enabled) {
      return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 400 });
    }

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: userData.two_factor_secret,
      encoding: "base32",
      token: code,
      window: 2, // Allow 2 time windows for clock drift
    });

    if (!verified) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Enable 2FA for the user
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ two_factor_enabled: true })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to enable two-factor authentication" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Two-factor authentication enabled successfully" });

  } catch (error) {
    console.error("2FA verification setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

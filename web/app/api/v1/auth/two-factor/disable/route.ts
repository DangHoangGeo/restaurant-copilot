import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import speakeasy from "speakeasy";

export async function POST(req: NextRequest) {
  try {
    const { password, code } = await req.json();

    if (!password || !code) {
      return NextResponse.json({ error: "Password and verification code are required" }, { status: 400 });
    }


    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify password by attempting to sign in
    const { error: passwordError } = await supabaseAdmin.auth.signInWithPassword({
      email: user.email!,
      password: password,
    });

    if (passwordError) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    // Get user's 2FA data
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("two_factor_secret, two_factor_enabled")
      .eq("id", user.id)
      .single();

    if (userError) {
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }

    if (!userData.two_factor_enabled) {
      return NextResponse.json({ error: "Two-factor authentication is not enabled" }, { status: 400 });
    }

    // Verify the 2FA code
    const verified = speakeasy.totp.verify({
      secret: userData.two_factor_secret,
      encoding: "base32",
      token: code,
      window: 2, // Allow 2 time windows for clock drift
    });

    if (!verified) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Disable 2FA
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ 
        two_factor_enabled: false,
        two_factor_secret: null
      })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to disable two-factor authentication" }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Two-factor authentication disabled successfully" });

  } catch (error) {
    console.error("2FA disable error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

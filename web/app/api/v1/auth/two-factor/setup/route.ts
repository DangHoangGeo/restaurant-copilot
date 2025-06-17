import {  NextResponse } from "next/server";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  try {

    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user already has 2FA enabled
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("two_factor_enabled, two_factor_secret")
      .eq("id", user.id)
      .single();

    if (userError) {
      return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }

    if (userData.two_factor_enabled) {
      return NextResponse.json({ error: "Two-factor authentication is already enabled" }, { status: 400 });
    }

    // Generate new secret
    const secret = speakeasy.generateSecret({
      name: `Restaurant Copilot (${user.email})`,
      issuer: "Restaurant Copilot",
      length: 32,
    });

    // Generate QR code
    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.base32,
      label: user.email? user.email : "user",
      issuer: "Restaurant Copilot",
      encoding: "base32",
    });

    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    // Store the secret temporarily (not enabled yet)
    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ two_factor_secret: secret.base32 })
      .eq("id", user.id);

    if (updateError) {
      return NextResponse.json({ error: "Failed to store secret" }, { status: 500 });
    }

    return NextResponse.json({
      secret: secret.base32,
      qrCode: qrCodeDataUrl,
      manualEntryKey: secret.base32,
    });

  } catch (error) {
    console.error("2FA setup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import {
  buildBranchDashboardUrl,
  buildRootControlUrl,
  getRootDashboardAccess,
} from "@/lib/server/organizations/root-dashboard";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { serialize } from "cookie";
import { TextEncoder } from "util";
import speakeasy from "speakeasy";

export async function POST(req: NextRequest) {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("JWT_SECRET not set");
    return new Response("Server error", { status: 500 });
  }

  const { token, code } = await req.json();
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(JWT_SECRET),
    );
    const userId = payload.userId as string;
    const restaurantId = payload.restaurantId as string;
    const subdomain = payload.subdomain as string;

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("two_factor_secret")
      .eq("id", userId)
      .single();
    if (error || !user?.two_factor_secret) {
      return new Response("Two-factor not configured", { status: 400 });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: "base32",
      token: code,
    });

    if (!verified) {
      return new Response("Invalid code", { status: 401 });
    }

    const { data: restaurant, error: restError } = await supabaseAdmin
      .from("restaurants")
      .select("subdomain, default_language")
      .eq("id", restaurantId)
      .single();
    if (restError || !restaurant?.subdomain) {
      return new Response("Restaurant not found", { status: 500 });
    }

    const authToken = await new SignJWT({
      userId,
      restaurantId,
      subdomain,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(new TextEncoder().encode(JWT_SECRET));

    const cookie = serialize("auth_token", authToken, {
      httpOnly: true,
      secure: process.env.NEXT_PRIVATE_DEVELOPMENT !== "true",
      sameSite: "lax",
      path: "/",
      domain:
        process.env.NEXT_PRIVATE_DEVELOPMENT === "true"
          ? "localhost"
          : "." + process.env.NEXT_PUBLIC_PRODUCTION_URL,
      maxAge: 60 * 60 * 24 * 7,
    });

    const rootDashboardAccess = await getRootDashboardAccess(userId);
    const redirectUrl = rootDashboardAccess
      ? buildRootControlUrl(restaurant.default_language)
      : buildBranchDashboardUrl(
          restaurant.subdomain,
          restaurant.default_language
        );

    const response = NextResponse.json({ success: true, redirectUrl });
    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (err) {
    console.error("2FA verification failed", err);
    return new Response("Invalid token", { status: 401 });
  }
}

import { NextResponse } from "next/server";
import { serialize } from "cookie";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    // Clear the custom auth token by setting an expired cookie
    console.log("Logging out user...");
    
    // Get Supabase client and sign out from Supabase session
    const supabase = await createClient();
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error("Error signing out from Supabase:", signOutError);
      // Continue with cookie clearing even if Supabase signout fails
    }
    
    // Clear the custom auth_token cookie
    const authTokenCookie = serialize("auth_token", "", {
      httpOnly: true,
      secure: process.env.NEXT_PRIVATE_DEVELOPMENT !== "true",
      sameSite: "lax",
      path: "/",
      domain: process.env.NEXT_PRIVATE_DEVELOPMENT === "true" ? "localhost" : "." + process.env.NEXT_PUBLIC_PRODUCTION_URL,
      maxAge: 0, // This makes the cookie expire immediately
    });

    const response = NextResponse.json({ 
      message: "Logged out successfully",
      success: true 
    });
    
    // Set the expired auth token cookie
    response.headers.set("Set-Cookie", authTokenCookie);
    
    return response;
  } catch (error) {
    console.error("Error during logout:", error);
    return NextResponse.json(
      { error: "Logout failed", success: false }, 
      { status: 500 }
    );
  }
}
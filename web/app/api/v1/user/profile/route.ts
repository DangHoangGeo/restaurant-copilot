import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function PUT(req: NextRequest) {
  try {
    const { name } = await req.json();

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }


    // Get authenticated user
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update user profile
    const { data, error: updateError } = await supabaseAdmin
      .from("users")
      .update({ name: name.trim() })
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Profile updated successfully",
      user: data
    });

  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

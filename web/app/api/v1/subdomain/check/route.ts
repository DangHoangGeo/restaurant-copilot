import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain") || "";
  if (!/^[a-z0-9-]{3,30}$/.test(subdomain)) {
	return NextResponse.json({ available: false, reason: "invalid_format" }, { status: 400 });
  }
  const { data, error: _error } = await supabaseAdmin
	.from("restaurants")
	.select("id")
	.eq("subdomain", subdomain)
	.single();
  console.error("Error checking subdomain availability:", _error);
  return NextResponse.json({ available: !data });
}

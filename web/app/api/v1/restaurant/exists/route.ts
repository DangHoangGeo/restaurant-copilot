import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const subdomain = req.nextUrl.searchParams.get("subdomain") || "";

  if (!subdomain) {
	return NextResponse.json({ exists: false, reason: "missing_subdomain" }, { status: 400 });
  }

  // Basic validation for subdomain format, though the middleware should handle most of this
  if (!/^[a-z0-9-]{3,30}$/.test(subdomain)) {
	return NextResponse.json({ exists: false, reason: "invalid_format" }, { status: 400 });
  }

  try {
	const { data, error } = await supabaseAdmin
	  .from("restaurants")
	  .select("id")
	  .eq("subdomain", subdomain)
	  .single();

	if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
	  console.error("Error checking restaurant existence:", error);
	  return NextResponse.json({ exists: false, reason: "database_error" }, { status: 500 });
	}

	return NextResponse.json({ exists: !!data });
  } catch (error) {
	console.error("Unexpected error checking restaurant existence:", error);
	return NextResponse.json({ exists: false, reason: "internal_server_error" }, { status: 500 });
  }
}

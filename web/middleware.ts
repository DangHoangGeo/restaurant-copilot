import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

const nextIntlMiddleware = createMiddleware(routing);

export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const parts = host.split(".");
  const subdomain = parts.length > 2 ? parts[0] : null;

  // If no subdomain (root domain), allow visit: signup, login, landing pages
  // Also allow if subdomain is "baoan.jp" (the root domain itself)
  if (!subdomain || subdomain === "baoan.jp") {
    return nextIntlMiddleware(req); // Pass to next-intl middleware
  }

  // Validate subdomain
  // Construct the URL for the API call carefully.
  // req.nextUrl.origin gives the protocol and host of the current request.
  const apiCheckUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}/api/v1/restaurant/exists?subdomain=${subdomain}`;
  const res = await fetch(apiCheckUrl);
  const { exists } = await res.json();

  if (!exists) {
    // Redirect to the root domain's 404 page
    return NextResponse.redirect(new URL("https://baoan.jp/404"));
  }

  // Attach subdomain to searchParams so downstream can read it
  req.nextUrl.searchParams.set("restaurant", subdomain);

  // Continue with next-intl middleware
  return nextIntlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|static|favicon.ico).*)"],
};

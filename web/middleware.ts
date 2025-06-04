import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

const nextIntlMiddleware = createMiddleware(routing);

const ROOT_DOMAIN = 'baoan.jp';
const W_ROOT_DOMAIN = 'www.baoan.jp';
export async function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  console.log("Middleware host:", host);
  // If we're on the root domain exactly, just pass to next-intl
  if (host === ROOT_DOMAIN || host === W_ROOT_DOMAIN) {
    return nextIntlMiddleware(req);
  }
  
  const parts = host.split(".");
  // Only consider it a subdomain if we have more than 2 parts AND 
  // the last two parts match our root domain
  const isSubdomain = parts.length > 2 && `${parts[parts.length-2]}.${parts[parts.length-1]}` === ROOT_DOMAIN;
  const subdomain = isSubdomain ? parts[0] : null;

  // If no subdomain, allow visit: signup, login, landing pages
  if (!subdomain) {
    return nextIntlMiddleware(req);
  }

  // Validate subdomain
  const apiCheckUrl = `${req.nextUrl.protocol}//${req.nextUrl.host}/api/v1/restaurant/exists?subdomain=${subdomain}`;
  const res = await fetch(apiCheckUrl);
  const { exists } = await res.json();

  if (!exists) {
    // Redirect to the root domain's 404 page
    return NextResponse.redirect(new URL(`https://${ROOT_DOMAIN}/404`));
  }

  // Attach subdomain to searchParams so downstream can read it
  req.nextUrl.searchParams.set("restaurant", subdomain);

  // Continue with next-intl middleware
  return nextIntlMiddleware(req);
}

export const config = {
  matcher: ["/((?!api|_next|static|favicon.ico).*)"],
};

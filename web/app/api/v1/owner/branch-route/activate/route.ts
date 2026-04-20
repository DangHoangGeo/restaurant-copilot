import { NextRequest, NextResponse } from 'next/server';
import { buildActiveBranchCookieHeader } from '@/lib/server/organizations/active-branch';
import { resolveScopedBranchRouteAccess } from '@/lib/server/organizations/branch-route';

function sanitizeNextPath(nextPath: string | null): string {
  if (!nextPath || !nextPath.startsWith('/')) {
    return '/';
  }

  if (nextPath.startsWith('//')) {
    return '/';
  }

  return nextPath;
}

export async function GET(request: NextRequest) {
  const restaurantId = request.nextUrl.searchParams.get('restaurantId');
  const nextPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'));

  if (!restaurantId) {
    return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
  }

  const access = await resolveScopedBranchRouteAccess(restaurantId);
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const response = NextResponse.redirect(new URL(nextPath, request.url));

  if (access.user.restaurantId !== restaurantId) {
    response.headers.set('Set-Cookie', buildActiveBranchCookieHeader(restaurantId));
  }

  return response;
}

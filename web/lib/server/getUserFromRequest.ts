import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { TextEncoder } from 'util';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET environment variable is not set. Cannot verify JWT.");
  // Depending on how this function is used, throwing might be too disruptive.
  // Returning null effectively invalidates any token, which is a safe fallback.
  // Consider if a more explicit error throw is needed if this function MUST always have a secret.
  // For the purpose of this function, JWT_SECRET being undefined will lead to an error
  // in TextEncoder().encode(), which is caught and results in null, achieving the fallback.
}

export interface AuthUser {
  userId: string;
  restaurantId: string;
  subdomain: string;
  exp: number;
}

export async function getUserFromRequest(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  if (!token) return null;

  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return {
      userId: payload.userId as string,
      restaurantId: payload.restaurantId as string,
      subdomain: payload.subdomain as string,
      exp: payload.exp as number,
    } as AuthUser;
  } catch (error) {
    console.error('JWT verification failed with jose:', error);
    return null;
  }
}

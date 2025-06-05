import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { TextEncoder } from 'util';

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

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

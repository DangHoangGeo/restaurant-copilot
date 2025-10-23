// Platform Admin Middleware and Utilities
// Provides authentication and authorization for platform-level operations

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Check if the current user is a platform admin
 */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return false;
  }

  const { data, error } = await supabase
    .from('platform_admins')
    .select('id, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  return !error && !!data;
}

/**
 * Get platform admin details for the current user
 */
export async function getPlatformAdmin() {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data, error } = await supabase
    .from('platform_admins')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Middleware to require platform admin authentication
 * Use this in API routes to ensure only platform admins can access
 */
export async function requirePlatformAdmin(request: NextRequest) {
  const isAdmin = await isPlatformAdmin();

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized. Platform admin access required.' },
      { status: 403 }
    );
  }

  return null; // Allow request to proceed
}

/**
 * Log a platform admin action to the audit trail
 */
export async function logPlatformAction(
  action: string,
  resourceType: string,
  resourceId?: string,
  restaurantId?: string,
  changes?: Record<string, unknown>
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('log_platform_action', {
    p_action: action,
    p_resource_type: resourceType,
    p_resource_id: resourceId || null,
    p_restaurant_id: restaurantId || null,
    p_changes: changes || null
  });

  if (error) {
    console.error('Failed to log platform action:', error);
  }

  return data;
}

/**
 * Type-safe wrapper for platform admin API responses
 */
export function platformApiResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Type-safe wrapper for platform admin API errors
 */
export function platformApiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createApiSuccess } from '@/lib/server/apiError';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { checkAuthorization } from '@/lib/server/rolePermissions';
import { protectEndpoint, RATE_LIMIT_CONFIGS } from '@/lib/server/rateLimit';
import { handleApiError } from '@/lib/server/apiError';
import { tableCreateSchema } from '@/shared/schemas/owner';
import { randomUUID } from "crypto";

// GET handler
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();
  let user: AuthUser | null = null;

  try {
    // 1. Rate Limiting & CSRF Protection
    const protectionError = await protectEndpoint(req, RATE_LIMIT_CONFIGS.QUERY, 'tables', requestId);
    if (protectionError) {
      return protectionError;
    }

    // 2. Authentication
    user = await getUserFromRequest();
    if (!user || !user.restaurantId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated or missing restaurant ID',
          requestId,
        },
      }, { status: 401 });
    }

    // 3. Authorization
    const authError = await checkAuthorization(user, 'tables', 'SELECT');
    if (authError) {
      return authError;
    }

    const { data: tables, error } = await supabaseAdmin
      .from('tables')
      .select('id, name, status, capacity, is_outdoor, is_accessible, notes, qr_code, qr_code_created_at')
      .eq('restaurant_id', user.restaurantId)
      .order('name');

    if (error) {
      throw new Error(`Error fetching tables: ${error.message}`);
    }

    return NextResponse.json(createApiSuccess({ tables }, requestId), { status: 200 });

  } catch (error) {
    return await handleApiError(
      error,
      'tables-select',
      user?.restaurantId || undefined,
      user?.userId,
      requestId
    );
  }
}

// POST handler
export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();
  let user: AuthUser | null = null;

  try {
    // 1. Rate Limiting & CSRF Protection
    const protectionError = await protectEndpoint(req, RATE_LIMIT_CONFIGS.MUTATION, 'tables', requestId);
    if (protectionError) {
      return protectionError;
    }

    // 2. Authentication
    user = await getUserFromRequest();
    if (!user || !user.restaurantId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated or missing restaurant ID',
          requestId,
        },
      }, { status: 401 });
    }

    // 3. Authorization
    const authError = await checkAuthorization(user, 'tables', 'INSERT');
    if (authError) {
      return authError;
    }

    // 4. Validate request data
    const requestData = await req.json();
    const validationResult = tableCreateSchema.safeParse(requestData);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            requestId,
            details: validationResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const { name, capacity } = validationResult.data;

    const insertData: Record<string, unknown> = {
      restaurant_id: user.restaurantId,
      name,
      qr_code: randomUUID(), // Always generate a new QR code for new tables
      qr_code_created_at: new Date().toISOString(),
    };

    if (capacity !== undefined && capacity !== null) {
      insertData.capacity = capacity;
    }

    const { data, error } = await supabaseAdmin
      .from('tables')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // unique_violation
        throw new Error('A table with this name already exists.');
      }
      throw new Error(`Failed to create table: ${error.message}`);
    }

    return NextResponse.json(createApiSuccess({ table: data }, requestId), { status: 201 });

  } catch (error) {
    return await handleApiError(
      error,
      'tables-insert',
      user?.restaurantId || undefined,
      user?.userId,
      requestId
    );
  }
}

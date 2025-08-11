import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createApiSuccess } from '@/lib/server/apiError';
import { createApiHandler, ApiHandlerContext } from '@/lib/server/apiHandler';
import { tableCreateSchema, TableCreateData } from '@/shared/schemas/owner';
import { randomUUID } from "crypto";

// Refactored GET handler
export const GET = createApiHandler(
  {
    resource: 'tables',
    operation: 'SELECT',
  },
  async ({ user, requestId }: ApiHandlerContext<never>) => {
    const { data: tables, error } = await supabaseAdmin
      .from('tables')
      .select('id, name, status, capacity, is_outdoor, is_accessible, notes, qr_code, qr_code_created_at')
      .eq('restaurant_id', user.restaurantId)
      .order('name');

    if (error) {
      throw new Error(`Error fetching tables: ${error.message}`);
    }

    return NextResponse.json(createApiSuccess({ tables }, requestId), { status: 200 });
  }
);

// Refactored POST handler
export const POST = createApiHandler(
  {
    schema: tableCreateSchema,
    resource: 'tables',
    operation: 'INSERT',
  },
  async ({ user, validatedData, requestId }: ApiHandlerContext<TableCreateData>) => {
    const { name, capacity } = validatedData;

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
  }
);

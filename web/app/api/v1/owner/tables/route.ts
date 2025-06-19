import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { randomUUID } from "crypto";

const tableSchema = z.object({
  name: z.string().min(1).max(50),
  capacity: z.number().min(1).optional().default(1),
  status: z.enum(['available', 'occupied', 'reserved']).optional().default('available'),
  isOutdoor: z.boolean().optional().default(false),
  isAccessible: z.boolean().optional().default(false),
  notes: z.string().optional().default('').nullable(),
  qrCode: z.string().optional().default('').nullable(),
  qrCodeCreatedAt: z.string().optional().nullable(),
});

export async function GET() {
  const user = await getUserFromRequest();
    
    if (!user?.restaurantId) {
      return NextResponse.json(
        { error: "Restaurant ID not found" },
        { status: 401 }
      );
    }
  const restaurantId = user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing restaurant ID' }, { status: 401 });
  }
  try {
    const { data: tables, error } = await supabaseAdmin
      .from('tables')
      .select('id, name , status, capacity, is_outdoor, is_accessible, notes, qr_code, qr_code_created_at')
      .eq('restaurant_id', restaurantId)
      .order('name');

    if (error) {
      console.error('Error fetching tables:', error);
      return NextResponse.json({ message: 'Error fetching tables', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ tables }, { status: 200 });
  } catch (error) {
    console.error('API Error in GET tables:', error);
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = tableSchema.safeParse(body);

    if (!validated.success) {
      console.error('Validation error:', validated.error);
      return NextResponse.json({ errors: validated.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name,  capacity, status, isOutdoor, isAccessible, notes, qrCode, qrCodeCreatedAt } = validated.data;
    const insertData: Record<string, unknown> = {
      restaurant_id: user.restaurantId,
      name,
    };

    if (capacity !== undefined) insertData.capacity = capacity;
    if (status !== undefined) insertData.status = status;
    if (isOutdoor !== undefined) insertData.is_outdoor = isOutdoor;
    if (isAccessible !== undefined) insertData.is_accessible = isAccessible;
    if (notes !== undefined) insertData.notes = notes;
    
    // Handle QR code and creation timestamp
    if (!qrCode || qrCode.trim() === '') {
      const randomCode = randomUUID();
      insertData.qr_code = randomCode;
      insertData.qr_code_created_at = qrCodeCreatedAt || new Date().toISOString();
    } else if (qrCode && qrCode.trim() !== '') {
      // If qrCode is provided, use it directly
      insertData.qr_code = qrCode;
      insertData.qr_code_created_at = qrCodeCreatedAt || new Date().toISOString();
    }
    
    const { data, error } = await supabaseAdmin
      .from('tables')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating table:', error);
      return NextResponse.json({ message: 'Error creating table', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ table: data }, { status: 201 });
  } catch (error) {
    console.error('API Error in POST tables:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validation error', errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

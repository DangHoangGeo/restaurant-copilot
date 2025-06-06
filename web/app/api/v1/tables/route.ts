import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest, AuthUser } from '@/lib/server/getUserFromRequest';

const tableSchema = z.object({
  name: z.string().min(1).max(50),
  positionX: z.number().optional(),
  positionY: z.number().optional(),
});

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  try {
    const { data: tables, error } = await supabase
      .from('tables')
      .select('id, name, position_x, position_y')
      .eq('restaurant_id', user.restaurantId)
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
  const supabase = createRouteHandlerClient({ cookies });
  const user: AuthUser | null = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized: Missing user or restaurant ID' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validated = tableSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json({ errors: validated.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, positionX, positionY } = validated.data;
    const insertData: Record<string, unknown> = {
      restaurant_id: user.restaurantId,
      name,
    };

    if (positionX !== undefined) insertData.position_x = positionX;
    if (positionY !== undefined) insertData.position_y = positionY;

    const { data, error } = await supabase
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

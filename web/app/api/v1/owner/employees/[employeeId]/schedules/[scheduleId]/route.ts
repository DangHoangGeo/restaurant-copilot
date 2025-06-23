import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';

const updateSchema = z.object({
  work_date: z.string().optional(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ employeeId: string; scheduleId: string }> }) {
  const { scheduleId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const json = await req.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const { data, error } = await supabaseAdmin
    .from('schedules')
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq('id', scheduleId)
    .eq('restaurant_id', user.restaurantId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ employeeId: string; scheduleId: string }> }) {
  const { scheduleId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { error } = await supabaseAdmin
    .from('schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('restaurant_id', user.restaurantId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

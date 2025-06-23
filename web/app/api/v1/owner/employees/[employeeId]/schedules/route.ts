import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';

const scheduleSchema = z.object({
  work_date: z.string(),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const week = req.nextUrl.searchParams.get('week');
  const { data, error } = await supabaseAdmin
    .from('schedules')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .eq('employee_id', employeeId)
    .gte('work_date', week ? `${week}-1` : undefined)
    .lte('work_date', week ? `${week}-7` : undefined)
    .order('work_date');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ schedules: data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const json = await req.json();
  const listSchema = z.array(scheduleSchema);
  const parsed = listSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  }
  const rows = parsed.data.map((s) => ({
    restaurant_id: user.restaurantId,
    employee_id: employeeId,
    work_date: s.work_date,
    start_time: s.start_time,
    end_time: s.end_time,
    created_by: user.userId,
  }));
  const { data, error } = await supabaseAdmin.from('schedules').insert(rows).select();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ schedules: data }, { status: 201 });
}

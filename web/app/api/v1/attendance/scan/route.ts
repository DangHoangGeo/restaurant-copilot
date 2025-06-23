import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { z } from 'zod';

const schema = z.object({ employeeId: z.string().uuid(), qrToken: z.string() });

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
  const { employeeId } = parsed.data;
  const today = new Date().toISOString().slice(0, 10);

  const { data: emp } = await supabaseAdmin
    .from('employees')
    .select('restaurant_id')
    .eq('id', employeeId)
    .single();
  const restaurantId = emp?.restaurant_id || null;

  const { data: existing } = await supabaseAdmin
    .from('attendance_records')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('work_date', today)
    .single();
  if (!existing) {
    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .insert({ employee_id: employeeId, restaurant_id: restaurantId, work_date: today, check_in_time: new Date().toISOString() })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }
  if (!existing.check_out_time) {
    const checkIn = existing.check_in_time ? new Date(existing.check_in_time) : new Date();
    const diff = (Date.now() - checkIn.getTime()) / 3600000;
    const { data, error } = await supabaseAdmin
      .from('attendance_records')
      .update({ check_out_time: new Date().toISOString(), hours_worked: diff })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }
  return NextResponse.json(existing);
}

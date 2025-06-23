import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(req: NextRequest, { params }: { params: Promise<{ employeeId: string }> }) {
  const { employeeId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const month = req.nextUrl.searchParams.get('month');
  const from = month ? `${month}-01` : undefined;
  const to = month ? `${month}-31` : undefined;
  const { data, error } = await supabaseAdmin
    .from('attendance_records')
    .select('*')
    .eq('restaurant_id', user.restaurantId)
    .eq('employee_id', employeeId)
    .gte('work_date', from)
    .lte('work_date', to)
    .order('work_date');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ records: data });
}

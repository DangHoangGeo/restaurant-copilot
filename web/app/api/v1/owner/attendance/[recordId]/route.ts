import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ recordId: string }> }) {
  const { recordId } = await params;
  const user = await getUserFromRequest();
  if (!user?.restaurantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from('attendance_records')
    .update({ status: 'checked', verified_by: user.userId, verified_at: new Date().toISOString() })
    .eq('id', recordId)
    .eq('restaurant_id', user.restaurantId)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

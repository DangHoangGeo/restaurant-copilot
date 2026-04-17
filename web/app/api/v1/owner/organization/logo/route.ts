import { NextResponse } from 'next/server';
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from '@/lib/server/authorization/service';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.canChangeOrgSettings()) {
    return forbidden('Requires organization_settings permission');
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are supported' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be 5MB or smaller' }, { status: 400 });
    }

    const extension = file.name.split('.').pop() || 'png';
    const path = `organizations/${ctx!.organization.id}/branding/logo_${Date.now()}.${extension}`;
    const buffer = new Uint8Array(await file.arrayBuffer());

    const { data, error } = await supabaseAdmin.storage
      .from('restaurant-uploads')
      .upload(path, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error || !data) {
      console.error('Organization logo upload failed:', error);
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from('restaurant-uploads')
      .getPublicUrl(data.path);

    return NextResponse.json({
      success: true,
      url: publicUrl.publicUrl,
      path: data.path,
    });
  } catch (error) {
    console.error('Organization logo route error:', error);
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
  }
}

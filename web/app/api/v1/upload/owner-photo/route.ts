import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest();
    if (!user?.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const photo = formData.get('photo') as File;

    if (!photo) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    // Validate file type
    if (!photo.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (max 5MB)
    if (photo.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const extension = photo.name.split('.').pop();
    const fileName = `owner-photo-${timestamp}.${extension}`;
    const filePath = `restaurants/${user.restaurantId}/owner/${fileName}`;

    // Upload to Supabase Storage
    const {  error: uploadError } = await supabaseAdmin.storage
      .from('restaurant-uploads')
      .upload(filePath, photo, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      await logger.error('upload_owner_photo', 'Upload error', {
        restaurantId: user.restaurantId,
        error: uploadError.message
      });
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('restaurant-uploads')
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return NextResponse.json({ error: 'Failed to get photo URL' }, { status: 500 });
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath,
      fileName
    });

  } catch (error) {
    await logger.error('upload_owner_photo', 'Unexpected error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

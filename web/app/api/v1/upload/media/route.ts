import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * API endpoint for uploading media files during onboarding
 * POST /api/v1/upload/media
 */
export async function POST(request: NextRequest) {
  const user = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!['logo', 'owner-photo', 'gallery'].includes(type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Invalid file format' }, { status: 400 });
    }

    // Generate file path based on type
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    let filePath: string;

    switch (type) {
      case 'logo':
        filePath = `restaurants/${user.restaurantId}/onboarding/logo_${timestamp}.${fileExtension}`;
        break;
      case 'owner-photo':
        filePath = `restaurants/${user.restaurantId}/onboarding/owner_${timestamp}.${fileExtension}`;
        break;
      case 'gallery':
        filePath = `restaurants/${user.restaurantId}/onboarding/gallery_${timestamp}.${fileExtension}`;
        break;
      default:
        throw new Error('Invalid file type');
    }

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from('restaurant-uploads')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error('Supabase upload error:', error);
      throw error;
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('restaurant-uploads')
      .getPublicUrl(data.path);

    return NextResponse.json({ 
      url: urlData.publicUrl,
      path: data.path 
    });

  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

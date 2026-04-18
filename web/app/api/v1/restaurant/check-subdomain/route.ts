import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('subdomain');

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain is required' },
        { status: 400 }
      );
    }

    // Validate subdomain format
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomain) || subdomain.length < 3 || subdomain.length > 50) {
      return NextResponse.json(
        { available: false, error: 'Invalid subdomain format' },
        { status: 400 }
      );
    }

    // Check for reserved subdomains
    const reservedSubdomains = [
      'www', 'api', 'admin', 'app', 'mail', 'ftp', 'blog', 'shop', 'store',
      'support', 'help', 'docs', 'cdn', 'static', 'assets', 'img', 'images',
      'js', 'css', 'dev', 'test', 'staging', 'prod', 'production'
    ];

    if (reservedSubdomains.includes(subdomain.toLowerCase())) {
      return NextResponse.json({
        available: false,
        error: 'This subdomain is reserved'
      });
    }

    const supabase = await createClient();

    const [{ data: existingRestaurant, error: restaurantError }, { data: existingOrganization, error: organizationError }] = await Promise.all([
      supabase
        .from('restaurants')
        .select('id')
        .eq('subdomain', subdomain)
        .maybeSingle(),
      supabase
        .from('owner_organizations')
        .select('id')
        .or(`public_subdomain.eq.${subdomain},slug.eq.${subdomain}`)
        .maybeSingle(),
    ]);

    if (restaurantError) {
      console.error('Error checking restaurant subdomain availability:', restaurantError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    if (organizationError) {
      console.error('Error checking organization subdomain availability:', organizationError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    const available = !existingRestaurant && !existingOrganization;

    return NextResponse.json({
      available,
      subdomain,
      ...(available ? {} : { error: 'Subdomain already taken' })
    });

  } catch (error) {
    console.error('Error in check-subdomain endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

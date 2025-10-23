// Supabase Edge Function: Daily Usage Snapshot Calculation
// Scheduled via Supabase cron to run daily at 1 AM
// Calculates usage metrics for all active restaurants

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Restaurant {
  id: string;
  name: string;
}

Deno.serve(async (req) => {
  try {
    // Get Supabase client with service role key for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get target date from query params or use yesterday (since this runs at 1 AM)
    const url = new URL(req.url);
    const targetDate = url.searchParams.get('date') ||
      new Date(Date.now() - 86400000).toISOString().split('T')[0]; // Yesterday

    console.log(`Calculating usage snapshots for ${targetDate}`);

    // Get all active restaurants
    const { data: restaurants, error: restaurantsError } = await supabase
      .from('restaurants')
      .select('id, name')
      .eq('is_active', true);

    if (restaurantsError) {
      throw new Error(`Failed to fetch restaurants: ${restaurantsError.message}`);
    }

    if (!restaurants || restaurants.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active restaurants found', processed: 0 }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    console.log(`Found ${restaurants.length} active restaurants`);

    // Process each restaurant
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const restaurant of restaurants) {
      try {
        // Call the database function to calculate snapshot
        const { error: calcError } = await supabase.rpc(
          'calculate_daily_usage_snapshot',
          {
            rest_id: restaurant.id,
            target_date: targetDate
          }
        );

        if (calcError) {
          console.error(
            `Error calculating snapshot for ${restaurant.name}:`,
            calcError
          );
          errorCount++;
          results.push({
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
            status: 'error',
            error: calcError.message
          });
        } else {
          successCount++;
          results.push({
            restaurant_id: restaurant.id,
            restaurant_name: restaurant.name,
            status: 'success'
          });
        }
      } catch (error) {
        console.error(
          `Exception processing ${restaurant.name}:`,
          error
        );
        errorCount++;
        results.push({
          restaurant_id: restaurant.id,
          restaurant_name: restaurant.name,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    console.log(
      `Completed: ${successCount} successful, ${errorCount} errors`
    );

    return new Response(
      JSON.stringify({
        success: true,
        date: targetDate,
        total_restaurants: restaurants.length,
        processed: successCount,
        errors: errorCount,
        results: results
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Fatal error in daily-usage-snapshot:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

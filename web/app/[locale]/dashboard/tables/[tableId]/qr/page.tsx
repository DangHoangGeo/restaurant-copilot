import QrCodeDisplayPageClient from '@/components/QrCodeDisplayPageClient';
import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { Suspense } from "react";

// Mocked/Placeholder function - replace with actual implementation
async function getRestaurantId(searchParams: { [key: string]: string | string[] | undefined }): Promise<string | null> {
  if (searchParams && typeof searchParams.restaurantId === 'string') {
    return searchParams.restaurantId;
  }
  console.warn("restaurantId not found in searchParams for QR page. Defaulting to mock ID.");
  return "mock-restaurant-id-123"; // Fallback for now
}

interface QrPageProps {
  params: { locale: string; tableId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}

// Helper component to handle async data fetching and rendering
async function QrCodeLoader({ params, searchParams }: QrPageProps) {
  const supabase = createServerActionClient({ cookies });
  const { locale, tableId } = params;
  const restaurantId = await getRestaurantId(searchParams);

  if (!restaurantId) {
    return <div className="text-red-600 p-4">Error: Restaurant ID is required. Please ensure &apos;restaurantId&apos; is in the URL query parameters.</div>;
  }
  if (!tableId) {
    return <div className="text-red-600 p-4">Error: Table ID is required.</div>;
  }

  // Fetch table name
  const { data: tableData, error: tableError } = await supabase
    .from("tables")
    .select("name")
    .eq("id", tableId)
    .eq("restaurant_id", restaurantId)
    .single();

  if (tableError) {
    console.error("Error fetching table name:", tableError);
    return <div className="text-red-600 p-4">Error loading table data: {tableError.message}.</div>;
  }
  if (!tableData) {
    return <div className="text-red-600 p-4">Table not found or does not belong to this restaurant.</div>;
  }

  // Fetch restaurant subdomain
  // Assuming 'subdomain' is a column in your 'restaurants' table
  const { data: restaurantData, error: restaurantError } = await supabase
    .from("restaurants")
    .select("subdomain") // Make sure this column exists
    .eq("id", restaurantId)
    .single();

  if (restaurantError) {
    console.error("Error fetching restaurant subdomain:", restaurantError);
    return <div className="text-red-600 p-4">Error loading restaurant data: {restaurantError.message}.</div>;
  }
  if (!restaurantData || !restaurantData.subdomain) {
    // If subdomain can be null or empty, handle accordingly.
    // For now, assume it's required for the QR URL.
    return <div className="text-red-600 p-4">Restaurant subdomain not found or is not set. Cannot generate QR code.</div>;
  }

  return (
    <QrCodeDisplayPageClient
      tableId={tableId}
      tableName={tableData.name}
      locale={locale}
      restaurantSubdomain={restaurantData.subdomain}
      restaurantIdQueryParam={restaurantId} // Pass this for the "Back to Tables" link
    />
  );
}

export default async function QrCodePage({ params, searchParams }: QrPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div className="text-center py-10 text-lg">Loading QR Code details...</div>}>
        <QrCodeLoader params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

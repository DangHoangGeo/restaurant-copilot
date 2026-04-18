'use client';

import { useState, ReactNode, useMemo } from 'react';
import { AdminHeader } from '@/components/features/admin/dashboard/layout/admin-header';
import { AdminSidebar } from '@/components/features/admin/dashboard/layout/admin-sidebar';
import { AdminBottomNav } from '@/components/features/admin/dashboard/layout/admin-bottom-nav';
import { RestaurantProvider, RestaurantSettings } from '@/contexts/RestaurantContext';
import { createThemeProperties, sanitizeHexColor } from '@/lib/utils/colors';

interface AdminLayoutClientProps {
  children: ReactNode;
  restaurantSettings: { 
    name: string; 
    logoUrl: string | null; 
    subdomain?: string; 
    primaryColor?: string; 
    onboarded?: boolean;
    owner_story_en?: string;
    owner_story_ja?: string | null;
    owner_story_vi?: string | null;
    owner_photo_url?: string | null;
  };
  locale: string ;
  ownerControlHref?: string | null;
}

export function AdminLayoutClient({
  children,
  restaurantSettings,
  locale,
  ownerControlHref,
}: AdminLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState(locale);

  // Create safe theme properties
  const themeProperties = useMemo(() => {
    if (!restaurantSettings.primaryColor) return {};
    return createThemeProperties(restaurantSettings.primaryColor);
  }, [restaurantSettings.primaryColor]);

  // Transform layout restaurant settings to full settings format for context
  const fullRestaurantSettings: RestaurantSettings = {
    id: '', // Will be populated by context when it fetches full data
    name: restaurantSettings.name,
    subdomain: restaurantSettings.subdomain || '',
    branch_code: (restaurantSettings as { branch_code?: string | null }).branch_code ?? null,
    company_public_subdomain: (restaurantSettings as { company_public_subdomain?: string | null }).company_public_subdomain ?? null,
    default_language: null, // Will be populated by context
    brand_color: restaurantSettings.primaryColor || null,
    tax: null, // Will be populated by context
    address: null,
    phone: null,
    email: null,
    website: null,
    opening_hours: null,
    description_en: null,
    description_ja: null,
    description_vi: null,
    social_links: null,
    currency: null,
    payment_methods: null,
    delivery_options: null,
    logo_url: restaurantSettings.logoUrl,
    onboarded: restaurantSettings.onboarded || false,
    hero_title_en: null,
    hero_title_ja: null,
    hero_title_vi: null,
    hero_subtitle_en: null,
    hero_subtitle_ja: null,
    hero_subtitle_vi: null,
    owner_story_en: restaurantSettings.owner_story_en || '',
    owner_story_ja: restaurantSettings.owner_story_ja || null,
    owner_story_vi: restaurantSettings.owner_story_vi || null,
    owner_photo_url: restaurantSettings.owner_photo_url || null
  };

  return (
    <RestaurantProvider initialSettings={fullRestaurantSettings}>
      <div 
        className="flex h-screen bg-background text-foreground"
        style={themeProperties}
        data-theme-color={sanitizeHexColor(restaurantSettings.primaryColor)}
      >
        
        <AdminSidebar
          restaurantSettings={restaurantSettings}
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
        />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <AdminHeader
            toggleSidebar={() => setIsSidebarOpen(prev => !prev)}
            restaurantSettings={restaurantSettings}
            currentLocale={selectedLocale}
            onLocaleChange={setSelectedLocale}
            ownerControlHref={ownerControlHref}
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20">
            {children}
          </main>
          <AdminBottomNav />
        </div>
      </div>
    </RestaurantProvider>
  );
}

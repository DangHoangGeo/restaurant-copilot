'use client';

import { useState, ReactNode } from 'react';
import { AdminHeader } from '@/components/features/admin/dashboard/layout/admin-header';
import { AdminSidebar } from '@/components/features/admin/dashboard/layout/admin-sidebar';
import { RestaurantProvider, RestaurantSettings } from '@/contexts/RestaurantContext';
import { cn } from '@/lib/utils';

interface AdminLayoutClientProps {
  children: ReactNode;
  restaurantSettings: { 
    name: string; 
    logoUrl: string | null; 
    subdomain?: string; 
    primaryColor?: string; 
  };
  locale: string ;
}

export function AdminLayoutClient({ children, restaurantSettings, locale }: AdminLayoutClientProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState(locale);

  // Transform layout restaurant settings to full settings format for context
  const fullRestaurantSettings: RestaurantSettings = {
    id: '', // Will be populated by context when it fetches full data
    name: restaurantSettings.name,
    subdomain: restaurantSettings.subdomain || '',
    default_language: null, // Will be populated by context
    brand_color: restaurantSettings.primaryColor || null,
    contact_info: null, // Will be populated by context
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
    onboarded: null,
    hero_title_en: null,
    hero_title_ja: null,
    hero_title_vi: null,
    hero_subtitle_en: null,
    hero_subtitle_ja: null,
    hero_subtitle_vi: null
  };

  return (
    <RestaurantProvider initialSettings={fullRestaurantSettings}>
      <div className={cn(
        "flex h-screen bg-background text-foreground",
        restaurantSettings.primaryColor ? `theme-${restaurantSettings.subdomain}` : ''
      )}>
        {/* Inject dynamic theme variables if needed */}
        <style jsx global>{`
          ${restaurantSettings.primaryColor && restaurantSettings.subdomain ? `
            .theme-${restaurantSettings.subdomain} {
              --brand-color: ${restaurantSettings.primaryColor};
              --primary: ${restaurantSettings.primaryColor};
            }
          ` : ''}
        `}</style>
        
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
          />
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </RestaurantProvider>
  );
}
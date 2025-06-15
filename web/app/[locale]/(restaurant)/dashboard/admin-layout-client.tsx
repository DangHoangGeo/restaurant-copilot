'use client';

import { useState, ReactNode } from 'react';
import { AdminHeader } from '@/components/layout/admin-header';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
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

  return (
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
  );
}
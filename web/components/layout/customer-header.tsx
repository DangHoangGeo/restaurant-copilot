"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import LanguageSwitcher from "@/components/shared/language-switcher"; // Assuming this exists
import { useLocale } from "next-intl";

interface CustomerHeaderProps {
  restaurantSettings: {
    name: string;
    logoUrl: string | null;
    primaryColor: string;
  };
  cartItemCount: number;
}

export default function CustomerHeader({
  restaurantSettings,
  cartItemCount,
}: CustomerHeaderProps) {
  const locale = useLocale();

  return (
    <header
      className="sticky top-0 z-50 w-full border-b"
      style={{ backgroundColor: restaurantSettings.primaryColor, color: 'white' }} // Adjust text color based on primaryColor contrast
    >
      <div className="container flex h-16 items-center justify-between">
        <Link href={`/${locale}/customer`} className="flex items-center gap-2">
          {restaurantSettings.logoUrl ? (
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={restaurantSettings.logoUrl}
                alt={restaurantSettings.name}
              />
              <AvatarFallback>
                {restaurantSettings.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center text-black">
              {restaurantSettings.name.charAt(0)}
            </div>
          )}
          <span className="font-semibold text-lg">{restaurantSettings.name}</span>
        </Link>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Button
            variant="ghost"
            size="icon"
            asChild
            style={{ color: 'white' }} // Ensure icon color contrasts with primaryColor
          >
            <Link href={`/${locale}/customer/checkout`}>
              <ShoppingCart className="h-6 w-6" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
              <span className="sr-only">Cart</span>
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

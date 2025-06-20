"use client";
import React, { useState, useEffect } from "react";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  CalendarDays,
  Award,
  Menu as MenuIcon,
  Star,
} from "lucide-react";
import { Button,  Icon } from "../../../home";
import { useTranslations } from "next-intl";
import { CustomerHeader } from "../layout/CustomerHeader";
import { CustomerFooter } from "../layout/CustomerFooter";
import Image from "next/image";
import { Card } from "@/components/ui/card";

function getToday() {
  const days = [
    "sunday", "monday", "tuesday", "wednesday",
    "thursday", "friday", "saturday",
  ];
  return days[new Date().getDay()];
}

function isOpenNow(hours: Record<string, { isClosed?: boolean; openTime?: string; closeTime?: string }>): { open: boolean; closesAt?: string } {
  const now = new Date();
  const today = getToday();
  const todayHours = hours?.[today];
  if (!todayHours || todayHours.isClosed) return { open: false };
  const [h, m] = todayHours.openTime?.split(":") ?? [0, 0];
  const [ch, cm] = todayHours.closeTime?.split(":") ?? [23, 59];
  const openMinutes = Number(h) * 60 + Number(m);
  const closeMinutes = Number(ch) * 60 + Number(cm);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return {
    open: nowMinutes >= openMinutes && nowMinutes < closeMinutes,
    closesAt: todayHours.closeTime,
  };
}

interface RestaurantHomepageProps {
  subdomain: string;
  locale: string;
}

interface RestaurantData {
  restaurant: {
    id: string;
    name: string;
    subdomain: string;
    logoUrl?: string | null;
    defaultLocale?: string;
    contactInfo?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    description_en?: string | null;
    description_ja?: string | null;
    description_vi?: string | null;
    opening_hours?: Record<string, string>;
    social_links?: Record<string, string>;
    timezone?: string;
    currency?: string;
    payment_methods?: string[];
    delivery_options?: string[];
    primaryColor?: string;
    secondaryColor?: string;
	reviews?: number;
	rating?: number;
  };
  menu: Array<{
    id: string;
    name_en: string;
    name_ja: string;
    name_vi: string;
	imageUrl?: string;
	emoji?: string;
    menu_items?: Array<{
      id: string;
      name_en: string;
      name_ja: string;
      name_vi: string;
    }>;
  }>;
}

const googleMapsPlaceUrl =
  "https://www.google.com/maps/place/Your+Restaurant/@35.6895,139.6917,17z/data=!4m7!3m6!1s0x60188cfdabcd1234:0xabc1234567890def!8m2!3d35.6895!4d139.6917!9m1!1b1!16s%2Fg%2F11abcxyz"; // <-- update this with your Maps URL

const googleRating = 4.6;
const googleReviewCount = 211;

// Restaurant Homepage Component - shown when subdomain is detected
export const RestaurantHomepage = ({ subdomain, locale }: RestaurantHomepageProps) => {
  const [restaurantData, setRestaurantData] = useState<RestaurantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const tCustomer = useTranslations("customer.home");
  const tCommon = useTranslations("common");
  const [selectedLocale, setSelectedLocale] = useState(locale);

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/v1/restaurant/data?subdomain=${subdomain}`
        );
        if (!response.ok) throw new Error("Restaurant not found");
        const data = await response.json();
        setRestaurantData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load restaurant");
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurantData();
  }, [subdomain]);

  useEffect(() => {
	  if (restaurantData?.restaurant?.primaryColor) {
		document.documentElement.style.setProperty('--brand-color', restaurantData.restaurant.primaryColor);
	  }
	}, [restaurantData]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-slate-600">{tCommon("loading")}</p>
      </div>
    );

  if (error || !restaurantData)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <h1 className="text-3xl font-bold mb-4 text-slate-800">
            {tCustomer("restaurant_not_found")}
          </h1>
          <Button href="/" variant="primary">
            {tCommon("go_to_homepage")}
          </Button>
        </div>
      </div>
    );

  const { restaurant, menu } = restaurantData;
  const primaryColor = restaurant.primaryColor || "#3B82F6";
  const openingHours = (() => {
    try {
      return typeof restaurant.opening_hours === "string"
        ? JSON.parse(restaurant.opening_hours)
        : restaurant.opening_hours;
    } catch {
      return {};
    }
  })();
  const today = getToday();
  const { open, closesAt } = isOpenNow(openingHours);

  // For social proof demo:
  const reviews = restaurant.reviews ?? 92;
  const rating = restaurant.rating ?? 4.8;

  return (
    <div
      className="min-h-screen bg-slate-50 relative pb-24"
      style={{ '--brand-color': primaryColor } as React.CSSProperties}
    >
      {/* Header */}
      <CustomerHeader
        restaurantSettings={restaurant}
        onCartClick={() => {}}
        currentLocale={selectedLocale}
        onLocaleChange={setSelectedLocale}
        onOrderHistoryClick={() => {}}
        cartItemCount={0}
        showOrderHistory={false}
      />

      {/* Main Section */}
      <section className="px-4 pt-4 pb-2">
        {/* Restaurant Title/Logo/Status */}
        <div className="flex items-center gap-3 mb-2">
          {restaurant.logoUrl && (
            <Image
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="h-12 w-12 rounded-lg border shadow"
            />
          )}
          <div>
            <div className="flex items-center gap-1">
              <span className="font-bold text-2xl">{restaurant.name}</span>
              <span
                className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  open ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                }`}
              >
                {open ? "Open Now" : "Closed"}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-slate-500">
              <Icon name={MapPin} size={14} />
              {restaurant.address}
            </div>
          </div>
        </div>

        {/* Social proof */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <Star className="text-amber-400 h-4 w-4" />
          <span className="font-bold">{rating}</span>
          <span className="text-slate-400">({reviews} reviews)</span>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-4">
          <Button
            href={`/${locale}/menu`}
            className="flex-1 py-3 font-semibold text-white bg-[var(--brand-color)] hover:opacity-90 shadow"
            iconLeft={MenuIcon}
          >
            {tCustomer("view_menu") || "View Menu"}
          </Button>
          <Button
            href={`/${locale}/booking`}
            className="flex-1 py-3 font-semibold bg-white text-[var(--brand-color)] border border-[var(--brand-color)] shadow"
            iconLeft={CalendarDays}
          >
            {tCustomer("make_reservation") || "Reserve"}
          </Button>
        </div>

        {/* Today’s Hours */}
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Clock className="h-4 w-4 text-[var(--brand-color)]" />
          <span>
            <span className="font-semibold">Today:</span>{" "}
            {openingHours?.[today]?.isClosed
              ? "Closed"
              : `${openingHours?.[today]?.openTime || "--:--"} - ${
                  openingHours?.[today]?.closeTime || "--:--"
                }`}
          </span>
          {open && closesAt && (
            <span className="ml-2 text-green-600">(Open until {closesAt})</span>
          )}
        </div>

        {/* Short Description */}
        {(restaurant.description_en ||
          restaurant.description_ja ||
          restaurant.description_vi) && (
          <div className="text-slate-600 mb-2 text-base">
            {locale === "ja"
              ? restaurant.description_ja
              : locale === "vi"
              ? restaurant.description_vi
              : restaurant.description_en}
          </div>
        )}
		
        {/* Menu Categories */}
        <div className="my-4">
          <div className="font-bold text-lg mb-2">Menu</div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {menu?.map((category, i) => (
              <a
                key={category.id}
                href={`/${locale}/menu#${category.id}`}
                className="min-w-[130px] max-w-[160px] bg-white rounded-xl border p-3 shadow flex flex-col items-center hover:shadow-lg transition group"
              >
                {/* Use imageUrl if you have it, otherwise icon/emoji */}
                <div className="mb-2">
                  {category.imageUrl ? (
                    <Image
                      src={category.imageUrl}
                      alt={category.name_en}
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    <span className="text-3xl">
                      {category.emoji || (i === 0 ? "🍗" : i === 1 ? "🥤" : "🍽️")}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-sm text-center group-hover:text-[var(--brand-color)]">
                  {locale === "ja"
                    ? category.name_ja
                    : locale === "vi"
                    ? category.name_vi
                    : category.name_en}
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  {category.menu_items?.length || 0} items
                </span>
                {i === 0 && (
                  <span className="mt-1 px-2 py-0.5 rounded-full text-amber-600 bg-amber-100 text-xs flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    Most Popular
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
		
		{/* Contact and info */}
        <div className="my-4">
          <div className="grid grid-cols-2 gap-2">
            {restaurant.phone && (
              <a
                href={`tel:${restaurant.phone}`}
                className="flex items-center gap-1 bg-white rounded-lg border px-2 py-2 shadow hover:bg-[var(--brand-color)]/5"
              >
                <Phone className="h-4 w-4 text-[var(--brand-color)]" />
                <span className="text-xs">{restaurant.phone}</span>
              </a>
            )}
            {restaurant.email && (
              <a
                href={`mailto:${restaurant.email}`}
                className="flex items-center gap-1 bg-white rounded-lg border px-2 py-2 shadow hover:bg-[var(--brand-color)]/5"
              >
                <Mail className="h-4 w-4 text-[var(--brand-color)]" />
                <span className="text-xs">{restaurant.email}</span>
              </a>
            )}
            {restaurant.website && (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 bg-white rounded-lg border px-2 py-2 shadow hover:bg-[var(--brand-color)]/5"
              >
                <Globe className="h-4 w-4 text-[var(--brand-color)]" />
                <span className="text-xs">{tCustomer("visit_website") || "Website"}</span>
              </a>
            )}
            <div className="flex items-center gap-1 bg-white rounded-lg border px-2 py-2 shadow text-xs text-slate-500">
              <MapPin className="h-4 w-4 text-[var(--brand-color)]" />
              {restaurant.address}
            </div>
          </div>
        </div>

		<Card className="mb-6 p-0 overflow-hidden">
			{/* Map Embed */}
			<div className="w-full h-48 relative">
				<iframe
				title="Google Maps"
				width="100%"
				height="100%"
				className="absolute inset-0 w-full h-full border-0 rounded-t-xl"
				style={{ minHeight: "180px" }}
				loading="lazy"
				allowFullScreen
				src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3241.941774037688!2d139.68970031526023!3d35.68948792468433!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x60188cfdabcd1234%3A0xabc1234567890def!2sYour+Restaurant!5e0!3m2!1sen!2sjp!4v1718874848983!5m2!1sen!2sjp"
				/>
			</div>
			{/* Info Section */}
			<div className="flex items-center justify-between p-4 bg-white">
				<div>
				<div className="flex items-center gap-1 text-lg font-bold text-amber-500">
					<Star className="h-5 w-5" /> {googleRating}
				</div>
				<div className="text-xs text-slate-500">{googleReviewCount} Google reviews</div>
				</div>
				<div className="flex flex-col gap-2">
				<a
					href={googleMapsPlaceUrl}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700"
				>
					<Globe className="h-4 w-4 mr-1" /> View on Google Maps
				</a>
				<a
					href={`${googleMapsPlaceUrl}/?directions`}
					target="_blank"
					rel="noopener noreferrer"
					className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md text-xs font-semibold hover:bg-green-700"
				>
					<MapPin className="h-4 w-4 mr-1" /> Get Directions
				</a>
				</div>
			</div>
		</Card>

        
      </section>

      {/* Enhanced Sticky Bottom Bar with Safe Area Support */}
      <nav 
        className="fixed left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t shadow-lg z-40 flex"
        style={{
          bottom: 'env(safe-area-inset-bottom, 0px)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 16px), 16px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)'
        }}
      >
        <a
          href={`/${locale}/menu`}
          className="flex-1 flex items-center justify-center py-3 text-[var(--brand-color)] font-bold hover:bg-[var(--brand-color)]/10"
        >
          <MenuIcon className="mr-2 h-5 w-5" />
          Menu
        </a>
        <a
          href={`/${locale}/booking`}
          className="flex-1 flex items-center justify-center py-3 text-[var(--brand-color)] font-bold hover:bg-[var(--brand-color)]/10"
        >
          <CalendarDays className="mr-2 h-5 w-5" />
          Reserve
        </a>
      </nav>

      <CustomerFooter restaurantSettings={restaurant} />
    </div>
  );
};

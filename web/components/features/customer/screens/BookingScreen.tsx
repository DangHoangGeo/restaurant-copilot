// web/components/features/customer/screens/BookingScreen.tsx
"use client";
import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Using shadcn Select
import { Alert } from "@/components/ui/alert";
import { useGetCurrentLocale, getLocalizedText } from "@/lib/customerUtils";
import type { RestaurantSettings, TableInfo, Category, MenuItem } from "@/shared/types/customer";
import { ViewProps, ViewType, MenuViewProps } from "./types"; // Updated imports

interface BookingScreenProps {
  setView: (v: ViewType, props?: ViewProps) => void;
  restaurantSettings: RestaurantSettings;
  tables: TableInfo[];
  categories: Category[];
  featureFlags: {
    tableBooking: boolean;
  };
  viewProps?: ViewProps; // Added viewProps for consistency, though not strictly used yet
}

interface BookingFormData {
  tableId: string;
  customerName: string;
  contact: string;
  date: string;
  time: string;
  partySize: number;
  preOrderItems: { itemId: string; quantity: number }[];
}

export function BookingScreen({
  setView,
  restaurantSettings,
  tables,
  categories,
  featureFlags,
}: BookingScreenProps) {
  const t = useTranslations("Customer");
  const locale = useGetCurrentLocale();
  const [formData, setFormData] = useState<BookingFormData>({
    tableId: "",
    customerName: "",
    contact: "",
    date: new Date().toISOString().split("T")[0],
    time: "19:00",
    partySize: 2,
    preOrderItems: [],
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const menuItems: MenuItem[] = categories
    .flatMap((cat) => cat.menu_items)
    .filter((item) => item.available);

  if (!featureFlags.tableBooking) {
    setView("menu", {} as MenuViewProps); // Ensure props are passed if needed for menu
    return <p>Table booking is not available. Redirecting...</p>;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
     if (type === 'checkbox') {
        const checked = e.target.checked;
        const itemId = value; // value is item.id for checkbox
        setFormData((prev) => ({
            ...prev,
            preOrderItems: checked
            ? [...prev.preOrderItems, { itemId, quantity: 1 }]
            : prev.preOrderItems.filter((item) => item.itemId !== itemId),
        }));
    } else if (name === "partySize") {
        setFormData(prev => ({ ...prev, partySize: parseInt(value, 10) || 1 }));
    }
    else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, tableId: value }));
  };

  const handlePreOrderItemQuantityChange = (itemId: string, quantityStr: string) => {
    const quantity = parseInt(quantityStr, 10);
    setFormData((prev) => ({
      ...prev,
      preOrderItems: quantity > 0
        ? prev.preOrderItems.map((item) =>
            item.itemId === itemId ? { ...item, quantity } : item,
          )
        : prev.preOrderItems.filter((item) => item.itemId !== itemId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!formData.tableId || !formData.customerName || !formData.contact || !formData.date || !formData.time || formData.partySize < 1) {
      setError(t("booking.form.validation_error_fill_fields"));
      return;
    }
    setIsSubmitting(true);
    console.log("Submitting booking:", formData);
    // Mock API Call
    setTimeout(() => {
        setSubmitted(true);
        setIsSubmitting(false);
    }, 1000);
    // TODO: Replace with actual API call
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <CalendarDays
          className="mx-auto mb-6 text-green-500 dark:text-green-400"
          size={64}
        />
        <h2 className="text-3xl font-bold mb-3">
          {t("booking.submission_thank_you_title")}
        </h2>
        <p className="text-slate-600 dark:text-slate-300 mb-6">
          {t("booking.submission_thank_you_message", { name: formData.customerName })}
        </p>
        <Button
          onClick={() => setView("menu", {} as MenuViewProps)} // Ensure props are passed if needed for menu
          size="lg"
          style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
          className="text-white hover:opacity-90"
        >
          {t("thankyou.back_to_menu_button")}
        </Button>
      </div>
    );
  }

  return (
    <div>
      <Button onClick={() => setView("menu", {} as MenuViewProps)} variant="ghost" className="mb-4 -ml-2">
        <ChevronLeft className="h-4 w-4 mr-1" />
        {t("checkout.back_to_menu")}
      </Button>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">{t("booking.title")}</h2>
      {error && <Alert variant="destructive" className="mb-4">{error}</Alert>}
      <Card className="max-w-lg mx-auto p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select name="tableId" value={formData.tableId} onValueChange={handleSelectChange} required>
            <SelectTrigger>
              <SelectValue placeholder={t("booking.form.table_select_placeholder")} />
            </SelectTrigger>
            <SelectContent>
              {tables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  {table.name} ({t("booking.form.table_capacity", { count: table.capacity ?? 0 })})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input name="customerName" value={formData.customerName} onChange={handleInputChange} required placeholder={t("booking.form.name_placeholder")} />
          <Input name="contact" value={formData.contact} onChange={handleInputChange} required placeholder={t("booking.form.contact_placeholder")} />
          <div className="grid grid-cols-2 gap-4">
            <Input name="date" type="date" value={formData.date} onChange={handleInputChange} required min={new Date().toISOString().split("T")[0]} />
            <Input name="time" type="time" value={formData.time} onChange={handleInputChange} required />
          </div>
          <Input name="partySize" type="number" value={formData.partySize} onChange={handleInputChange} required min="1" placeholder={t("booking.form.party_size_placeholder")} />
          <h4 className="text-md font-semibold pt-4 border-t dark:border-slate-700">{t("booking.form.preorder_optional_title")}</h4>
          <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {menuItems.map((item) => {
              const preOrderedItem = formData.preOrderItems.find((pi) => pi.itemId === item.id);
              return (
                <div key={item.id} className="p-3 border rounded-lg dark:border-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <label className="flex items-center space-x-3 cursor-pointer flex-grow">
                    <input type="checkbox" name="preOrderItems" value={item.id} checked={!!preOrderedItem} onChange={handleInputChange} className="form-checkbox h-4 w-4 rounded accent-[--brand-color]" style={{'--brand-color': restaurantSettings.primaryColor || "#0ea5e9"} as React.CSSProperties} />
                    <span className="text-sm">{getLocalizedText({"name_en":item.name_en,"name_vi":item.name_vi,"name_jp":item.name_ja}, locale)} ({t("currency_format", { value: item.price })})</span>
                  </label>
                  {preOrderedItem && <Input type="number" value={preOrderedItem.quantity} min="1" onChange={(e) => handlePreOrderItemQuantityChange(item.id, e.target.value)} className="w-20 text-sm py-1 h-8" />}
                </div>
              );
            })}
          </div>
          <Button type="submit" size="lg" className="w-full mt-6 text-white hover:opacity-90" style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }} disabled={isSubmitting}>
            {isSubmitting ? (t("booking.form.submitting_button") || "Submitting...") : t("booking.form.submit_button")}
          </Button>
        </form>
      </Card>
    </div>
  );
}

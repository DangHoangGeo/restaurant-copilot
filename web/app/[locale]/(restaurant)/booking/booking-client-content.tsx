"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, 
  CalendarDays, 
  Heart,
  Zap,
  Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { useGetCurrentLocale, getLocalizedText } from "@/lib/customerUtils";
import { AnimatedRestaurantHeader } from "@/components/common/AnimatedRestaurantHeader";
import type { RestaurantSettings, Category, TableInfo, MenuItem } from "@/shared/types/customer";
import Link from "next/link";

interface BookingClientContentProps {
  restaurantSettings: RestaurantSettings;
  categories: Category[];
  tables: TableInfo[];
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

export function BookingClientContent({
  restaurantSettings,
  categories,
  tables,
}: BookingClientContentProps) {
  const t = useTranslations("Customer");
  const tCommon = useTranslations("Common");
  const locale = useGetCurrentLocale();
  const router = useRouter();
  
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

  const primaryColor = restaurantSettings.primaryColor || '#3B82F6';
  
  const menuItems: MenuItem[] = categories
    .flatMap((cat) => cat.menu_items)
    .filter((item) => item.available);

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

  const handleBackToMenu = () => {
    router.push("/menu");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 relative" style={{ '--brand-color': primaryColor } as React.CSSProperties}>
      {/* Enhanced Header with Animations */}
      <AnimatedRestaurantHeader 
        restaurantSettings={restaurantSettings}
        badgeText="Table Booking"
        badgeIcon={CalendarDays}
      />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {submitted ? (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <CalendarDays
                className="mx-auto mb-6 text-green-500 dark:text-green-400"
                size={64}
              />
            </motion.div>
            <motion.h2 
              className="text-3xl font-bold mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              {t("booking.submission_thank_you_title")}
            </motion.h2>
            <motion.p 
              className="text-slate-600 dark:text-slate-300 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {t("booking.submission_thank_you_message", { name: formData.customerName })}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={handleBackToMenu}
                size="lg"
                style={{ backgroundColor: restaurantSettings.primaryColor || "#0ea5e9" }}
                className="text-white hover:opacity-90"
              >
                {tCommon("back_to_menu")}
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center mb-6">
              <Button onClick={handleBackToMenu} variant="ghost" className="mb-4 -ml-2">
                <ChevronLeft className="h-4 w-4 mr-1" />
                {tCommon("back_to_menu")}
              </Button>
            </div>
            
            <motion.h2 
              className="text-2xl sm:text-3xl font-bold text-center mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {t("booking.title")}
            </motion.h2>
            
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Alert variant="destructive" className="mb-4">{error}</Alert>
              </motion.div>
            )}
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
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
                            <span className="text-sm">{getLocalizedText({"name_en":item.name_en,"name_vi":item.name_vi || "","name_jp":item.name_ja || ""}, locale)} (¥{item.price.toFixed(0)})</span>
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
            </motion.div>
          </motion.div>
        )}
      </main>

      {/* Enhanced Footer with Animations */}
      <motion.footer 
        className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 text-white py-12 mt-12 relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          <motion.div
            className="absolute top-10 left-10 w-32 h-32 bg-[var(--brand-color)]/10 rounded-full blur-xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-10 right-10 w-24 h-24 bg-[var(--brand-color)]/10 rounded-full blur-xl"
            animate={{
              scale: [1.2, 1, 1.2],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
        </div>

        <div className="container mx-auto px-4 relative">
          <motion.div 
            className="flex flex-col md:flex-row items-center justify-between mb-8"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            <div className="mb-4 md:mb-0">
              <motion.div 
                className="flex items-center space-x-4"
                whileHover={{ scale: 1.05 }}
              >
                {restaurantSettings.logoUrl && (
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.8 }}
                  >
                    <Image
                      src={restaurantSettings.logoUrl}
                      alt={restaurantSettings.name}
                      width={32}
                      height={32}
                      className="rounded"
                    />
                  </motion.div>
                )}
                <span className="text-xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  {restaurantSettings.name}
                </span>
              </motion.div>
            </div>

            {/* Social Links Placeholder */}
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.4 }}
            >
              <motion.div
                whileHover={{ scale: 1.2, rotate: 15 }}
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--brand-color)]/30 transition-colors"
              >
                <Heart className="h-4 w-4" />
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.2, rotate: -15 }}
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center cursor-pointer hover:bg-[var(--brand-color)]/30 transition-colors"
              >
                <Star className="h-4 w-4" />
              </motion.div>
            </motion.div>
          </motion.div>
          
          <motion.div 
            className="border-t border-slate-700 pt-6 text-center text-sm text-slate-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6 }}
          >
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.8 }}
            >
              © {new Date().getFullYear()} {restaurantSettings.name}. All rights reserved.
            </motion.p>
            <motion.p
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 2 }}
              className="mt-2 flex items-center justify-center space-x-2"
            >
              <span>Powered by</span>
              <motion.span
                className="text-[var(--brand-color)] font-semibold"
                animate={{ opacity: [1, 0.7, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {tCommon("powered_by")} <Link target="_blank" href="https://coorder.ai">coorder.ai</Link>
              </motion.span>
              <Zap className="h-4 w-4 text-[var(--brand-color)]" />
            </motion.p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronLeft, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { useGetCurrentLocale, getLocalizedText } from "@/lib/customerUtils";
import { useCustomerPageData } from "@/hooks/useCustomerData";
import { BookingPageSkeleton } from "@/components/features/customer/loading/CustomerSkeletons";
import {
  CustomerError,
  RestaurantNotFoundError,
} from "@/components/features/customer/error/CustomerError";
import { buildCustomerPath, getActiveBranchCode } from "@/lib/customer-branch";

interface BookingFormData {
  tableId: string;
  customerName: string;
  contact: string;
  date: string;
  time: string;
  partySize: number;
  preOrderItems: { itemId: string; quantity: number }[];
}

export function BookingClientContent() {
  const t = useTranslations("customer.booking");
  const tCommon = useTranslations("common");
  const locale = useGetCurrentLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Progressive data loading
  const { restaurant, categories, tables, loading, error, reload } =
    useCustomerPageData();

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
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Early returns for loading and error states
  if (loading) return <BookingPageSkeleton />;
  if (error) return <CustomerError error={error} onRetry={reload} />;
  if (!restaurant) return <RestaurantNotFoundError />;

  const primaryColor = restaurant.primaryColor || "#3B82F6";
  const activeBranchCode = getActiveBranchCode({
    searchParams,
    branchCode: restaurant.branchCode,
    subdomain: restaurant.subdomain,
  });

  const menuItems = categories
    .flatMap((cat) => cat.menu_items)
    .filter((item) => item.available);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = e.target.checked;
      const itemId = value; // value is item.id for checkbox
      setFormData((prev) => ({
        ...prev,
        preOrderItems: checked
          ? [...prev.preOrderItems, { itemId, quantity: 1 }]
          : prev.preOrderItems.filter((item) => item.itemId !== itemId),
      }));
    } else if (name === "partySize") {
      setFormData((prev) => ({ ...prev, partySize: parseInt(value, 10) || 1 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, tableId: value }));
  };

  const handlePreOrderItemQuantityChange = (
    itemId: string,
    quantityStr: string,
  ) => {
    const quantity = parseInt(quantityStr, 10);
    setFormData((prev) => ({
      ...prev,
      preOrderItems:
        quantity > 0
          ? prev.preOrderItems.map((item) =>
              item.itemId === itemId ? { ...item, quantity } : item,
            )
          : prev.preOrderItems.filter((item) => item.itemId !== itemId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (
      !formData.tableId ||
      !formData.customerName ||
      !formData.contact ||
      !formData.date ||
      !formData.time ||
      formData.partySize < 1
    ) {
      setFormError(t("form.validation_error_fill_fields"));
      return;
    }

    setIsSubmitting(true);
    console.log("Submitting booking:", formData);

    // Mock API Call - replace with actual booking API
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (Math.random() > 0.2) {
            // 80% success rate for demo
            resolve("Success");
          } else {
            reject(new Error("Booking failed"));
          }
        }, 2000);
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Booking submission error:", err);
      setFormError("Failed to submit  Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToMenu = () => {
    router.push(
      buildCustomerPath({
        locale,
        path: "menu",
        branchCode: activeBranchCode,
      }),
    );
  };

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-900 relative"
      style={{ "--brand-color": primaryColor } as React.CSSProperties}
    >
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
              {t("submission_thank_you_title")}
            </motion.h2>
            <motion.p
              className="text-slate-600 dark:text-slate-300 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              {t("submission_thank_you_message", {
                name: formData.customerName,
              })}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <Button
                onClick={handleBackToMenu}
                size="lg"
                style={{
                  backgroundColor: restaurant.primaryColor || "#0ea5e9",
                }}
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
              <Button
                onClick={handleBackToMenu}
                variant="ghost"
                className="mb-4 -ml-2"
              >
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
              {t("title")}
            </motion.h2>

            {formError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Alert variant="destructive" className="mb-4 max-w-lg mx-auto">
                  {formError}
                </Alert>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="max-w-lg mx-auto p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Select
                    name="tableId"
                    value={formData.tableId}
                    onValueChange={handleSelectChange}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t("form.table_select_placeholder")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {tables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          {table.name} (
                          {t("form.table_capacity", {
                            count: table.capacity ?? 0,
                          })}
                          )
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    required
                    placeholder={t("form.name_placeholder")}
                  />

                  <Input
                    name="contact"
                    value={formData.contact}
                    onChange={handleInputChange}
                    required
                    placeholder={t("form.contact_placeholder")}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      min={new Date().toISOString().split("T")[0]}
                    />
                    <Input
                      name="time"
                      type="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <Input
                    name="partySize"
                    type="number"
                    value={formData.partySize}
                    onChange={handleInputChange}
                    required
                    min="1"
                    placeholder={t("form.party_size_placeholder")}
                  />

                  <h4 className="text-md font-semibold pt-4 border-t dark:border-slate-700">
                    {t("form.preorder_optional_title")}
                  </h4>

                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {menuItems.map((item) => {
                      const preOrderedItem = formData.preOrderItems.find(
                        (pi) => pi.itemId === item.id,
                      );
                      return (
                        <div
                          key={item.id}
                          className="p-3 border rounded-lg dark:border-slate-600 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                        >
                          <label className="flex items-center space-x-3 cursor-pointer flex-grow">
                            <input
                              type="checkbox"
                              name="preOrderItems"
                              value={item.id}
                              checked={!!preOrderedItem}
                              onChange={handleInputChange}
                              className="form-checkbox h-4 w-4 rounded accent-[--brand-color]"
                              style={
                                {
                                  "--brand-color":
                                    restaurant.primaryColor || "#0ea5e9",
                                } as React.CSSProperties
                              }
                            />
                            <span className="text-sm">
                              {getLocalizedText(
                                {
                                  name_en: item.name_en,
                                  name_vi: item.name_vi || "",
                                  name_jp: item.name_ja || "",
                                },
                                locale,
                              )}{" "}
                              (¥{item.price.toFixed(0)})
                            </span>
                          </label>
                          {preOrderedItem && (
                            <Input
                              type="number"
                              value={preOrderedItem.quantity}
                              min="1"
                              onChange={(e) =>
                                handlePreOrderItemQuantityChange(
                                  item.id,
                                  e.target.value,
                                )
                              }
                              className="w-20 text-sm py-1 h-8"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-6 text-white hover:opacity-90"
                    style={{
                      backgroundColor: restaurant.primaryColor || "#0ea5e9",
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? t("form.submitting_button") || "Submitting..."
                      : t("form.submit_button")}
                  </Button>
                </form>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </main>
    </div>
  );
}

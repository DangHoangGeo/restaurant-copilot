"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Loader2,
  Mail,
  MessageSquareText,
  Phone,
  User,
  Users,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { BookingPageSkeleton } from "@/components/features/customer/loading/CustomerSkeletons";
import {
  CustomerError,
  RestaurantNotFoundError,
} from "@/components/features/customer/error/CustomerError";
import { useGetCurrentLocale } from "@/lib/customerUtils";
import { useRestaurantData } from "@/hooks/useCustomerData";
import {
  appendBranchContext,
  buildCustomerPath,
  getActiveBranchCode,
  getOrgIdentifierFromHost,
} from "@/lib/customer-branch";
import {
  createCustomerBrandTheme,
  createCustomerThemeProperties,
} from "@/lib/utils/colors";
import { cn } from "@/lib/utils";

type BookingFormData = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
  customerNote: string;
};

type BookingStatus = {
  id: string;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerNote: string | null;
  bookingDate: string;
  bookingTime: string;
  partySize: number;
  status: "pending" | "confirmed" | "canceled";
  updatedAt: string | null;
};

type BookingField = keyof BookingFormData;

const phonePattern = /^[+()\-\s0-9]{7,24}$/;
const invalidFieldTone =
  "aria-invalid:border-amber-300/80 aria-invalid:ring-amber-300/25 dark:aria-invalid:ring-amber-300/25";

function getTodayDateString() {
  const today = new Date();
  const localDate = new Date(
    today.getTime() - today.getTimezoneOffset() * 60_000,
  );
  return localDate.toISOString().split("T")[0];
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildBookingEndpoint(params: {
  activeBranchCode: string | null;
  restaurantId?: string | null;
}) {
  const query = new URLSearchParams();
  if (params.restaurantId) query.set("restaurantId", params.restaurantId);

  if (typeof window !== "undefined") {
    appendBranchContext(query, {
      branchCode: params.activeBranchCode,
      orgIdentifier: getOrgIdentifierFromHost(window.location.host),
    });
  }

  const queryString = query.toString();
  return `/api/v1/customer/bookings${queryString ? `?${queryString}` : ""}`;
}

export function BookingClientContent() {
  const t = useTranslations("customer.booking");
  const tCommon = useTranslations("common");
  const locale = useGetCurrentLocale();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { data, loading, error, reload } = useRestaurantData();
  const restaurant = data?.restaurant ?? null;

  const [formData, setFormData] = useState<BookingFormData>({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    bookingDate: getTodayDateString(),
    bookingTime: "19:00",
    partySize: 2,
    customerNote: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<BookingField, string>>
  >({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [currentBooking, setCurrentBooking] = useState<BookingStatus | null>(
    null,
  );

  const customerTheme = useMemo(
    () => createCustomerBrandTheme(restaurant?.primaryColor),
    [restaurant?.primaryColor],
  );
  const primaryColor = customerTheme.primary;
  const activeBranchCode = restaurant
    ? getActiveBranchCode({
        searchParams,
        branchCode: restaurant.branchCode,
        subdomain: restaurant.subdomain,
      })
    : null;
  const bookingEndpoint = restaurant
    ? buildBookingEndpoint({
        activeBranchCode,
        restaurantId: restaurant.id,
      })
    : null;

  const loadBookingStatus = useCallback(async () => {
    if (!bookingEndpoint) return;

    setIsLoadingStatus(true);
    try {
      const response = await fetch(bookingEndpoint, {
        credentials: "include",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || t("status.fetchError"));
      setCurrentBooking(payload.booking ?? null);
    } catch (statusError) {
      console.error("Booking status load failed:", statusError);
    } finally {
      setIsLoadingStatus(false);
    }
  }, [bookingEndpoint, t]);

  useEffect(() => {
    void loadBookingStatus();
  }, [loadBookingStatus]);

  if (loading) return <BookingPageSkeleton />;
  if (error) return <CustomerError error={error} onRetry={reload} />;
  if (!restaurant) return <RestaurantNotFoundError />;

  const handleBackToMenu = () => {
    router.push(
      buildCustomerPath({
        locale,
        path: "menu",
        branchCode: activeBranchCode,
      }),
    );
  };

  const validateForm = () => {
    const nextErrors: Partial<Record<BookingField, string>> = {};
    const trimmedName = formData.customerName.trim();
    const trimmedPhone = formData.customerPhone.trim();
    const trimmedEmail = formData.customerEmail.trim();

    if (trimmedName.length < 2) {
      nextErrors.customerName = t("validation.name_required");
    }

    if (!trimmedPhone && !trimmedEmail) {
      nextErrors.customerPhone = t("validation.phone_or_email_required");
      nextErrors.customerEmail = t("validation.phone_or_email_required");
    }

    if (trimmedPhone && !phonePattern.test(trimmedPhone)) {
      nextErrors.customerPhone = t("validation.phone_invalid");
    }

    if (trimmedEmail && !isValidEmail(trimmedEmail)) {
      nextErrors.customerEmail = t("validation.email_invalid");
    }

    if (!formData.bookingDate) {
      nextErrors.bookingDate = t("validation.date_required");
    } else if (formData.bookingDate < getTodayDateString()) {
      nextErrors.bookingDate = t("validation.date_future");
    }

    if (!formData.bookingTime) {
      nextErrors.bookingTime = t("validation.time_required");
    }

    if (!Number.isInteger(formData.partySize) || formData.partySize < 1) {
      nextErrors.partySize = t("validation.party_size_min");
    }

    setFieldErrors(nextErrors);
    const firstError = Object.values(nextErrors)[0];
    if (firstError) setFormError(firstError);
    return !firstError;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));

    if (name === "partySize") {
      setFormData((prev) => ({
        ...prev,
        partySize: Math.max(1, parseInt(value, 10) || 1),
      }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getServerValidationMessage = (
    field: BookingField,
    issue: string | undefined,
  ) => {
    if (field === "customerName") return t("validation.name_required");
    if (field === "customerPhone") {
      return issue === "invalid_phone"
        ? t("validation.phone_invalid")
        : t("validation.phone_or_email_required");
    }
    if (field === "customerEmail") {
      return issue === "invalid_email"
        ? t("validation.email_invalid")
        : t("validation.phone_or_email_required");
    }
    if (field === "bookingDate") return t("validation.date_future");
    if (field === "bookingTime") return t("validation.time_required");
    if (field === "partySize") return t("validation.party_size_min");
    return t("form.validation_error_fill_fields");
  };

  const applyServerValidationErrors = (payload: unknown) => {
    const fieldMap: Partial<Record<string, BookingField>> = {
      customerName: "customerName",
      customerPhone: "customerPhone",
      customerEmail: "customerEmail",
      bookingDate: "bookingDate",
      bookingTime: "bookingTime",
      partySize: "partySize",
      customerNote: "customerNote",
    };
    const details =
      typeof payload === "object" && payload !== null && "details" in payload
        ? (payload.details as {
            fieldErrors?: Record<string, string[] | undefined>;
          })
        : null;

    const nextErrors: Partial<Record<BookingField, string>> = {};
    Object.entries(details?.fieldErrors ?? {}).forEach(([apiField, issues]) => {
      const field = fieldMap[apiField];
      if (!field) return;
      nextErrors[field] = getServerValidationMessage(field, issues?.[0]);
    });

    if (Object.keys(nextErrors).length === 0) return false;

    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    setFormError(
      Object.values(nextErrors)[0] ?? t("form.validation_error_fill_fields"),
    );
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!bookingEndpoint) {
      setFormError(t("notifications.booking_failed"));
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(bookingEndpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: formData.customerName.trim(),
          customerPhone: formData.customerPhone.trim(),
          customerEmail: formData.customerEmail.trim(),
          bookingDate: formData.bookingDate,
          bookingTime: formData.bookingTime,
          partySize: formData.partySize,
          customerNote: formData.customerNote.trim(),
        }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        if (applyServerValidationErrors(payload)) return;
        throw new Error(payload.error || t("notifications.booking_failed"));
      }

      setCurrentBooking(payload.booking);
    } catch (submitError) {
      console.error("Booking submission error:", submitError);
      setFormError(
        submitError instanceof Error
          ? submitError.message
          : t("notifications.booking_failed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusTone = currentBooking?.status ?? "pending";
  const statusClasses: Record<string, string> = {
    pending: "border-amber-300/30 bg-amber-400/10 text-amber-100",
    confirmed: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
    canceled: "border-rose-300/30 bg-rose-400/10 text-rose-100",
  };

  return (
    <div
      className="min-h-screen text-[#fff7e9]"
      style={
        {
          ...createCustomerThemeProperties(primaryColor),
          background:
            "linear-gradient(180deg,#12100D 0%,#0B0A08 48%,#080705 100%)",
        } as React.CSSProperties
      }
    >
      <div className="min-h-screen">
        <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,0.85fr)_minmax(420px,1fr)] lg:items-start lg:px-8 lg:py-10">
          <section className="rounded-[20px] border border-[#f1dcc4]/12 bg-[#f6e8d3]/5 p-5 shadow-[0_24px_80px_-58px_rgba(0,0,0,0.95)] backdrop-blur-xl md:p-7">
            <Button
              onClick={handleBackToMenu}
              variant="ghost"
              className="-ml-2 mb-5 rounded-[14px] text-[#f8eedb] hover:bg-[#f6e8d3]/10 hover:text-white"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {tCommon("back_to_menu")}
            </Button>

            <p className="inline-flex items-center gap-2 rounded-[12px] border border-[#f1dcc4]/12 bg-[#f6e8d3]/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#c9b7a0]">
              <CalendarDays className="h-3.5 w-3.5" />
              {restaurant.name}
            </p>
            <h1 className="mt-4 text-3xl font-semibold leading-tight text-white sm:text-5xl">
              {t("title")}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-[#d6c4a6]">
              {t("description")}
            </p>
          </section>

          <section className="space-y-4">
            {isLoadingStatus ? (
              <div className="rounded-[18px] border border-[#f1dcc4]/12 bg-[#f6e8d3]/5 p-5 text-sm text-[#d6c4a6]">
                <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                {t("status.loading")}
              </div>
            ) : null}

            {currentBooking ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-[20px] border p-5 shadow-[0_24px_80px_-58px_rgba(0,0,0,0.95)] backdrop-blur-xl",
                  statusClasses[statusTone],
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/[0.12] p-3">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
                      {t("status.currentReservation")}
                    </p>
                    <h2 className="mt-1 text-xl font-semibold">
                      {t(`status.${currentBooking.status}`)}
                    </h2>
                    <p className="mt-2 text-sm leading-6 opacity-90">
                      {currentBooking.status === "pending"
                        ? t("status.pendingDescription")
                        : currentBooking.status === "confirmed"
                          ? t("status.confirmedDescription")
                          : t("status.canceledDescription")}
                    </p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 rounded-[16px] bg-black/[0.18] p-4 text-sm sm:grid-cols-2">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    {currentBooking.bookingDate}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4" />
                    {currentBooking.bookingTime}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {t("status.seats", { count: currentBooking.partySize })}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {currentBooking.customerName}
                  </span>
                </div>
              </motion.div>
            ) : null}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[20px] border border-[#f1dcc4]/12 bg-[#f6e8d3]/5 p-5 shadow-[0_24px_80px_-58px_rgba(0,0,0,0.95)] backdrop-blur-xl md:p-6"
            >
              <div className="mb-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#c9b7a0]">
                  {t("form.eyebrow")}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  {t("form.title")}
                </h2>
              </div>

              {formError ? (
                <Alert
                  className="mb-4 border-amber-200/45 bg-amber-300/[0.14] text-amber-50"
                >
                  <AlertDescription className="text-amber-50">
                    {formError}
                  </AlertDescription>
                </Alert>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4">
                <FieldShell
                  label={t("form.name_label")}
                  error={fieldErrors.customerName}
                  icon={<User className="h-4 w-4" />}
                >
                  <Input
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleInputChange}
                    placeholder={t("form.name_placeholder")}
                    autoComplete="name"
                    aria-invalid={Boolean(fieldErrors.customerName)}
                    className={cn(
                      "h-12 rounded-[14px] border-[#f1dcc4]/12 bg-black/20 text-white placeholder:text-[#8f806e]",
                      invalidFieldTone,
                    )}
                  />
                </FieldShell>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldShell
                    label={t("form.phone_label")}
                    error={fieldErrors.customerPhone}
                    icon={<Phone className="h-4 w-4" />}
                  >
                    <Input
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleInputChange}
                      placeholder={t("form.phone_placeholder")}
                      autoComplete="tel"
                      inputMode="tel"
                      aria-invalid={Boolean(fieldErrors.customerPhone)}
                      className={cn(
                        "h-12 rounded-[14px] border-[#f1dcc4]/12 bg-black/20 text-white placeholder:text-[#8f806e]",
                        invalidFieldTone,
                      )}
                    />
                  </FieldShell>

                  <FieldShell
                    label={t("form.email_label")}
                    error={fieldErrors.customerEmail}
                    icon={<Mail className="h-4 w-4" />}
                  >
                    <Input
                      name="customerEmail"
                      value={formData.customerEmail}
                      onChange={handleInputChange}
                      placeholder={t("form.email_placeholder")}
                      autoComplete="email"
                      inputMode="email"
                      aria-invalid={Boolean(fieldErrors.customerEmail)}
                      className={cn(
                        "h-12 rounded-[14px] border-[#f1dcc4]/12 bg-black/20 text-white placeholder:text-[#8f806e]",
                        invalidFieldTone,
                      )}
                    />
                  </FieldShell>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <FieldShell
                    label={t("form.date_label")}
                    error={fieldErrors.bookingDate}
                    icon={<CalendarDays className="h-4 w-4" />}
                  >
                    <Input
                      name="bookingDate"
                      type="date"
                      value={formData.bookingDate}
                      onChange={handleInputChange}
                      min={getTodayDateString()}
                      aria-invalid={Boolean(fieldErrors.bookingDate)}
                      className={cn(
                        "h-12 rounded-[14px] border-[#f1dcc4]/12 bg-black/20 text-white",
                        invalidFieldTone,
                      )}
                    />
                  </FieldShell>

                  <FieldShell
                    label={t("form.time_label")}
                    error={fieldErrors.bookingTime}
                    icon={<Clock3 className="h-4 w-4" />}
                  >
                    <Input
                      name="bookingTime"
                      type="time"
                      value={formData.bookingTime}
                      onChange={handleInputChange}
                      aria-invalid={Boolean(fieldErrors.bookingTime)}
                      className={cn(
                        "h-12 rounded-[14px] border-[#f1dcc4]/12 bg-black/20 text-white",
                        invalidFieldTone,
                      )}
                    />
                  </FieldShell>

                  <FieldShell
                    label={t("form.seats_label")}
                    error={fieldErrors.partySize}
                    icon={<Users className="h-4 w-4" />}
                  >
                    <Input
                      name="partySize"
                      type="number"
                      value={formData.partySize}
                      onChange={handleInputChange}
                      min="1"
                      max="30"
                      inputMode="numeric"
                      aria-invalid={Boolean(fieldErrors.partySize)}
                      className={cn(
                        "h-12 rounded-[14px] border-[#f1dcc4]/12 bg-black/20 text-white",
                        invalidFieldTone,
                      )}
                    />
                  </FieldShell>
                </div>

                <FieldShell
                  label={t("form.special_requests_label")}
                  error={fieldErrors.customerNote}
                  icon={<MessageSquareText className="h-4 w-4" />}
                >
                  <Textarea
                    name="customerNote"
                    value={formData.customerNote}
                    onChange={handleInputChange}
                    placeholder={t("form.special_requests_placeholder")}
                    className="min-h-24 rounded-[14px] border-[#f1dcc4]/12 bg-black/20 text-white placeholder:text-[#8f806e]"
                  />
                </FieldShell>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-2 h-12 w-full rounded-[14px] border-0 text-sm font-semibold shadow-lg shadow-black/30"
                  style={{
                    backgroundColor: "var(--customer-brand)",
                    color: "var(--customer-brand-foreground)",
                  }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("form.submitting_button")}
                    </>
                  ) : (
                    t("form.submit_button")
                  )}
                </Button>
              </form>
            </motion.div>
          </section>
        </main>
      </div>
    </div>
  );
}

function FieldShell({
  label,
  error,
  icon,
  children,
}: {
  label: string;
  error?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#d6c4a6]">
        <span className="text-[var(--customer-brand)]">{icon}</span>
        {label}
      </Label>
      {children}
      {error ? <p className="text-xs text-amber-100/95">{error}</p> : null}
    </div>
  );
}

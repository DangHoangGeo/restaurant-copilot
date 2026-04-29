"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  ArrowLeft,
  Clock,
  Copy,
  MapPin,
  Printer,
  Share2,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { useCustomerData } from "@/components/features/customer/layout/CustomerDataContext";
import { formatPrice } from "@/lib/customerUtils";
import { QRCodeDialog } from "@/components/features/customer/QRCodeDialog";
import type {
  OrderHistoryResponse,
  OrderItem,
  OrderItemStatus,
  OrderStatus,
  Topping,
} from "./types";
import { buildCustomerPath } from "@/lib/customer-branch";
import {
  createCustomerBrandTheme,
  createCustomerThemeProperties,
} from "@/lib/utils/colors";

interface HistoryPageClientProps {
  locale: string;
}

const ORDER_ITEM_STATUSES: OrderItemStatus[] = [
  "new",
  "ordered",
  "preparing",
  "ready",
  "served",
  "canceled",
];

const isOrderItemStatus = (status: string): status is OrderItemStatus =>
  ORDER_ITEM_STATUSES.includes(status as OrderItemStatus);

export function HistoryPageClient({ locale }: HistoryPageClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    restaurantSettings,
    sessionData,
    activeBranchCode,
    isLoading: contextLoading,
  } = useCustomerData();
  const t = useTranslations("customer.orderHistory");

  const [historyData, setHistoryData] = useState<OrderHistoryResponse | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [passcodeCopied, setPasscodeCopied] = useState(false);

  const sessionId = searchParams.get("sessionId") || sessionData.sessionId;

  const TERMINAL_STATUSES = ["completed", "canceled"];
  const POLL_INTERVAL_MS = 30_000;

  useEffect(() => {
    if (contextLoading || !sessionId || !restaurantSettings?.id) {
      if (!contextLoading) {
        if (!sessionId) setError("Session information not found");
        else setError("Restaurant information not found");
        setIsLoading(false);
      }
      return;
    }

    const fetchOrderHistory = async (silent = false) => {
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ sessionId });
        params.append("restaurantId", restaurantSettings.id);
        const response = await fetch(
          `/api/v1/customer/orders/session-info?${params.toString()}`,
        );
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Failed to fetch order history");
        if (data.success) setHistoryData(data);
        else throw new Error(data.error || "Failed to load order history");
      } catch (err) {
        console.error("Error fetching order history:", err);
        if (!silent)
          setError(
            err instanceof Error ? err.message : "Failed to load order history",
          );
      } finally {
        if (!silent) setIsLoading(false);
      }
    };

    fetchOrderHistory();

    const interval = setInterval(() => {
      const currentStatus = historyData?.order?.status;
      if (!currentStatus || TERMINAL_STATUSES.includes(currentStatus)) return;
      fetchOrderHistory(true);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, restaurantSettings?.id, contextLoading]);

  const getPasscode = () => historyData?.order?.session_code ?? "";

  const copyPasscode = async () => {
    const passcode = getPasscode();
    if (!passcode) return;
    try {
      await navigator.clipboard.writeText(passcode);
      setPasscodeCopied(true);
      window.setTimeout(() => setPasscodeCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy passcode:", err);
    }
  };

  const escHtml = (str: string): string =>
    str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const handlePrintReceipt = async () => {
    if (!historyData?.order) return;
    setIsPrinting(true);
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const order = historyData.order;
      const currency = restaurantSettings?.currency || "JPY";
      const fpLocal = (amount: number) =>
        new Intl.NumberFormat(locale, {
          style: "currency",
          currency,
          maximumFractionDigits: 0,
        }).format(amount);
      const receiptItemSubtotal = (order.items || []).reduce((sum, item) => {
        const itemStatus = getItemStatus(item.status);
        const itemTotal =
          item.total ??
          (item.price_at_order ?? item.unit_price) * item.quantity;
        return itemStatus === "canceled" ? sum : sum + itemTotal;
      }, 0);
      const receiptTax = order.tax_amount ?? 0;
      const receiptSubtotal =
        receiptItemSubtotal ||
        Math.max((order.total_amount || 0) - receiptTax, 0);
      const receiptTotal = receiptSubtotal + receiptTax;

      const receiptHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${escHtml(t("receipt_title", { orderId: order.id.slice(-8) }))}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 20px; }
            .order-info { margin-bottom: 20px; }
            .items { margin-bottom: 20px; }
            .item { margin-bottom: 6px; padding: 4px 0; border-bottom: 1px solid #eee; }
            .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px; }
            .item-name { font-weight: bold; }
            .item-price { font-weight: bold; }
            .item-details { font-size: 0.9em; color: #666; margin: 2px 0; }
            .quantity-size { display: flex; align-items: center; gap: 8px; }
            .total { font-weight: bold; font-size: 18px; margin-top: 20px; text-align: right; border-top: 2px solid #333; padding-top: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${escHtml(restaurantSettings?.name || "Restaurant")}</h1>
            <p>${escHtml(restaurantSettings?.address || "")}</p>
            <p>${escHtml(restaurantSettings?.phone || "")}</p>
            <p>${escHtml(t("receipt_title", { orderId: order.id.slice(-8) }))}</p>
          </div>
          <div class="order-info">
            <p><strong>${escHtml(t("table"))}</strong> ${escHtml(order.table_name || "")}</p>
            <p><strong>${escHtml(t("date"))}</strong> ${escHtml(formatDate(order.created_at))} ${escHtml(formatTime(order.created_at))}</p>
          </div>
          <div class="items">
            <h3>${escHtml(t("items"))}</h3>
            ${(order.items || [])
              .map((item) => {
                const sizeName = getSizeName(item);
                const itemStatus = getItemStatus(item.status);
                const quantityDisplay = sizeName
                  ? `× ${item.quantity} (${escHtml(sizeName)})`
                  : `× ${item.quantity}`;
                const itemTotal =
                  item.total ??
                  (item.price_at_order ?? item.unit_price) * item.quantity;
                return `
                  <div class="item">
                    <div class="item-header">
                      <div class="item-name">${escHtml(getMenuItemName(item))}</div>
                      <div class="item-price">${escHtml(fpLocal(itemTotal))}</div>
                    </div>
                    <div class="item-details">${escHtml(t(`item_status.${itemStatus}`))}</div>
                    <div class="quantity-size">
                      <span>${quantityDisplay}</span>
                    </div>
                    ${item.toppings && item.toppings.length > 0 ? `<div class="item-details">${escHtml(t("toppings"))}: ${item.toppings.map((tp) => escHtml(getToppingName(tp))).join(", ")}</div>` : ""}
                    ${item.notes ? `<div class="item-details">${escHtml(t("notes"))}: ${escHtml(item.notes)}</div>` : ""}
                  </div>
                `;
              })
              .join("")}
          </div>
          <div class="total">
            <div style="border-top: 1px solid #333; padding-top: 8px;">
              <div>${escHtml(t("before_tax"))}: ${escHtml(fpLocal(receiptSubtotal))}</div>
              <div>${escHtml(t("tax"))}: ${escHtml(fpLocal(receiptTax))}</div>
              <div style="font-size: 20px; margin-top: 4px;">${escHtml(t("after_tax"))}: ${escHtml(fpLocal(receiptTotal))}</div>
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.documentElement.innerHTML = receiptHtml;
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    } catch (err) {
      console.error("Failed to print receipt:", err);
    } finally {
      setIsPrinting(false);
    }
  };

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const getStatusStyle = (status: OrderStatus): string => {
    switch (status) {
      case "new":
        return "bg-[#60a5fa]/12 border border-[#60a5fa]/30 text-[#93c5fd]";
      case "serving":
        return "bg-[#f59e0b]/12 border border-[#f59e0b]/30 text-[#fcd34d]";
      case "ready":
        return "bg-[#4ade80]/12 border border-[#4ade80]/30 text-[#86efac]";
      case "completed":
        return "bg-[#f6e8d3]/8 border border-[#f1dcc4]/20 text-[#c9b7a0]";
      case "canceled":
        return "bg-[#f87171]/12 border border-[#f87171]/30 text-[#fca5a5]";
      default:
        return "bg-[#f6e8d3]/8 border border-[#f1dcc4]/20 text-[#c9b7a0]";
    }
  };

  const getItemStatusStyle = (status: OrderItemStatus): string => {
    switch (status) {
      case "new":
      case "ordered":
        return "bg-[#60a5fa]/12 border border-[#60a5fa]/30 text-[#93c5fd]";
      case "preparing":
        return "bg-[#f59e0b]/12 border border-[#f59e0b]/30 text-[#fcd34d]";
      case "ready":
        return "bg-[#4ade80]/12 border border-[#4ade80]/30 text-[#86efac]";
      case "served":
        return "bg-[#f6e8d3]/8 border border-[#f1dcc4]/20 text-[#c9b7a0]";
      case "canceled":
        return "bg-[#f87171]/12 border border-[#f87171]/30 text-[#fca5a5]";
      default:
        return "bg-[#f6e8d3]/8 border border-[#f1dcc4]/20 text-[#c9b7a0]";
    }
  };

  const getItemStatus = (status?: string | null): OrderItemStatus => {
    if (!status) return "new";
    return isOrderItemStatus(status) ? status : "new";
  };

  const getItemTotal = (item: OrderItem) =>
    item.total ?? (item.price_at_order ?? item.unit_price) * item.quantity;

  const getMenuItemName = (item: OrderItem) => {
    switch (locale) {
      case "ja":
        return item.name_ja || item.name_en;
      case "vi":
        return item.name_vi || item.name_en;
      default:
        return item.name_en;
    }
  };

  const getSizeName = (item: OrderItem) => {
    if (!item.menu_item_sizes) return null;
    switch (locale) {
      case "ja":
        return item.menu_item_sizes.name_ja || item.menu_item_sizes.name_en;
      case "vi":
        return item.menu_item_sizes.name_vi || item.menu_item_sizes.name_en;
      default:
        return item.menu_item_sizes.name_en;
    }
  };

  const getToppingName = (topping: Topping) => {
    switch (locale) {
      case "ja":
        return topping.name_ja || topping.name_en;
      case "vi":
        return topping.name_vi || topping.name_en;
      default:
        return topping.name_en;
    }
  };

  const currency = restaurantSettings?.currency;
  const fp = (amount: number) => formatPrice(amount, currency, locale);
  const orderItems = historyData?.order?.items ?? [];
  const itemSubtotalAmount = orderItems.reduce((sum, item) => {
    if (getItemStatus(item.status) === "canceled") return sum;
    return sum + getItemTotal(item);
  }, 0);
  const orderTotalAmount = historyData?.order?.total_amount ?? 0;
  const taxAmount = historyData?.order?.tax_amount ?? 0;
  const subtotalAmount =
    itemSubtotalAmount || Math.max(orderTotalAmount - taxAmount, 0);
  const totalAmount = subtotalAmount + taxAmount;

  const customerTheme = useMemo(
    () => createCustomerBrandTheme(restaurantSettings?.primaryColor),
    [restaurantSettings?.primaryColor],
  );
  const customerThemeProperties = useMemo(
    () => createCustomerThemeProperties(customerTheme.primary),
    [customerTheme.primary],
  );
  const brandColor = customerTheme.primary;
  const companyName =
    restaurantSettings?.companyName || restaurantSettings?.name || "";

  const navigateToMenu = () => {
    const menuUrl = new URLSearchParams();
    if (sessionId && sessionData.sessionStatus === "active") {
      menuUrl.set("sessionId", sessionId);
    }
    router.push(
      buildCustomerPath({
        locale,
        path: "menu",
        branchCode: activeBranchCode,
        searchParams: menuUrl,
      }),
    );
  };

  const spinnerStyle = { borderBottomColor: brandColor };

  if (isLoading || contextLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#0B0A08" }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4"
            style={spinnerStyle}
          />
          <p className="text-[#c9b7a0] text-sm">{t("loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !historyData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ backgroundColor: "#0B0A08" }}
      >
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-[#f1dcc4]/14 bg-[#f6e8d3]/8">
            <UtensilsCrossed className="h-6 w-6 text-[#c9b7a0]" />
          </div>
          <h2 className="text-xl font-semibold text-[#fff7e9] mb-2">
            {t("error_title")}
          </h2>
          <p className="text-[#c9b7a0] text-sm mb-6">
            {error || t("error_message")}
          </p>
          <Button
            onClick={navigateToMenu}
            className="h-11 rounded-2xl text-white font-semibold"
            style={{ backgroundColor: brandColor, borderColor: brandColor }}
          >
            {t("back_to_menu")}
          </Button>
        </div>
      </div>
    );
  }

  const orderStatus = historyData.order?.status as OrderStatus | undefined;

  return (
    <div
      className="min-h-screen text-[#fff7e9]"
      style={
        {
          ...customerThemeProperties,
          background:
            "linear-gradient(180deg,#12100D 0%,#0B0A08 48%,#080705 100%)",
        } as CSSProperties
      }
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b border-[#f1dcc4]/10 bg-[#0B0A08]/90 backdrop-blur-xl"
        style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
      >
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          {/* Back */}
          <button
            onClick={navigateToMenu}
            className="flex h-9 w-9 items-center justify-center rounded-[13px] border border-[#f1dcc4]/14 bg-[#f6e8d3]/8 text-[#fff7e9] transition-colors hover:bg-[#f6e8d3]/14 flex-shrink-0"
            aria-label={t("back_to_menu")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Logo + name */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {restaurantSettings?.logoUrl ? (
              <div className="h-8 w-8 overflow-hidden rounded-[10px] border border-[#f1dcc4]/20 flex-shrink-0">
                <Image
                  src={restaurantSettings.logoUrl}
                  alt={companyName}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                />
              </div>
            ) : (
              <div
                className="h-8 w-8 rounded-[10px] flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{ backgroundColor: brandColor }}
              >
                {companyName.charAt(0) || "R"}
              </div>
            )}
            <span className="font-semibold text-[#fff7e9] truncate text-sm">
              {companyName}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {sessionId && (
              <button
                onClick={() => setShowQRDialog(true)}
                className="flex h-9 w-9 items-center justify-center rounded-[13px] border border-[#f1dcc4]/14 bg-[#f6e8d3]/8 text-[#fff7e9] transition-colors hover:bg-[#f6e8d3]/14"
                aria-label={t("share_session")}
                title={t("share_session")}
              >
                <Share2 className="h-4 w-4" />
              </button>
            )}
            {orderStatus === "completed" && (
              <button
                onClick={handlePrintReceipt}
                disabled={isPrinting}
                className="flex h-9 w-9 items-center justify-center rounded-[13px] border border-[#f1dcc4]/14 bg-[#f6e8d3]/8 text-[#fff7e9] transition-colors hover:bg-[#f6e8d3]/14 disabled:opacity-40"
                aria-label={t("print_receipt")}
                title={isPrinting ? t("printing_receipt") : t("print_receipt")}
              >
                <Printer className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 space-y-4 md:px-6">
        {/* Session info block */}
        {historyData.order && (
          <div className="rounded-[20px] border border-[#f1dcc4]/12 bg-[#f6e8d3]/5 p-5 space-y-4 shadow-[0_24px_80px_-58px_rgba(0,0,0,0.95)]">
            {/* Title + status */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-[#fff7e9] text-base leading-tight">
                {orderStatus === "completed"
                  ? `${t("order")} #${historyData.order.id.slice(-6)}`
                  : t("current_session")}
              </h2>
              {orderStatus && (
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(orderStatus)}`}
                >
                  {t(`status.${orderStatus}`)}
                </span>
              )}
            </div>

            {/* Info rows */}
            <div className="space-y-2.5">
              {historyData.order.table_name && (
                <div className="flex items-center gap-2.5 text-sm">
                  <MapPin className="h-4 w-4 text-[#e9a35e] flex-shrink-0" />
                  <span className="text-[#fff7e9]">
                    {historyData.order.table_name}
                  </span>
                </div>
              )}
              {historyData.order.guest_count && (
                <div className="flex items-center gap-2.5 text-sm text-[#c9b7a0]">
                  <Users className="h-4 w-4 text-[#e9a35e] flex-shrink-0" />
                  <span>
                    {t("guests", { count: historyData.order.guest_count })}
                  </span>
                </div>
              )}
              {historyData.order.created_at && (
                <div className="flex items-center gap-2.5 text-sm text-[#c9b7a0]">
                  <Clock className="h-4 w-4 text-[#e9a35e] flex-shrink-0" />
                  <span>
                    {t("started_at", {
                      date: formatDate(historyData.order.created_at),
                      time: formatTime(historyData.order.created_at),
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Passcode + Price breakdown */}
            <div className="grid gap-3 pt-1 sm:grid-cols-2">
              {getPasscode() && (
                <div className="rounded-[16px] border border-[#f1dcc4]/12 bg-[#f6e8d3]/8 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c9b7a0] mb-1.5">
                    {t("passcode")}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-lg font-bold tracking-widest text-[#e9a35e]">
                      {getPasscode()}
                    </span>
                    <button
                      onClick={copyPasscode}
                      className="h-7 w-7 flex items-center justify-center rounded-xl border border-[#f1dcc4]/14 bg-[#f6e8d3]/8 text-[#c9b7a0] hover:text-[#fff7e9] transition-colors"
                      aria-label={t("copy_passcode")}
                      title={passcodeCopied ? t("copied") : t("copy_passcode")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {passcodeCopied && (
                    <p className="mt-1 text-[10px] text-[#86efac]">
                      {t("copied")}
                    </p>
                  )}
                </div>
              )}

              <div className="rounded-[16px] border border-[#f1dcc4]/12 bg-[#f6e8d3]/8 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#c9b7a0] mb-1.5">
                  {t("session_total")}
                </p>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-[#c9b7a0]">{t("before_tax")}</span>
                    <span className="font-semibold tabular-nums text-[#fff7e9]">
                      {fp(subtotalAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-[#c9b7a0]">{t("tax")}</span>
                    <span className="font-semibold tabular-nums text-[#fff7e9]">
                      {fp(taxAmount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-[#f1dcc4]/12 pt-1.5">
                    <span className="text-xs font-semibold text-[#fff7e9]">
                      {t("after_tax")}
                    </span>
                    <span className="text-lg font-bold text-[#e9a35e] tabular-nums">
                      {fp(totalAmount)}
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-[#c9b7a0] mt-0.5">
                  {historyData.order.items?.length || 0} {t("items_count")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Order items */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#c9b7a0] px-1">
            {t("your_order")}
          </p>

          {!historyData.order ? (
            <div className="rounded-[24px] border border-[#f1dcc4]/12 bg-[#f6e8d3]/5 p-8 text-center">
              <UtensilsCrossed className="h-8 w-8 mx-auto mb-3 text-[#c9b7a0]" />
              <p className="text-[#c9b7a0] text-sm mb-5">{t("no_orders")}</p>
              <Button
                onClick={navigateToMenu}
                className="h-10 rounded-2xl text-white font-semibold text-sm"
                style={{ backgroundColor: brandColor, borderColor: brandColor }}
              >
                {t("start_ordering")}
              </Button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[20px] border border-[#f1dcc4]/12 bg-[#f6e8d3]/5 shadow-[0_24px_80px_-58px_rgba(0,0,0,0.95)]">
              {(historyData.order.items || []).map((item, index) => {
                const itemTotal = getItemTotal(item);
                const sizeName = getSizeName(item);
                const itemStatus = getItemStatus(item.status);

                return (
                  <div
                    key={item.id}
                    className={`flex items-start justify-between gap-4 px-5 py-4 ${index > 0 ? "border-t border-[#f1dcc4]/10" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-[#fff7e9] leading-snug">
                          {getMenuItemName(item)}
                        </p>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getItemStatusStyle(itemStatus)}`}
                        >
                          {t(`item_status.${itemStatus}`)}
                        </span>
                      </div>

                      {(sizeName ||
                        (item.toppings && item.toppings.length > 0)) && (
                        <div className="mt-1 space-y-0.5 text-sm text-[#c9b7a0]">
                          {sizeName && (
                            <p>
                              {t("size")}: {sizeName}
                            </p>
                          )}
                          {item.toppings && item.toppings.length > 0 && (
                            <p>
                              {t("toppings")}:{" "}
                              {item.toppings.map(getToppingName).join(", ")}
                            </p>
                          )}
                        </div>
                      )}

                      {item.notes && (
                        <p className="mt-1 text-sm text-[#c9b7a0]">
                          {t("notes")}: {item.notes}
                        </p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-[#c9b7a0]">×{item.quantity}</p>
                      <p className="font-semibold text-[#e9a35e] tabular-nums">
                        {fp(itemTotal)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add more items */}
        {historyData?.order?.status !== "completed" &&
          sessionData.sessionStatus === "active" && (
            <div className="pt-2 flex justify-center">
              <Button
                variant="outline"
                onClick={navigateToMenu}
                className="h-11 rounded-2xl border-[#f1dcc4]/16 bg-[#f6e8d3]/8 text-[#fff7e9] hover:bg-[#f6e8d3]/14 px-6"
              >
                {t("add_more_items")}
              </Button>
            </div>
          )}
      </div>

      {/* QR Code Dialog */}
      {sessionId && (
        <QRCodeDialog
          isOpen={showQRDialog}
          onClose={() => setShowQRDialog(false)}
          sessionId={sessionId}
          restaurantSubdomain={restaurantSettings?.subdomain || "restaurant"}
        />
      )}
    </div>
  );
}

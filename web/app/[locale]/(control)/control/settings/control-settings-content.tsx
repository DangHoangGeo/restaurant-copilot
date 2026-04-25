"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type ChangeEvent } from "react";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  CreditCard,
  ExternalLink,
  ImagePlus,
  Loader2,
  Mail,
  MapPin,
  Palette,
  Phone,
  Save,
  Sparkles,
  Trash2,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type {
  SubscriptionReceipt,
  TenantSubscription,
} from "@/shared/types/platform";

const TIMEZONES = [
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST, UTC+9)" },
  { value: "Asia/Ho_Chi_Minh", label: "Asia/Ho_Chi_Minh (ICT, UTC+7)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT, UTC+8)" },
  { value: "UTC", label: "UTC" },
];

const CURRENCIES = [
  { value: "JPY", label: "JPY" },
  { value: "VND", label: "VND" },
  { value: "USD", label: "USD" },
  { value: "SGD", label: "SGD" },
];

const COUNTRIES = [
  { value: "JP", label: "Japan" },
  { value: "VN", label: "Vietnam" },
  { value: "SG", label: "Singapore" },
  { value: "US", label: "United States" },
];

const JOB_TITLE_LABELS = {
  manager: "Manager",
  chef: "Chef",
  server: "Server",
  cashier: "Cashier",
  part_time: "Part-time",
} as const;

const GLASS_PANEL =
  "border border-[rgba(241,220,196,0.14)] bg-[#1A130D]/72 text-[#FFF8EE] shadow-xl shadow-[#080705]/25 backdrop-blur-xl";
const GLASS_SUB_PANEL =
  "border border-[rgba(241,220,196,0.12)] bg-[#FFF7E9]/8 text-[#FFF8EE] backdrop-blur-md";
const GLASS_INPUT =
  "border-[rgba(241,220,196,0.16)] bg-[#080705]/35 text-[#FFF8EE] placeholder:text-[#C9B7A0]/55 focus-visible:ring-[#C8773E]/35";
const GLASS_TABLE_HEAD = "bg-[#2E2117]/92 text-[#E9C7A4]";
const GLASS_BUTTON =
  "border-[rgba(241,220,196,0.18)] bg-[#FFF7E9]/8 text-[#F6E8D3] hover:bg-[#FFF7E9]/14 hover:text-white";
const DARK_TEXT = "text-[#FFF8EE]";
const MUTED_TEXT = "text-[#C9B7A0]";

type JobTitle = keyof typeof JOB_TITLE_LABELS;

interface OrgSettingsInitial {
  name: string;
  timezone: string;
  currency: string;
  country: string;
  logo_url: string | null;
  brand_color: string | null;
  description_en: string | null;
  description_ja: string | null;
  description_vi: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

interface RoleRate {
  job_title: JobTitle;
  hourly_rate: number | null;
  currency: string;
}

interface BrandOption {
  id: string;
  name: string;
  summary: string;
  brand_color: string;
  accent_color: string;
  color_reason: string;
  logo_url: string | null;
}

interface ControlSettingsContentProps {
  initial: OrgSettingsInitial;
  billing: {
    organizationId: string;
    restaurantId: string;
    restaurantName: string;
    subscription: TenantSubscription | null;
    planName: string | null;
    receipts: SubscriptionReceipt[];
  } | null;
  canEdit: boolean;
  publicDomain: string | null;
  publicHomeUrl: string | null;
  roleRates: RoleRate[];
}

function createForm(initial: OrgSettingsInitial) {
  return {
    name: initial.name,
    timezone: initial.timezone,
    currency: initial.currency,
    country: initial.country,
    logo_url: initial.logo_url ?? "",
    brand_color: initial.brand_color ?? "#c8773e",
    description_en: initial.description_en ?? "",
    description_ja: initial.description_ja ?? "",
    description_vi: initial.description_vi ?? "",
    address: initial.address ?? "",
    phone: initial.phone ?? "",
    email: initial.email ?? "",
  };
}

function formatMoney(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "JPY" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function DataLine({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="border-b border-[rgba(241,220,196,0.1)] py-3 last:border-0">
      <p className={cn("text-[11px]", MUTED_TEXT)}>{label}</p>
      <p className={cn("mt-1 text-sm font-medium", DARK_TEXT)}>
        {value || "-"}
      </p>
    </div>
  );
}

export function ControlSettingsContent({
  initial,
  billing,
  canEdit,
  publicDomain,
  publicHomeUrl,
  roleRates,
}: ControlSettingsContentProps) {
  const t = useTranslations("owner.settings.control");
  const locale = useLocale();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState(createForm(initial));
  const [profileOpen, setProfileOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [ratesOpen, setRatesOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [optimizingBrand, setOptimizingBrand] = useState(false);
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([]);
  const [aiPrompt, setAiPrompt] = useState({
    ownerIntro:
      initial.description_en ||
      initial.description_ja ||
      initial.description_vi ||
      "",
    cuisine: "",
    city: "",
    style: "",
    specialties: "",
  });
  const [rateDraft, setRateDraft] = useState(
    Object.fromEntries(
      roleRates.map((rate) => [
        rate.job_title,
        rate.hourly_rate == null ? "" : String(rate.hourly_rate),
      ]),
    ) as Record<JobTitle, string>,
  );
  const [savingRates, setSavingRates] = useState(false);

  const disabled = !canEdit;
  const set = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const saveSettings = async (nextForm = form) => {
    setSaving(true);
    try {
      const response = await fetch("/api/v1/owner/organization", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextForm.name || undefined,
          country: nextForm.country || undefined,
          timezone: nextForm.timezone || undefined,
          currency: nextForm.currency || undefined,
          logo_url: nextForm.logo_url || null,
          brand_color: nextForm.brand_color || null,
          description_en: nextForm.description_en || null,
          description_ja: nextForm.description_ja || null,
          description_vi: nextForm.description_vi || null,
          address: nextForm.address || null,
          phone: nextForm.phone || null,
          email: nextForm.email || null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? t("toast.saveFailed"));
      }
      toast.success(t("toast.saved"));
      setProfileOpen(false);
      router.refresh();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("toast.saveFailed"),
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploadingLogo(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/v1/owner/organization/logo", {
        method: "POST",
        body,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? t("toast.logoFailed"));
      }
      set("logo_url", data.url);
      toast.success(t("toast.logoUploaded"));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("toast.logoFailed"),
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleAiOptimize = async () => {
    const ownerIntro = aiPrompt.ownerIntro.trim();
    if (!ownerIntro) {
      toast.error(t("toast.aiNeedsIntro"));
      return;
    }

    setOptimizingBrand(true);
    try {
      const response = await fetch(
        "/api/v1/owner/organization/onboarding/ai-generate",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: form.name,
            ownerLanguage: locale === "ja" || locale === "en" ? locale : "vi",
            ownerIntro,
            cuisine: aiPrompt.cuisine || undefined,
            city: aiPrompt.city || undefined,
            style: aiPrompt.style || undefined,
            specialties: aiPrompt.specialties || undefined,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? t("toast.aiFailed"));
      }
      setForm((current) => ({
        ...current,
        description_en: data.description_en ?? current.description_en,
        description_ja: data.description_ja ?? current.description_ja,
        description_vi: data.description_vi ?? current.description_vi,
      }));
      setBrandOptions(
        Array.isArray(data.brand_options) ? data.brand_options : [],
      );
      toast.success(t("toast.aiReady"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toast.aiFailed"));
    } finally {
      setOptimizingBrand(false);
    }
  };

  const applyBrandOption = (option: BrandOption) => {
    setForm((current) => ({
      ...current,
      brand_color: option.brand_color,
      logo_url: option.logo_url ?? current.logo_url,
    }));
  };

  const saveRates = async () => {
    setSavingRates(true);
    try {
      const rates = roleRates
        .map((rate) => {
          const value = rateDraft[rate.job_title]?.trim();
          if (!value) return null;
          const hourlyRate = Number(value);
          if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
            throw new Error(t("toast.invalidRate"));
          }
          return {
            job_title: rate.job_title,
            hourly_rate: hourlyRate,
            currency: rate.currency || form.currency,
          };
        })
        .filter(Boolean);

      const response = await fetch(
        "/api/v1/owner/organization/role-pay-rates",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rates }),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? t("toast.ratesFailed"));
      }
      toast.success(t("toast.ratesSaved"));
      setRatesOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("toast.ratesFailed"),
      );
    } finally {
      setSavingRates(false);
    }
  };

  return (
    <div className="space-y-5">
      <header className="rounded-[10px] bg-[#2E2117] p-5 text-[#FFF8EE] shadow-xl shadow-[#080705]/25">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E9C7A4]">
              {t("eyebrow")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight">
              {t("title")}
            </h1>
          </div>
          {publicHomeUrl ? (
            <Button
              asChild
              className="rounded-[8px] bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
            >
              <Link href={publicHomeUrl} target="_blank">
                <ExternalLink className="h-4 w-4" />
                {t("openHome")}
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <main className="space-y-5">
          <section className={cn("rounded-[10px] p-4", GLASS_PANEL)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className={cn("text-lg font-semibold", DARK_TEXT)}>
                  {form.name}
                </h2>
                <p className={cn("mt-1 text-sm", MUTED_TEXT)}>
                  {publicDomain ?? t("domainMissing")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={cn("rounded-[8px]", GLASS_BUTTON)}
                  onClick={() => setBrandOpen(true)}
                  disabled={disabled}
                >
                  <Sparkles className="h-4 w-4" />
                  {t("optimizeBrand")}
                </Button>
                <Button
                  type="button"
                  className="rounded-[8px] bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
                  onClick={() => setProfileOpen(true)}
                  disabled={disabled}
                >
                  {t("editProfile")}
                </Button>
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[180px_minmax(0,1fr)]">
              <div className={cn("rounded-[8px] p-4", GLASS_SUB_PANEL)}>
                <div className="flex h-32 items-center justify-center overflow-hidden rounded-[8px] bg-[#080705]/35">
                  {form.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.logo_url}
                      alt={t("logoAlt")}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImagePlus className="h-9 w-9 text-[#C9B7A0]" />
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className="h-5 w-5 rounded-[5px] border border-[rgba(241,220,196,0.18)]"
                    style={{ backgroundColor: form.brand_color }}
                  />
                  <span className="font-mono text-xs text-[#C9B7A0]">
                    {form.brand_color}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <DataLine label={t("country")} value={form.country} />
                <DataLine label={t("timezone")} value={form.timezone} />
                <DataLine label={t("currency")} value={form.currency} />
                <DataLine label={t("domain")} value={publicDomain} />
                <DataLine label={t("phone")} value={form.phone} />
                <DataLine label={t("email")} value={form.email} />
                <div className="sm:col-span-2">
                  <DataLine label={t("address")} value={form.address} />
                </div>
              </div>
            </div>
          </section>

          <section className={cn("rounded-[10px] p-4", GLASS_PANEL)}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className={cn("text-base font-semibold", DARK_TEXT)}>
                  {t("publicIntro")}
                </h2>
              </div>
              <Badge className="rounded-[6px] bg-[#FFF7E9]/10 text-[#E9C7A4] hover:bg-[#FFF7E9]/10">
                EN / JA / VI
              </Badge>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                ["EN", form.description_en],
                ["JA", form.description_ja],
                ["VI", form.description_vi],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className={cn("rounded-[8px] p-3", GLASS_SUB_PANEL)}
                >
                  <p className="text-[11px] font-semibold tracking-[0.16em] text-[#E9C7A4]">
                    {label}
                  </p>
                  <p className={cn("mt-2 text-sm", MUTED_TEXT)}>
                    {value || t("empty")}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className={cn("rounded-[10px] p-4", GLASS_PANEL)}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className={cn("text-base font-semibold", DARK_TEXT)}>
                  {t("salaryRates")}
                </h2>
                <p className={cn("mt-1 text-sm", MUTED_TEXT)}>
                  {t("salaryRatesHint")}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                className={cn("rounded-[8px]", GLASS_BUTTON)}
                onClick={() => setRatesOpen(true)}
                disabled={disabled}
              >
                <WalletCards className="h-4 w-4" />
                {t("editRates")}
              </Button>
            </div>
            <div className="mt-4 overflow-hidden rounded-[8px] border border-[rgba(241,220,196,0.14)] bg-[#080705]/22">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={GLASS_TABLE_HEAD}>
                      {t("role")}
                    </TableHead>
                    <TableHead className={cn(GLASS_TABLE_HEAD, "text-right")}>
                      {t("hourlyRate")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleRates.map((rate) => (
                    <TableRow
                      key={rate.job_title}
                      className="border-[rgba(241,220,196,0.08)] hover:bg-[#FFF7E9]/6"
                    >
                      <TableCell className={cn("py-3", DARK_TEXT)}>
                        {JOB_TITLE_LABELS[rate.job_title]}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "py-3 text-right tabular-nums",
                          MUTED_TEXT,
                        )}
                      >
                        {rate.hourly_rate == null
                          ? t("notSet")
                          : formatMoney(
                              rate.hourly_rate,
                              rate.currency,
                              locale,
                            )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </section>
        </main>

        <aside className="space-y-5">
          <section className={cn("rounded-[10px] p-4", GLASS_PANEL)}>
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-[#E9A35E]" />
              <h2 className={cn("text-sm font-semibold", DARK_TEXT)}>
                {t("homePage")}
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              <DataLine label={t("domain")} value={publicDomain} />
              {publicHomeUrl ? (
                <Button
                  asChild
                  variant="outline"
                  className={cn("w-full rounded-[8px]", GLASS_BUTTON)}
                >
                  <Link href={publicHomeUrl} target="_blank">
                    <ExternalLink className="h-4 w-4" />
                    {t("openHome")}
                  </Link>
                </Button>
              ) : null}
            </div>
          </section>

          <section className={cn("rounded-[10px] p-4", GLASS_PANEL)}>
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#E9A35E]" />
              <h2 className={cn("text-sm font-semibold", DARK_TEXT)}>
                {t("subscription")}
              </h2>
            </div>
            {billing?.subscription ? (
              <div className="mt-4 space-y-3">
                <DataLine
                  label={t("plan")}
                  value={billing.planName ?? billing.subscription.plan_id}
                />
                <DataLine
                  label={t("status")}
                  value={billing.subscription.status}
                />
                <DataLine
                  label={t("renewal")}
                  value={new Date(
                    billing.subscription.current_period_end,
                  ).toLocaleDateString()}
                />
                {billing.receipts.slice(0, 3).map((receipt) => (
                  <div
                    key={receipt.id}
                    className={cn("rounded-[8px] p-3", GLASS_SUB_PANEL)}
                  >
                    <p className={cn("text-sm font-medium", DARK_TEXT)}>
                      {receipt.receipt_number}
                    </p>
                    <p className={cn("mt-1 text-xs", MUTED_TEXT)}>
                      {receipt.currency} {Number(receipt.total).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className={cn("mt-4 text-sm", MUTED_TEXT)}>
                {t("billingUnavailable")}
              </p>
            )}
          </section>
        </aside>
      </div>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className={cn("max-w-4xl rounded-[10px]", GLASS_PANEL)}>
          <DialogHeader>
            <DialogTitle className={DARK_TEXT}>{t("editProfile")}</DialogTitle>
            <DialogDescription className={MUTED_TEXT}>
              {t("editProfileHint")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[68vh] gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
            <Field label={t("companyName")}>
              <Input
                className={GLASS_INPUT}
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <Field label={t("country")}>
              <Select
                value={form.country}
                onValueChange={(value) => set("country", value)}
              >
                <SelectTrigger className={GLASS_INPUT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(241,220,196,0.14)] bg-[#1A130D] text-[#FFF8EE]">
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country.value} value={country.value}>
                      {country.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("timezone")}>
              <Select
                value={form.timezone}
                onValueChange={(value) => set("timezone", value)}
              >
                <SelectTrigger className={GLASS_INPUT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(241,220,196,0.14)] bg-[#1A130D] text-[#FFF8EE]">
                  {TIMEZONES.map((timezone) => (
                    <SelectItem key={timezone.value} value={timezone.value}>
                      {timezone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("currency")}>
              <Select
                value={form.currency}
                onValueChange={(value) => set("currency", value)}
              >
                <SelectTrigger className={GLASS_INPUT}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[rgba(241,220,196,0.14)] bg-[#1A130D] text-[#FFF8EE]">
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("brandColor")}>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={form.brand_color}
                  onChange={(event) => set("brand_color", event.target.value)}
                  className="h-10 w-14 rounded-[8px] border border-[rgba(241,220,196,0.16)] bg-[#080705]/35 p-1"
                />
                <Input
                  className={cn(GLASS_INPUT, "font-mono")}
                  value={form.brand_color}
                  onChange={(event) => set("brand_color", event.target.value)}
                  maxLength={7}
                />
              </div>
            </Field>
            <Field label={t("logo")}>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className={cn("rounded-[8px]", GLASS_BUTTON)}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  {t("uploadLogo")}
                </Button>
                {form.logo_url ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-[8px] text-red-300 hover:bg-red-500/10 hover:text-red-200"
                    onClick={() => set("logo_url", "")}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("remove")}
                  </Button>
                ) : null}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoSelected}
                />
              </div>
            </Field>
            <Field label={t("address")} className="sm:col-span-2">
              <IconInput icon={<MapPin className="h-3.5 w-3.5" />}>
                <Input
                  className={cn(GLASS_INPUT, "pl-9")}
                  value={form.address}
                  onChange={(event) => set("address", event.target.value)}
                />
              </IconInput>
            </Field>
            <Field label={t("phone")}>
              <IconInput icon={<Phone className="h-3.5 w-3.5" />}>
                <Input
                  className={cn(GLASS_INPUT, "pl-9")}
                  value={form.phone}
                  onChange={(event) => set("phone", event.target.value)}
                />
              </IconInput>
            </Field>
            <Field label={t("email")}>
              <IconInput icon={<Mail className="h-3.5 w-3.5" />}>
                <Input
                  className={cn(GLASS_INPUT, "pl-9")}
                  type="email"
                  value={form.email}
                  onChange={(event) => set("email", event.target.value)}
                />
              </IconInput>
            </Field>
            {[
              ["description_en", "EN"],
              ["description_ja", "JA"],
              ["description_vi", "VI"],
            ].map(([key, label]) => (
              <Field
                key={key}
                label={`${t("publicIntro")} ${label}`}
                className="sm:col-span-2"
              >
                <Textarea
                  className={cn("min-h-24 rounded-[8px]", GLASS_INPUT)}
                  value={form[key as keyof typeof form]}
                  onChange={(event) =>
                    set(key as keyof typeof form, event.target.value)
                  }
                  maxLength={1000}
                />
              </Field>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className={GLASS_BUTTON}
              onClick={() => setProfileOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              className="bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
              onClick={() => saveSettings()}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={brandOpen} onOpenChange={setBrandOpen}>
        <DialogContent className={cn("max-w-4xl rounded-[10px]", GLASS_PANEL)}>
          <DialogHeader>
            <DialogTitle className={DARK_TEXT}>
              {t("optimizeBrand")}
            </DialogTitle>
            <DialogDescription className={MUTED_TEXT}>
              {t("optimizeBrandHint")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[68vh] gap-4 overflow-y-auto pr-1 lg:grid-cols-[1fr_1fr]">
            <div className="space-y-3">
              <Field label={t("aiIntro")}>
                <Textarea
                  className={cn("min-h-28 rounded-[8px]", GLASS_INPUT)}
                  value={aiPrompt.ownerIntro}
                  onChange={(event) =>
                    setAiPrompt((current) => ({
                      ...current,
                      ownerIntro: event.target.value,
                    }))
                  }
                />
              </Field>
              {(["cuisine", "city", "style", "specialties"] as const).map(
                (key) => (
                  <Field key={key} label={t(key)}>
                    <Input
                      className={GLASS_INPUT}
                      value={aiPrompt[key]}
                      onChange={(event) =>
                        setAiPrompt((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </Field>
                ),
              )}
              <Button
                className="w-full rounded-[8px] bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
                onClick={handleAiOptimize}
                disabled={optimizingBrand}
              >
                {optimizingBrand ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {t("requestAi")}
              </Button>
            </div>

            <div className="space-y-3">
              {brandOptions.length > 0 ? (
                brandOptions.map((option) => (
                  <div
                    key={option.id}
                    className={cn("rounded-[8px] p-3", GLASS_SUB_PANEL)}
                  >
                    <div className="flex gap-3">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-[#080705]/35">
                        {option.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={option.logo_url}
                            alt={option.name}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Palette className="h-6 w-6 text-[#C9B7A0]" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("font-medium", DARK_TEXT)}>
                          {option.name}
                        </p>
                        <p className={cn("mt-1 text-xs", MUTED_TEXT)}>
                          {option.summary}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className="h-4 w-4 rounded-[4px]"
                            style={{ backgroundColor: option.brand_color }}
                          />
                          <span className="font-mono text-xs text-[#C9B7A0]">
                            {option.brand_color}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn("mt-3 w-full rounded-[8px]", GLASS_BUTTON)}
                      onClick={() => applyBrandOption(option)}
                    >
                      {t("apply")}
                    </Button>
                  </div>
                ))
              ) : (
                <div
                  className={cn(
                    "rounded-[8px] p-4 text-sm",
                    GLASS_SUB_PANEL,
                    MUTED_TEXT,
                  )}
                >
                  {t("aiEmpty")}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className={GLASS_BUTTON}
              onClick={() => setBrandOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              className="bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
              onClick={async () => {
                const saved = await saveSettings();
                if (saved) setBrandOpen(false);
              }}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ratesOpen} onOpenChange={setRatesOpen}>
        <DialogContent className={cn("max-w-2xl rounded-[10px]", GLASS_PANEL)}>
          <DialogHeader>
            <DialogTitle className={DARK_TEXT}>{t("salaryRates")}</DialogTitle>
            <DialogDescription className={MUTED_TEXT}>
              {t("salaryRatesHint")}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {roleRates.map((rate) => (
              <Field
                key={rate.job_title}
                label={JOB_TITLE_LABELS[rate.job_title]}
              >
                <Input
                  className={GLASS_INPUT}
                  inputMode="decimal"
                  value={rateDraft[rate.job_title] ?? ""}
                  onChange={(event) =>
                    setRateDraft((current) => ({
                      ...current,
                      [rate.job_title]: event.target.value,
                    }))
                  }
                  placeholder={formatMoney(0, rate.currency, locale)}
                />
              </Field>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className={GLASS_BUTTON}
              onClick={() => setRatesOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              className="bg-[#AB6E3C] text-white hover:bg-[#8A4E24]"
              onClick={saveRates}
              disabled={savingRates}
            >
              {savingRates ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className={cn("text-xs", MUTED_TEXT)}>{label}</Label>
      {children}
    </div>
  );
}

function IconInput({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#C9B7A0]">
        {icon}
      </span>
      {children}
    </div>
  );
}

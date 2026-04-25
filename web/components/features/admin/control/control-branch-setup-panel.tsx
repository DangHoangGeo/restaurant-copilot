"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Pencil } from "lucide-react";
import { OperatingHoursEditor } from "@/components/features/admin/dashboard/OperatingHoursEditor";
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
import type { BranchTeamPayrollData } from "@/lib/server/control/branch-team";
import type { OpeningHours } from "@/lib/utils/opening-hours";

export interface BranchSetupState {
  name: string;
  address: string;
  phone: string;
  email: string;
  timezone: string;
  currency: string;
  tax: string;
  default_language: string;
  opening_hours: OpeningHours;
}

interface SetupOption {
  value: string;
  label: string;
}

interface ControlBranchSetupPanelProps {
  branchId: string;
  subdomain: string;
  onboarded: boolean | null;
  settings: BranchSetupState;
  onSaveSettings: (nextSettings: BranchSetupState) => Promise<boolean>;
  savingSettings: boolean;
  timezoneOptions: SetupOption[];
  currencyOptions: SetupOption[];
  languageOptions: SetupOption[];
  teamPayroll: BranchTeamPayrollData;
  fallbackCurrency: string;
}

function formatMoney(amount: number, currency: string, locale: string): string {
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

const weekdayKeys = [
  ["monday", "teamPanel.weekdays.mon"],
  ["tuesday", "teamPanel.weekdays.tue"],
  ["wednesday", "teamPanel.weekdays.wed"],
  ["thursday", "teamPanel.weekdays.thu"],
  ["friday", "teamPanel.weekdays.fri"],
  ["saturday", "teamPanel.weekdays.sat"],
  ["sunday", "teamPanel.weekdays.sun"],
] as const;

const editButtonClass =
  "rounded-md border-[#E9C27B]/45 bg-[#E9C27B]/12 px-3 text-xs font-medium text-[#FFE3A6] hover:bg-[#E9C27B]/20 hover:text-[#FFF7E9]";
const dialogContentClass =
  "max-h-[92svh] overflow-y-auto rounded-lg border-[#F1DCC4]/14 bg-[#17110C] p-0 text-[#FFF7E9] shadow-2xl shadow-black/40";
const dialogHeaderClass =
  "border-b border-[#F1DCC4]/10 bg-[#FFF7E9]/6 px-5 py-4";
const dialogBodyClass = "space-y-4 px-5 py-5";
const labelClass = "text-xs font-medium text-[#D8C6AF]";
const inputClass =
  "h-10 rounded-md border-[#F1DCC4]/18 bg-[#FFF7E9]/8 text-[#FFF7E9] placeholder:text-[#8F7762] focus-visible:ring-[#D6A85F]/35";
const selectContentClass = "border-[#F1DCC4]/14 bg-[#201812] text-[#FFF7E9]";
const cancelButtonClass =
  "rounded-md text-[#D8C6AF] hover:bg-[#FFF7E9]/10 hover:text-[#FFF7E9]";
const saveButtonClass =
  "gap-2 rounded-md bg-[#E9C27B] text-[#20150C] hover:bg-[#FFD991]";

export function ControlBranchSetupPanel({
  subdomain,
  onboarded,
  settings,
  onSaveSettings,
  savingSettings,
  timezoneOptions,
  currencyOptions,
  languageOptions,
  teamPayroll,
  fallbackCurrency,
}: ControlBranchSetupPanelProps) {
  const locale = useLocale();
  const t = useTranslations("owner.control.branchDetail");
  const [basicDialogOpen, setBasicDialogOpen] = useState(false);
  const [regionalDialogOpen, setRegionalDialogOpen] = useState(false);
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [basicDraft, setBasicDraft] = useState(settings);
  const [regionalDraft, setRegionalDraft] = useState(settings);
  const [hoursDraft, setHoursDraft] = useState(settings.opening_hours);

  useEffect(() => {
    setBasicDraft(settings);
    setRegionalDraft(settings);
    setHoursDraft(settings.opening_hours);
  }, [settings]);

  const payrollCurrency =
    teamPayroll.rolePayRates.find((rate) => rate.currency)?.currency ??
    settings.currency ??
    fallbackCurrency;
  const taxLabel = settings.tax ? `${settings.tax}%` : t("common.notSet");
  const defaultLanguageLabel =
    languageOptions.find((option) => option.value === settings.default_language)
      ?.label ?? t("common.notSet");
  const timezoneLabel =
    timezoneOptions.find((option) => option.value === settings.timezone)
      ?.label ?? settings.timezone;
  const currencyLabel =
    currencyOptions.find((option) => option.value === settings.currency)
      ?.label ?? settings.currency;

  const openingHoursRows = useMemo(
    () =>
      weekdayKeys.map(([day, labelKey]) => {
        const value = settings.opening_hours[day];
        return {
          key: day,
          dayLabel: t(labelKey),
          value:
            !value || value.isClosed || !value.isOpen
              ? t("setup.closed")
              : `${value.openTime} - ${value.closeTime}`,
        };
      }),
    [settings.opening_hours, t],
  );

  const handleBasicSave = async () => {
    const success = await onSaveSettings({
      ...settings,
      name: basicDraft.name,
      phone: basicDraft.phone,
      email: basicDraft.email,
      address: basicDraft.address,
    });

    if (success) {
      setBasicDialogOpen(false);
    }
  };

  const handleRegionalSave = async () => {
    const success = await onSaveSettings({
      ...settings,
      timezone: regionalDraft.timezone,
      currency: regionalDraft.currency,
      tax: regionalDraft.tax,
      default_language: regionalDraft.default_language,
    });

    if (success) {
      setRegionalDialogOpen(false);
    }
  };

  const handleHoursSave = async () => {
    const success = await onSaveSettings({
      ...settings,
      opening_hours: hoursDraft,
    });

    if (success) {
      setHoursDialogOpen(false);
    }
  };

  return (
    <div className="max-w-5xl space-y-5">
      {onboarded !== true ? (
        <div className="rounded-xl border border-[#F2B36F]/25 bg-[#F2B36F]/12 px-4 py-4 text-sm text-[#F2B36F]">
          {t("setup.readyBanner")}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] text-[#FFF7E9] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#F1DCC4]/10 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#FFF7E9]">
              {t("setup.basicInfo")}
            </h2>
            <p className="mt-0.5 text-xs text-[#C9B7A0]">
              {t("setup.basicInfoHint")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={editButtonClass}
            onClick={() => setBasicDialogOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("setup.edit")}
          </Button>
        </div>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="w-40 px-4 py-3 text-sm font-medium">
                {t("setup.branchName")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                {settings.name}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">
                {t("setup.domain")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                {subdomain}.coorder.ai
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">
                {t("setup.phone")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                {settings.phone || t("common.notSet")}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">
                {t("setup.email")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                {settings.email || t("common.notSet")}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">
                {t("setup.address")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                {settings.address || t("common.notSet")}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] text-[#FFF7E9] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#F1DCC4]/10 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#FFF7E9]">
              {t("setup.regional")}
            </h2>
            <p className="mt-0.5 text-xs text-[#C9B7A0]">
              {t("setup.regionalHint")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={editButtonClass}
            onClick={() => setRegionalDialogOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("setup.edit")}
          </Button>
        </div>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="w-40 px-4 py-3 text-sm font-medium">
                {t("setup.timezone")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                {timezoneLabel || t("common.notSet")}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">
                {t("setup.currency")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                {currencyLabel || t("common.notSet")}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">
                {t("setup.taxRate")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                {taxLabel}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">
                {t("setup.defaultLanguage")}
              </TableCell>
              <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                {defaultLanguageLabel}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] text-[#FFF7E9] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#F1DCC4]/10 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#FFF7E9]">
              {t("setup.openingHours")}
            </h2>
            <p className="mt-0.5 text-xs text-[#C9B7A0]">
              {t("setup.openingHoursHint")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={editButtonClass}
            onClick={() => setHoursDialogOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            {t("setup.edit")}
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4 py-3">{t("setup.day")}</TableHead>
              <TableHead className="px-4 py-3">{t("setup.hours")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {openingHoursRows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="px-4 py-3 text-sm font-medium">
                  {row.dayLabel}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                  {row.value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#F1DCC4]/14 bg-[#FFF7E9]/[0.075] text-[#FFF7E9] backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 border-b border-[#F1DCC4]/10 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-[#FFF7E9]">
              {t("setup.roleRates")}
            </h2>
            <p className="mt-0.5 text-xs text-[#C9B7A0]">
              {t("setup.roleRatesHint")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="rounded-full border border-[#E9C27B]/30 bg-[#E9C27B]/10 text-[#FFE3A6] hover:bg-[#E9C27B]/10">
              {t("setup.inheritedFromCompany")}
            </Badge>
            <Badge className="rounded-full border border-[#F1DCC4]/14 bg-[#FFF7E9]/8 text-[#C9B7A0] hover:bg-[#FFF7E9]/8">
              {payrollCurrency}
            </Badge>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4 py-3">{t("setup.role")}</TableHead>
              <TableHead className="px-4 py-3">
                {t("setup.hourlyRate")}
              </TableHead>
              <TableHead className="px-4 py-3">
                {t("setup.rateSource")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamPayroll.rolePayRates.map((rate) => (
              <TableRow key={rate.jobTitle}>
                <TableCell className="px-4 py-3 text-sm font-medium">
                  {t(`options.roles.${rate.jobTitle}`)}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                  {rate.hourlyRate != null
                    ? formatMoney(
                        rate.hourlyRate,
                        rate.currency || payrollCurrency,
                        locale,
                      )
                    : t("setup.rateNotSet")}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-[#C9B7A0]">
                  {t("setup.companyPolicy")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="border-t border-[#F1DCC4]/10 px-4 py-3 text-xs leading-5 text-[#A98F75]">
          {t("setup.roleRatesCompanyNote")}
        </div>
      </section>

      <Dialog open={basicDialogOpen} onOpenChange={setBasicDialogOpen}>
        <DialogContent className={`${dialogContentClass} sm:max-w-lg`}>
          <div className={dialogHeaderClass}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-[#FFF7E9]">
                {t("setup.basicInfo")}
              </DialogTitle>
              <DialogDescription className="text-sm text-[#CDBAA3]">
                {t("setup.basicInfoHint")}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className={dialogBodyClass}>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("setup.branchName")}</Label>
              <Input
                value={basicDraft.name}
                onChange={(event) =>
                  setBasicDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder={t("setup.branchNamePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("setup.phone")}</Label>
              <Input
                value={basicDraft.phone}
                onChange={(event) =>
                  setBasicDraft((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder={t("setup.phonePlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("setup.email")}</Label>
              <Input
                type="email"
                value={basicDraft.email}
                onChange={(event) =>
                  setBasicDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder={t("setup.emailPlaceholder")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("setup.address")}</Label>
              <Input
                value={basicDraft.address}
                onChange={(event) =>
                  setBasicDraft((current) => ({
                    ...current,
                    address: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder={t("setup.addressPlaceholder")}
              />
            </div>
          </div>
          <DialogFooter className="border-t border-[#F1DCC4]/10 px-5 py-4">
            <Button
              variant="ghost"
              className={cancelButtonClass}
              onClick={() => setBasicDialogOpen(false)}
            >
              {t("team.cancel")}
            </Button>
            <Button
              onClick={handleBasicSave}
              disabled={savingSettings}
              className={saveButtonClass}
            >
              {savingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t("setup.saveBasicInfo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={regionalDialogOpen} onOpenChange={setRegionalDialogOpen}>
        <DialogContent className={`${dialogContentClass} sm:max-w-lg`}>
          <div className={dialogHeaderClass}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-[#FFF7E9]">
                {t("setup.regional")}
              </DialogTitle>
              <DialogDescription className="text-sm text-[#CDBAA3]">
                {t("setup.regionalHint")}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className={`${dialogBodyClass} grid gap-4 sm:grid-cols-2`}>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("setup.timezone")}</Label>
              <Select
                value={regionalDraft.timezone}
                onValueChange={(value) =>
                  setRegionalDraft((current) => ({
                    ...current,
                    timezone: value,
                  }))
                }
              >
                <SelectTrigger className={`${inputClass} w-full text-sm`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {timezoneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("setup.currency")}</Label>
              <Select
                value={regionalDraft.currency}
                onValueChange={(value) =>
                  setRegionalDraft((current) => ({
                    ...current,
                    currency: value,
                  }))
                }
              >
                <SelectTrigger className={`${inputClass} w-full text-sm`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("setup.taxRate")}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={regionalDraft.tax}
                onChange={(event) =>
                  setRegionalDraft((current) => ({
                    ...current,
                    tax: event.target.value,
                  }))
                }
                className={inputClass}
                placeholder="10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className={labelClass}>{t("setup.defaultLanguage")}</Label>
              <Select
                value={regionalDraft.default_language}
                onValueChange={(value) =>
                  setRegionalDraft((current) => ({
                    ...current,
                    default_language: value,
                  }))
                }
              >
                <SelectTrigger className={`${inputClass} w-full text-sm`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={selectContentClass}>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t border-[#F1DCC4]/10 px-5 py-4">
            <Button
              variant="ghost"
              className={cancelButtonClass}
              onClick={() => setRegionalDialogOpen(false)}
            >
              {t("team.cancel")}
            </Button>
            <Button
              onClick={handleRegionalSave}
              disabled={savingSettings}
              className={saveButtonClass}
            >
              {savingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t("setup.saveRegional")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
        <DialogContent className={`${dialogContentClass} sm:max-w-2xl`}>
          <div className={dialogHeaderClass}>
            <DialogHeader>
              <DialogTitle className="text-base font-semibold text-[#FFF7E9]">
                {t("setup.openingHours")}
              </DialogTitle>
              <DialogDescription className="text-sm text-[#CDBAA3]">
                {t("setup.openingHoursHint")}
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="px-5 py-5">
            <OperatingHoursEditor
              value={hoursDraft}
              onChange={setHoursDraft}
              surface="controlDark"
            />
          </div>
          <DialogFooter className="border-t border-[#F1DCC4]/10 px-5 py-4">
            <Button
              variant="ghost"
              className={cancelButtonClass}
              onClick={() => setHoursDialogOpen(false)}
            >
              {t("team.cancel")}
            </Button>
            <Button
              onClick={handleHoursSave}
              disabled={savingSettings}
              className={saveButtonClass}
            >
              {savingSettings ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t("setup.saveOpeningHours")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

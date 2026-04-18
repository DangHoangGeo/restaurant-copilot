'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { OperatingHoursEditor } from '@/components/features/admin/dashboard/OperatingHoursEditor';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { BranchTeamPayrollData } from '@/lib/server/control/branch-team';
import type { OpeningHours } from '@/lib/utils/opening-hours';

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

type RoleRatesDraft = Record<string, string>;

function formatMoney(amount: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

const weekdayKeys = [
  ['monday', 'teamPanel.weekdays.mon'],
  ['tuesday', 'teamPanel.weekdays.tue'],
  ['wednesday', 'teamPanel.weekdays.wed'],
  ['thursday', 'teamPanel.weekdays.thu'],
  ['friday', 'teamPanel.weekdays.fri'],
  ['saturday', 'teamPanel.weekdays.sat'],
  ['sunday', 'teamPanel.weekdays.sun'],
] as const;

function buildRatesDraft(data: BranchTeamPayrollData): RoleRatesDraft {
  return Object.fromEntries(
    data.rolePayRates.map((rate) => [
      rate.jobTitle,
      rate.hourlyRate != null ? String(rate.hourlyRate) : '',
    ])
  );
}

export function ControlBranchSetupPanel({
  branchId,
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
  const router = useRouter();
  const t = useTranslations('owner.control.branchDetail');
  const [basicDialogOpen, setBasicDialogOpen] = useState(false);
  const [regionalDialogOpen, setRegionalDialogOpen] = useState(false);
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [ratesDialogOpen, setRatesDialogOpen] = useState(false);
  const [basicDraft, setBasicDraft] = useState(settings);
  const [regionalDraft, setRegionalDraft] = useState(settings);
  const [hoursDraft, setHoursDraft] = useState(settings.opening_hours);
  const [rateDraft, setRateDraft] = useState<RoleRatesDraft>(buildRatesDraft(teamPayroll));
  const [savingRates, setSavingRates] = useState(false);

  useEffect(() => {
    setBasicDraft(settings);
    setRegionalDraft(settings);
    setHoursDraft(settings.opening_hours);
  }, [settings]);

  useEffect(() => {
    setRateDraft(buildRatesDraft(teamPayroll));
  }, [teamPayroll]);

  const payrollCurrency =
    teamPayroll.rolePayRates.find((rate) => rate.currency)?.currency ??
    settings.currency ??
    fallbackCurrency;
  const taxLabel = settings.tax ? `${settings.tax}%` : t('common.notSet');
  const defaultLanguageLabel =
    languageOptions.find((option) => option.value === settings.default_language)?.label ??
    t('common.notSet');
  const timezoneLabel =
    timezoneOptions.find((option) => option.value === settings.timezone)?.label ??
    settings.timezone;
  const currencyLabel =
    currencyOptions.find((option) => option.value === settings.currency)?.label ??
    settings.currency;

  const openingHoursRows = useMemo(
    () =>
      weekdayKeys.map(([day, labelKey]) => {
        const value = settings.opening_hours[day];
        return {
          key: day,
          dayLabel: t(labelKey),
          value:
            !value || value.isClosed || !value.isOpen
              ? t('setup.closed')
              : `${value.openTime} - ${value.closeTime}`,
        };
      }),
    [settings.opening_hours, t]
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

  const handleRatesSave = async () => {
    const payloadRates = teamPayroll.rolePayRates
      .map((rate) => {
        const rawValue = rateDraft[rate.jobTitle]?.trim();
        if (!rawValue) {
          return null;
        }

        const hourlyRate = Number(rawValue);
        if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
          throw new Error(
            t('teamPanel.toasts.invalidRate', {
              role: t(`options.roles.${rate.jobTitle}`),
            })
          );
        }

        return {
          job_title: rate.jobTitle,
          hourly_rate: hourlyRate,
          currency: payrollCurrency,
        };
      })
      .filter(
        (
          rate
        ): rate is {
          job_title: 'manager' | 'chef' | 'server' | 'cashier';
          hourly_rate: number;
          currency: string;
        } => rate != null
      );

    setSavingRates(true);
    try {
      const response = await fetch(
        `/api/v1/owner/organization/restaurants/${branchId}/role-pay-rates`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rates: payloadRates }),
        }
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? t('teamPanel.toasts.saveRatesError'));
      }
      toast.success(t('teamPanel.toasts.saveRatesSuccess'));
      setRatesDialogOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t('teamPanel.toasts.saveRatesError')
      );
    } finally {
      setSavingRates(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-5">
      {onboarded !== true ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900">
          {t('setup.readyBanner')}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{t('setup.basicInfo')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t('setup.basicInfoHint')}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setBasicDialogOpen(true)}>
            {t('setup.edit')}
          </Button>
        </div>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="w-40 px-4 py-3 text-sm font-medium">{t('setup.branchName')}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600">{settings.name}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">{t('setup.domain')}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600">{subdomain}.coorder.ai</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">{t('setup.phone')}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600">{settings.phone || t('common.notSet')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">{t('setup.email')}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600">{settings.email || t('common.notSet')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">{t('setup.address')}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600">{settings.address || t('common.notSet')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{t('setup.regional')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t('setup.regionalHint')}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setRegionalDialogOpen(true)}>
            {t('setup.edit')}
          </Button>
        </div>
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="w-40 px-4 py-3 text-sm font-medium">{t('setup.timezone')}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600">{timezoneLabel || t('common.notSet')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">{t('setup.currency')}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600">{currencyLabel || t('common.notSet')}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">{t('setup.taxRate')}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600">{taxLabel}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="px-4 py-3 text-sm font-medium">{t('setup.defaultLanguage')}</TableCell>
              <TableCell className="px-4 py-3 text-sm text-slate-600">{defaultLanguageLabel}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{t('setup.openingHours')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t('setup.openingHoursHint')}</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setHoursDialogOpen(true)}>
            {t('setup.edit')}
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4 py-3">{t('setup.day')}</TableHead>
              <TableHead className="px-4 py-3">{t('setup.hours')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {openingHoursRows.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="px-4 py-3 text-sm font-medium">{row.dayLabel}</TableCell>
                <TableCell className="px-4 py-3 text-sm text-slate-600">{row.value}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{t('setup.roleRates')}</h2>
            <p className="mt-0.5 text-xs text-slate-500">{t('setup.roleRatesHint')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              {payrollCurrency}
            </Badge>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setRatesDialogOpen(true)}>
              {t('setup.edit')}
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="px-4 py-3">{t('setup.role')}</TableHead>
              <TableHead className="px-4 py-3">{t('setup.hourlyRate')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teamPayroll.rolePayRates.map((rate) => (
              <TableRow key={rate.jobTitle}>
                <TableCell className="px-4 py-3 text-sm font-medium">
                  {t(`options.roles.${rate.jobTitle}`)}
                </TableCell>
                <TableCell className="px-4 py-3 text-sm text-slate-600">
                  {rate.hourlyRate != null
                    ? formatMoney(rate.hourlyRate, rate.currency || payrollCurrency, locale)
                    : t('setup.rateNotSet')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Dialog open={basicDialogOpen} onOpenChange={setBasicDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-[28px]">
          <DialogHeader>
            <DialogTitle>{t('setup.basicInfo')}</DialogTitle>
            <DialogDescription>{t('setup.basicInfoHint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('setup.branchName')}</Label>
              <Input
                value={basicDraft.name}
                onChange={(event) =>
                  setBasicDraft((current) => ({ ...current, name: event.target.value }))
                }
                className="h-10 rounded-xl"
                placeholder={t('setup.branchNamePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('setup.phone')}</Label>
              <Input
                value={basicDraft.phone}
                onChange={(event) =>
                  setBasicDraft((current) => ({ ...current, phone: event.target.value }))
                }
                className="h-10 rounded-xl"
                placeholder={t('setup.phonePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('setup.email')}</Label>
              <Input
                type="email"
                value={basicDraft.email}
                onChange={(event) =>
                  setBasicDraft((current) => ({ ...current, email: event.target.value }))
                }
                className="h-10 rounded-xl"
                placeholder={t('setup.emailPlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('setup.address')}</Label>
              <Input
                value={basicDraft.address}
                onChange={(event) =>
                  setBasicDraft((current) => ({ ...current, address: event.target.value }))
                }
                className="h-10 rounded-xl"
                placeholder={t('setup.addressPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl" onClick={() => setBasicDialogOpen(false)}>
              {t('team.cancel')}
            </Button>
            <Button onClick={handleBasicSave} disabled={savingSettings} className="gap-2 rounded-xl">
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('setup.saveBasicInfo')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={regionalDialogOpen} onOpenChange={setRegionalDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-[28px]">
          <DialogHeader>
            <DialogTitle>{t('setup.regional')}</DialogTitle>
            <DialogDescription>{t('setup.regionalHint')}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('setup.timezone')}</Label>
              <Select
                value={regionalDraft.timezone}
                onValueChange={(value) =>
                  setRegionalDraft((current) => ({ ...current, timezone: value }))
                }
              >
                <SelectTrigger className="h-10 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timezoneOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('setup.currency')}</Label>
              <Select
                value={regionalDraft.currency}
                onValueChange={(value) =>
                  setRegionalDraft((current) => ({ ...current, currency: value }))
                }
              >
                <SelectTrigger className="h-10 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('setup.taxRate')}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="1"
                value={regionalDraft.tax}
                onChange={(event) =>
                  setRegionalDraft((current) => ({ ...current, tax: event.target.value }))
                }
                className="h-10 rounded-xl"
                placeholder="10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t('setup.defaultLanguage')}</Label>
              <Select
                value={regionalDraft.default_language}
                onValueChange={(value) =>
                  setRegionalDraft((current) => ({ ...current, default_language: value }))
                }
              >
                <SelectTrigger className="h-10 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl" onClick={() => setRegionalDialogOpen(false)}>
              {t('team.cancel')}
            </Button>
            <Button onClick={handleRegionalSave} disabled={savingSettings} className="gap-2 rounded-xl">
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('setup.saveRegional')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hoursDialogOpen} onOpenChange={setHoursDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle>{t('setup.openingHours')}</DialogTitle>
            <DialogDescription>{t('setup.openingHoursHint')}</DialogDescription>
          </DialogHeader>
          <div className="rounded-[24px] border border-slate-200 p-4">
            <OperatingHoursEditor value={hoursDraft} onChange={setHoursDraft} />
          </div>
          <DialogFooter>
            <Button variant="ghost" className="rounded-xl" onClick={() => setHoursDialogOpen(false)}>
              {t('team.cancel')}
            </Button>
            <Button onClick={handleHoursSave} disabled={savingSettings} className="gap-2 rounded-xl">
              {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('setup.saveOpeningHours')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ratesDialogOpen} onOpenChange={setRatesDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-[28px]">
          <DialogHeader>
            <DialogTitle>{t('setup.roleRates')}</DialogTitle>
            <DialogDescription>{t('setup.roleRatesHint')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {teamPayroll.rolePayRates.map((rate) => (
              <div key={rate.jobTitle} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{t(`options.roles.${rate.jobTitle}`)}</p>
                  <p className="text-xs text-slate-500">{t('teamPanel.rates.appliesHint')}</p>
                </div>
                <div className="flex w-32 items-center rounded-xl border bg-background px-3">
                  <Input
                    value={rateDraft[rate.jobTitle] ?? ''}
                    onChange={(event) =>
                      setRateDraft((current) => ({
                        ...current,
                        [rate.jobTitle]: event.target.value,
                      }))
                    }
                    inputMode="decimal"
                    className="h-10 border-0 bg-transparent px-0 shadow-none"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 sm:justify-between">
            <p className="text-xs text-muted-foreground">{t('teamPanel.rates.footerHint')}</p>
            <div className="flex gap-2">
              <Button variant="ghost" className="rounded-xl" onClick={() => setRatesDialogOpen(false)}>
                {t('team.cancel')}
              </Button>
              <Button onClick={handleRatesSave} disabled={savingRates} className="gap-2 rounded-xl">
                {savingRates ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('setup.saveRates')}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

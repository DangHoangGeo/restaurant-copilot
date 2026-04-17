'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { OrgEmployeeRow } from '@/lib/server/organizations/queries';
import type { BranchOverviewData } from '@/lib/server/control/branch-overview';
import type { BranchSettings, BranchDetailTab } from '@/app/[locale]/(control)/control/restaurants/[branchId]/page';

interface ControlBranchDetailClientProps {
  branch: BranchSettings;
  employees: OrgEmployeeRow[];
  overview: BranchOverviewData;
  initialTab: BranchDetailTab;
  currency: string;
  orgTimezone: string;
}

const TIMEZONES = [
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho_Chi_Minh (ICT)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'UTC', label: 'UTC' },
];

const CURRENCIES = [
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'VND', label: 'VND — Vietnamese Dong' },
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
];

const LANGUAGES = [
  { value: 'ja', label: 'Japanese (日本語)' },
  { value: 'en', label: 'English' },
  { value: 'vi', label: 'Vietnamese (Tiếng Việt)' },
];

const JOB_TITLES = [
  { value: 'manager', label: 'Manager' },
  { value: 'chef', label: 'Chef' },
  { value: 'server', label: 'Server' },
  { value: 'cashier', label: 'Cashier' },
];

const JOB_TITLE_COLORS: Record<string, string> = {
  manager: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  chef: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  server: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  cashier: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const TABS: { key: BranchDetailTab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'team', label: 'Team' },
  { key: 'setup', label: 'Setup' },
];

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: currency === 'JPY' ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function ControlBranchDetailClient({
  branch: initialBranch,
  employees: initialEmployees,
  overview,
  initialTab,
  currency,
}: ControlBranchDetailClientProps) {
  const appLocale = useLocale();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<BranchDetailTab>(initialTab);

  // Setup state
  const [settings, setSettings] = useState({
    name: initialBranch.name,
    address: initialBranch.address ?? '',
    phone: initialBranch.phone ?? '',
    email: initialBranch.email ?? '',
    timezone: initialBranch.timezone ?? 'Asia/Tokyo',
    currency: initialBranch.currency ?? 'JPY',
    tax: initialBranch.tax != null ? String(Math.round(initialBranch.tax * 100)) : '10',
    default_language: initialBranch.default_language ?? 'ja',
  });
  const [savingSetup, setSavingSetup] = useState(false);

  // Team state
  const employees = initialEmployees;
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', email: '', job_title: 'server' });
  const [addingEmployee, setAddingEmployee] = useState(false);

  const handleSaveSetup = async () => {
    setSavingSetup(true);
    try {
      const taxDecimal = parseFloat(settings.tax) / 100;
      const res = await fetch(`/api/v1/owner/organization/restaurants/${initialBranch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settings.name || undefined,
          address: settings.address || null,
          phone: settings.phone || null,
          email: settings.email || null,
          timezone: settings.timezone || null,
          currency: settings.currency || null,
          tax: !isNaN(taxDecimal) ? taxDecimal : undefined,
          default_language: settings.default_language || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Branch settings saved');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? 'Failed to save settings');
      }
    } finally {
      setSavingSetup(false);
    }
  };

  const handleAddEmployee = async () => {
    if (!addForm.name.trim() || !addForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    setAddingEmployee(true);
    try {
      const res = await fetch('/api/v1/owner/organization/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: initialBranch.id,
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          job_title: addForm.job_title,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(data.message ?? 'Invitation sent');
        setShowAddEmployee(false);
        setAddForm({ name: '', email: '', job_title: 'server' });
        router.refresh();
      } else {
        toast.error(data.error ?? 'Failed to add employee');
      }
    } finally {
      setAddingEmployee(false);
    }
  };

  const switchTab = (tab: BranchDetailTab) => {
    setActiveTab(tab);
    const base = `/${appLocale}/control/restaurants/${initialBranch.id}`;
    const url = tab === 'overview' ? base : `${base}?tab=${tab}`;
    router.replace(url, { scroll: false });
  };

  const monthLabel = `${overview.month.year}/${String(overview.month.month).padStart(2, '0')}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 rounded-lg shrink-0 mt-0.5"
          onClick={() => router.push(`/${appLocale}/control/restaurants`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <h1 className="text-lg font-semibold leading-tight truncate">{initialBranch.name}</h1>
            </div>
            {/* Link to subdomain */}
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 gap-1.5 rounded-lg text-xs"
              onClick={() => window.open(`https://${initialBranch.subdomain}.coorder.ai`, '_blank')}
            >
              <Globe className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Open store</span>
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground pl-9">
            {initialBranch.subdomain}.coorder.ai
          </p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="border-b">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={cn(
                'pb-3 text-sm font-medium transition-colors border-b-2',
                activeTab === tab.key
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── OVERVIEW TAB ────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Today stats */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border bg-card p-4 sm:grid-cols-4">
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Today revenue</p>
              <p className="text-xl font-semibold tabular-nums text-emerald-600">
                {fmt(overview.today_revenue, currency)}
              </p>
              <p className="text-[11px] text-muted-foreground">{overview.today_order_count} orders</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Open orders</p>
              <p className={cn(
                'text-xl font-semibold tabular-nums',
                overview.open_orders_count > 0 ? 'text-sky-600' : 'text-muted-foreground'
              )}>
                {overview.open_orders_count}
              </p>
              <p className="text-[11px] text-muted-foreground">in kitchen</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="text-xl font-semibold tabular-nums">{overview.employee_count}</p>
              <p className="text-[11px] text-muted-foreground">on roster</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{monthLabel} close</p>
              {overview.month.has_closed_snapshot ? (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-600">Closed</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <XCircle className="h-5 w-5 text-amber-500" />
                  <span className="text-sm font-medium text-amber-600">Open</span>
                </div>
              )}
              {overview.month.has_closed_snapshot && (
                <p className="text-[11px] text-muted-foreground">
                  {fmt(overview.month.revenue_total, currency)} revenue
                </p>
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              onClick={() => switchTab('team')}
              className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left hover:bg-muted/40 transition-colors"
            >
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Manage team</p>
              <p className="text-xs text-muted-foreground">{overview.employee_count} people</p>
            </button>
            <button
              onClick={() => switchTab('setup')}
              className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left hover:bg-muted/40 transition-colors"
            >
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Branch setup</p>
              <p className="text-xs text-muted-foreground">Contact, hours, tax</p>
            </button>
            <button
              onClick={() => window.open(`https://${initialBranch.subdomain}.coorder.ai/branch/menu`, '_blank')}
              className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left hover:bg-muted/40 transition-colors"
            >
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Edit menu</p>
              <p className="text-xs text-muted-foreground">Opens store dashboard</p>
            </button>
              <button
              onClick={() => router.push(`/${appLocale}/control/finance`)}
              className="flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left hover:bg-muted/40 transition-colors"
            >
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Finance</p>
              <p className="text-xs text-muted-foreground">Revenue & reports</p>
            </button>
          </div>

          {/* Top selling items today */}
          {overview.top_items.length > 0 ? (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-muted-foreground">Top items today</h2>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Item</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right pr-4">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overview.top_items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm font-medium">{item.item_name}</TableCell>
                        <TableCell className="text-center text-sm tabular-nums">{item.quantity}</TableCell>
                        <TableCell className="text-right pr-4 text-sm tabular-nums">
                          {fmt(item.revenue, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed px-4 py-5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 shrink-0" />
              No completed orders yet today.
            </div>
          )}
        </div>
      )}

      {/* ── TEAM TAB ────────────────────────────────────────────── */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{employees.length} employee{employees.length !== 1 ? 's' : ''}</span>
            </div>
            <Button
              size="sm"
              className="gap-1.5 rounded-lg"
              onClick={() => setShowAddEmployee((v) => !v)}
            >
              <Plus className="h-4 w-4" />
              Add employee
            </Button>
          </div>

          {/* Inline add form */}
          {showAddEmployee && (
            <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
              <h3 className="text-sm font-medium">Invite new employee</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Full name</Label>
                  <Input
                    value={addForm.name}
                    onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                    className="h-8 text-sm rounded-lg"
                    placeholder="Nguyen Van A"
                    autoFocus
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Email</Label>
                  <Input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm((f) => ({ ...f, email: e.target.value }))}
                    className="h-8 text-sm rounded-lg"
                    placeholder="staff@example.com"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Role</Label>
                  <Select
                    value={addForm.job_title}
                    onValueChange={(v) => setAddForm((f) => ({ ...f, job_title: v }))}
                  >
                    <SelectTrigger className="h-8 text-sm rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TITLES.map((j) => (
                        <SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleAddEmployee}
                  disabled={addingEmployee}
                  className="rounded-lg gap-1.5"
                >
                  {addingEmployee && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Send invitation
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-muted-foreground"
                  onClick={() => {
                    setShowAddEmployee(false);
                    setAddForm({ name: '', email: '', job_title: 'server' });
                  }}
                >
                  Cancel
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The employee will receive an email to set their password and access the branch.
              </p>
            </div>
          )}

          {employees.length === 0 ? (
            <div className="rounded-lg border border-dashed py-14 text-center">
              <Users className="mx-auto mb-3 h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm font-medium">No employees yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Add your first team member above.</p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Employee</TableHead>
                    <TableHead className="hidden sm:table-cell">Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="w-10 pr-3" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => (
                    <TableRow key={emp.employee_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                            {emp.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                          <p className="text-sm font-medium leading-tight">{emp.name || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {emp.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn('text-[10px] capitalize', JOB_TITLE_COLORS[emp.job_title] ?? '')}
                        >
                          {emp.job_title}
                        </Badge>
                      </TableCell>
                      <TableCell className="pr-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive"
                          disabled
                          title="Remove employee (coming soon)"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ── SETUP TAB ───────────────────────────────────────────── */}
      {activeTab === 'setup' && (
        <div className="max-w-2xl space-y-8">
          {/* Basic info */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Basic information</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Restaurant name</Label>
                <Input
                  value={settings.name}
                  onChange={(e) => setSettings((s) => ({ ...s, name: e.target.value }))}
                  className="h-9 rounded-lg text-sm"
                  placeholder="e.g. Pho Saigon Shinjuku"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Domain (read-only)</Label>
                <div className="flex h-9 items-center gap-1.5 rounded-lg border bg-muted/40 px-3 text-sm text-muted-foreground">
                  <Globe className="h-3.5 w-3.5 shrink-0" />
                  {initialBranch.subdomain}.coorder.ai
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Phone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={settings.phone}
                    onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value }))}
                    className="h-9 rounded-lg text-sm pl-8"
                    placeholder="+81-3-0000-0000"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    value={settings.email}
                    onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
                    className="h-9 rounded-lg text-sm pl-8"
                    placeholder="branch@example.com"
                  />
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-medium">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={settings.address}
                    onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value }))}
                    className="h-9 rounded-lg text-sm pl-8"
                    placeholder="Tokyo, Shinjuku-ku..."
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Regional */}
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-muted-foreground">Regional</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Timezone</Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(v) => setSettings((s) => ({ ...s, timezone: v }))}
                >
                  <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Currency</Label>
                <Select
                  value={settings.currency}
                  onValueChange={(v) => setSettings((s) => ({ ...s, currency: v }))}
                >
                  <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tax rate (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.tax}
                  onChange={(e) => setSettings((s) => ({ ...s, tax: e.target.value }))}
                  className="h-9 rounded-lg text-sm"
                  placeholder="10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Default language</Label>
                <Select
                  value={settings.default_language}
                  onValueChange={(v) => setSettings((s) => ({ ...s, default_language: v }))}
                >
                  <SelectTrigger className="h-9 rounded-lg text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          <Button onClick={handleSaveSetup} disabled={savingSetup} className="rounded-lg gap-2">
            {savingSetup && <Loader2 className="h-4 w-4 animate-spin" />}
            Save settings
          </Button>
        </div>
      )}
    </div>
  );
}

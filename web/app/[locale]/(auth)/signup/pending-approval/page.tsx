import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Globe,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getUserFromRequest } from '@/lib/server/getUserFromRequest';

function StepCard({
  icon: Icon,
  title,
  value,
}: {
  icon: typeof Globe;
  title: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border bg-background/80 p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 break-all text-sm font-medium leading-5 text-foreground">
        {value}
      </p>
    </div>
  );
}

export default async function PendingApprovalPage({
  searchParams,
  params,
}: {
  searchParams: Promise<{ org?: string; status?: string }>;
  params: Promise<{ locale: string }>;
}) {
  const [{ org, status }, { locale }] = await Promise.all([searchParams, params]);
  const user = await getUserFromRequest();
  const isRejected = status === 'rejected';
  const companyCode = org || 'your-company';

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.22),_transparent_30%),linear-gradient(180deg,#fffdf8_0%,#ffffff_45%,#f8fafc_100%)]">
      <div className="mx-auto flex max-w-4xl items-center px-4 py-10 sm:px-6">
        <div className="w-full overflow-hidden rounded-[32px] border bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="border-b bg-gradient-to-br from-amber-50 via-white to-orange-50 px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-2xl">
                <Badge variant="outline" className="rounded-full bg-white/90 px-3 py-1 text-xs">
                  {isRejected ? 'Needs attention' : 'Pending approval'}
                </Badge>

                <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {isRejected ? 'Company setup needs review' : 'Company request received'}
                </h1>

                <p className="mt-3 max-w-xl text-sm text-slate-600 sm:text-base">
                  {isRejected
                    ? 'The signup is saved, but the company needs an admin review update before control access opens.'
                    : 'Your company is created. Control access will open after platform approval.'}
                </p>
              </div>

              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] bg-slate-950 text-white shadow-lg">
                {isRejected ? (
                  <ShieldAlert className="h-10 w-10" />
                ) : (
                  <Clock3 className="h-10 w-10" />
                )}
              </div>
            </div>
          </div>

          <div className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="grid gap-4 md:grid-cols-3">
              <StepCard
                icon={Globe}
                title="Subdomain"
                value={`${companyCode}.coorder.ai`}
              />
              <StepCard
                icon={isRejected ? ShieldAlert : CheckCircle2}
                title="Status"
                value={isRejected ? 'Waiting for revision' : 'Waiting for approval'}
              />
              <StepCard
                icon={Sparkles}
                title="Next step"
                value="Owner onboarding in control"
              />
            </div>

            <div className="mt-6 rounded-[28px] border bg-slate-950 px-5 py-5 text-white sm:px-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    01
                  </p>
                  <p className="mt-2 text-sm font-medium">Company created</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    02
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {isRejected ? 'Admin follow-up needed' : 'Platform admin approval'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/60">
                    03
                  </p>
                  <p className="mt-2 text-sm font-medium">Control onboarding opens</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="rounded-2xl px-5">
                <Link href={user ? `/${locale}/control` : `/${locale}/login`}>
                  {user ? 'Open control' : 'Go to login'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl px-5">
                <Link href={`/${locale}`}>Back to homepage</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

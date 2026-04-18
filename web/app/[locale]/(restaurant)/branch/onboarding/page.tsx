import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, Clock } from "lucide-react";
import { resolveFounderControlContext } from "@/lib/server/control/access";
import { Button } from "@/components/ui/button";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { buildRootControlSectionUrl } from "@/lib/server/organizations/root-dashboard";

export default async function OnboardingPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params;
  const [founderContext, user] = await Promise.all([
    resolveFounderControlContext(),
    getUserFromRequest(),
  ]);

  if (founderContext) {
    if (!founderContext.organization.onboarding_completed_at) {
      redirect(
        buildRootControlSectionUrl(
          locale,
          "/control/onboarding",
          founderContext.organization.public_subdomain,
        ),
      );
    }

    if (
      user?.restaurantId &&
      founderContext.accessibleRestaurantIds.includes(user.restaurantId)
    ) {
      redirect(
        buildRootControlSectionUrl(
          locale,
          `/control/restaurants/${user.restaurantId}?tab=setup`,
          founderContext.organization.public_subdomain,
        ),
      );
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md items-center px-4 py-10">
      <div className="w-full rounded-[32px] border bg-card p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Building2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h1 className="mt-4 text-2xl font-semibold">Waiting for owner setup</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The company owner needs to finish the first setup before branch tools open.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Check back soon
        </div>
        <Button asChild className="mt-5 w-full rounded-2xl">
          <Link href={`/${locale}/branch`}>
            Back to branch
          </Link>
        </Button>
      </div>
    </div>
  );
}

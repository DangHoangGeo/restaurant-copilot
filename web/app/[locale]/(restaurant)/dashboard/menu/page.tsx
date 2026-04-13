
import { setRequestLocale } from 'next-intl/server';
import { MenuClientContent } from './menu-client-content';
import { MenuItem, Category } from '@/shared/types/menu';
import { resolveOrgContext } from '@/lib/server/organizations/service';
import { getActiveBranchId } from '@/lib/server/organizations/active-branch';
import { listOrganizationBranches } from '@/lib/server/organizations/queries';
import { Layers } from 'lucide-react';
import Link from 'next/link';

// Re-export types for this page
export type { MenuItem, Category };

export default async function MenuPage({
	params
}: {
	params: Promise<{ locale: string }>
}) {
	const { locale } = await params;
	setRequestLocale(locale);

	// Show an active branch indicator for multi-branch orgs
	let activeBranchName: string | null = null;
	let isMultiBranch = false;

	try {
		const ctx = await resolveOrgContext();
		if (ctx && ctx.accessibleRestaurantIds.length > 1) {
			isMultiBranch = true;
			const activeBranchId = await getActiveBranchId(ctx);
			if (activeBranchId) {
				const branches = await listOrganizationBranches(ctx.organization.id);
				const active = branches.find((b) => b.id === activeBranchId);
				activeBranchName = active?.name ?? null;
			}
		}
	} catch {
		// Non-fatal — single-restaurant owners have no org context
	}

	return (
		<div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
			{isMultiBranch && activeBranchName && (
				<div className="mb-6 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm">
					<Layers className="h-4 w-4 text-primary shrink-0" />
					<span className="text-muted-foreground">
						Editing menu for:{' '}
						<strong className="text-foreground">{activeBranchName}</strong>
					</span>
					<Link
						href={`/${locale}/dashboard/branches`}
						className="ml-auto text-xs text-primary hover:underline"
					>
						Switch branch
					</Link>
				</div>
			)}
			<MenuClientContent />
		</div>
	);
}

import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server/getUserFromRequest";
import { checkAuthorization } from "@/lib/server/rolePermissions";
import { resolveOrgContext } from "@/lib/server/organizations/service";
import { getBranchMenuWorkspace } from "@/lib/server/organizations/menu-inheritance";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveScopedBranchRouteAccess } from "@/lib/server/organizations/branch-route";

export async function GET(request: Request) {
  const user = await getUserFromRequest();

  if (!user || !user.restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authError = await checkAuthorization(user, "categories", "SELECT");
  if (authError) {
    return authError;
  }

  const requestedBranchId =
    new URL(request.url).searchParams.get("branchId") ?? user.restaurantId;
  const branchAccess = requestedBranchId
    ? await resolveScopedBranchRouteAccess(requestedBranchId)
    : null;

  if (!branchAccess) {
    return NextResponse.json(
      { error: "Branch access denied" },
      { status: 403 },
    );
  }

  const orgContext =
    branchAccess.organizationContext ?? (await resolveOrgContext());
  const branchId = branchAccess.branchId;

  const { data: branch, error: branchError } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, subdomain")
    .eq("id", branchId)
    .single();

  if (branchError || !branch) {
    return NextResponse.json(
      { error: "Failed to resolve branch context" },
      { status: 404 },
    );
  }

  try {
    const workspace = await getBranchMenuWorkspace(branch.id);

    return NextResponse.json({
      branch: {
        id: branch.id,
        name: branch.name,
        subdomain: branch.subdomain,
      },
      organization: orgContext
        ? {
            id: orgContext.organization.id,
            name: orgContext.organization.name,
          }
        : null,
      ...workspace,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load menu workspace",
      },
      { status: 500 },
    );
  }
}

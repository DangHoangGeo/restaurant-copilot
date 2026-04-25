import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  buildAuthorizationService,
  forbidden,
  requireOrgContext,
} from "@/lib/server/authorization/service";
import {
  organizationSharedMenuCategorySchema,
  organizationSharedMenuItemSchema,
} from "@/lib/server/organizations/schemas";
import {
  createOrganizationSharedCategory,
  createOrganizationSharedMenuItem,
  deleteOrganizationSharedCategory,
  deleteOrganizationSharedMenuItem,
  listOrganizationSharedMenu,
} from "@/lib/server/organizations/shared-menu";
import { syncOrganizationSharedMenuToBranches } from "@/lib/server/organizations/menu-inheritance";
import { resolveOrgContext } from "@/lib/server/organizations/service";

export async function GET() {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.can("restaurant_settings")) {
    return forbidden("Requires restaurant_settings permission");
  }

  const categories = await listOrganizationSharedMenu(ctx!.organization.id);
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const ctx = await resolveOrgContext();

  const contextError = requireOrgContext(ctx);
  if (contextError) return contextError;

  const authz = buildAuthorizationService(ctx);
  if (!authz?.can("restaurant_settings")) {
    return forbidden("Requires restaurant_settings permission");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const payload = body as { type?: string };

    if (payload.type === "category") {
      const input = organizationSharedMenuCategorySchema.parse(body);
      const category = await createOrganizationSharedCategory({
        organization_id: ctx!.organization.id,
        name_en: input.name_en,
        name_ja: input.name_ja || null,
        name_vi: input.name_vi || null,
        position: input.position,
      });

      if (!category) {
        return NextResponse.json(
          { error: "Failed to create shared category" },
          { status: 500 },
        );
      }

      try {
        await syncOrganizationSharedMenuToBranches({
          organizationId: ctx!.organization.id,
        });
      } catch (error) {
        console.error("Failed to sync shared category to branches:", error);
        await deleteOrganizationSharedCategory(
          ctx!.organization.id,
          category.id,
        );
        return NextResponse.json(
          {
            error:
              "Failed to inherit the shared category into branch menus. The shared category was rolled back.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, category }, { status: 201 });
    }

    if (payload.type === "item") {
      const input = organizationSharedMenuItemSchema.parse(body);
      const item = await createOrganizationSharedMenuItem({
        organization_id: ctx!.organization.id,
        category_id: input.category_id,
        name_en: input.name_en,
        name_ja: input.name_ja || null,
        name_vi: input.name_vi || null,
        description_en: input.description_en || null,
        description_ja: input.description_ja || null,
        description_vi: input.description_vi || null,
        price: input.price,
        image_url: input.image_url ?? null,
        available: input.available,
        position: input.position,
        sizes: input.sizes,
        toppings: input.toppings,
      });

      if (!item) {
        return NextResponse.json(
          { error: "Failed to create shared item" },
          { status: 500 },
        );
      }

      try {
        await syncOrganizationSharedMenuToBranches({
          organizationId: ctx!.organization.id,
        });
      } catch (error) {
        console.error("Failed to sync shared item to branches:", error);
        await deleteOrganizationSharedMenuItem(ctx!.organization.id, item.id);
        return NextResponse.json(
          {
            error:
              "Failed to inherit the shared item into branch menus. The shared item was rolled back.",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({ success: true, item }, { status: 201 });
    }

    return NextResponse.json(
      { error: "Unsupported shared menu payload type" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    console.error("Shared menu POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

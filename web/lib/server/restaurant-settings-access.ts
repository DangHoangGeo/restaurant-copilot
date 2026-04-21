import { buildAuthorizationService } from "./authorization/service";
import type { AuthUser } from "./getUserFromRequest";
import { resolveOrgContext } from "./organizations/service";
import type { OrgContext } from "./organizations/types";

interface RestaurantSettingsAccessParams {
  user: Pick<AuthUser, "role" | "restaurantId">;
  orgContext: OrgContext | null;
}

export function canAccessRestaurantSettings(
  params: RestaurantSettingsAccessParams,
): boolean {
  const { user, orgContext } = params;

  if (!user.restaurantId) {
    return false;
  }

  if (orgContext) {
    const authz = buildAuthorizationService(orgContext);
    return Boolean(
      authz?.can("restaurant_settings") &&
        authz.canAccessRestaurant(user.restaurantId),
    );
  }

  return user.role === "owner" || user.role === "manager";
}

export async function resolveRestaurantSettingsAccess(
  user: Pick<AuthUser, "role" | "restaurantId">,
): Promise<boolean> {
  const orgContext = await resolveOrgContext();
  return canAccessRestaurantSettings({ user, orgContext });
}

// Pending invite service and queries
//
// Implements the invite-by-email flow for Phase 2.
// An invite is created by a founder, stored with a secure token, and accepted by
// the invited person — who may or may not already have a Supabase auth account.
//
// Flow:
//   1. Founder calls createPendingInvite()    → invite row + token returned
//   2. Token is shared with invitee (email TBD; token returned to API caller for now)
//   3. Invitee calls acceptPendingInvite()    → validated, org member created
//   4. Founder may call revokePendingInvite() → sets is_active = false

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { addOrganizationMember } from './queries';
import type { PendingInvite, OrgMemberRole, ShopScope } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Invite queries (admin client — callers are validated at route level via RLS)
// ─────────────────────────────────────────────────────────────────────────────

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/** Create a pending invite. Returns the full invite row including the token. */
export async function createPendingInvite(
  orgId: string,
  invitedByUserId: string,
  email: string,
  role: OrgMemberRole,
  shopScope: ShopScope,
  selectedRestaurantIds?: string[]
): Promise<PendingInvite | null> {
  const token = generateInviteToken();

  const { data, error } = await supabaseAdmin
    .from('organization_pending_invites')
    .insert({
      organization_id: orgId,
      invited_by: invitedByUserId,
      email: email.toLowerCase().trim(),
      role,
      shop_scope: shopScope,
      selected_restaurant_ids:
        shopScope === 'selected_shops' && selectedRestaurantIds?.length
          ? selectedRestaurantIds
          : null,
      invite_token: token,
    })
    .select('*')
    .single();

  if (error || !data) {
    console.error('Failed to create pending invite:', error);
    return null;
  }

  return data as PendingInvite;
}

/**
 * List pending (not yet accepted, not revoked, not expired) invites for an org.
 * The invite_token is stripped from the returned objects — only the ID is exposed
 * to the list API. The token is only revealed at creation time.
 */
export async function listPendingInvites(
  orgId: string
): Promise<Omit<PendingInvite, 'invite_token'>[]> {
  const { data, error } = await supabaseAdmin
    .from('organization_pending_invites')
    .select(
      'id, organization_id, invited_by, email, role, shop_scope, selected_restaurant_ids, expires_at, accepted_at, accepted_by_user_id, is_active, created_at'
    )
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as Omit<PendingInvite, 'invite_token'>[];
}

/** Look up a pending invite by token (used during acceptance). Returns null if not found, expired, or already accepted/revoked. */
export async function getPendingInviteByToken(
  token: string
): Promise<PendingInvite | null> {
  const { data, error } = await supabaseAdmin
    .from('organization_pending_invites')
    .select('*')
    .eq('invite_token', token)
    .single();

  if (error || !data) return null;

  const invite = data as PendingInvite;

  // Validate state
  if (!invite.is_active) return null;
  if (invite.accepted_at !== null) return null;
  if (new Date(invite.expires_at) < new Date()) return null;

  return invite;
}

/** Revoke a pending invite (founder action). */
export async function revokePendingInvite(inviteId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('organization_pending_invites')
    .update({ is_active: false })
    .eq('id', inviteId)
    .is('accepted_at', null); // Only revoke if not already accepted

  return !error;
}

// ─────────────────────────────────────────────────────────────────────────────
// Accept invite — handles both new and existing users
// ─────────────────────────────────────────────────────────────────────────────

export interface AcceptInviteResult {
  success: boolean;
  error?: string;
  /** The user_id of the person who accepted (useful for redirect). */
  user_id?: string;
  /** Whether a new auth account was created (vs an existing user accepted). */
  new_user_created?: boolean;
}

/**
 * Accept a pending invite.
 *
 * If the invited email already has a Supabase auth account:
 *   - add them as an org member (if not already)
 *   - mark the invite accepted
 *
 * If the invited email does NOT have a Supabase auth account:
 *   - create a Supabase auth user with the provided name + password
 *   - create a users row with restaurant_id = first accessible branch
 *   - add them as an org member
 *   - mark the invite accepted
 */
export async function acceptPendingInvite(
  token: string,
  name?: string,
  password?: string
): Promise<AcceptInviteResult> {
  // 1. Validate the invite token
  const invite = await getPendingInviteByToken(token);
  if (!invite) {
    return { success: false, error: 'Invite not found, expired, or already used' };
  }

  const email = invite.email;
  let userId: string;
  let newUserCreated = false;

  // 2. Check if user already exists in Supabase auth
  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingAuthUser = existingUsers?.users?.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (existingAuthUser) {
    // User already has an auth account — just resolve their user_id
    userId = existingAuthUser.id;
  } else {
    // New user — require name and password
    if (!name || !password) {
      return {
        success: false,
        error: 'Name and password are required for new accounts',
      };
    }

    // Create the Supabase auth user
    const { data: newAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (authError || !newAuth?.user) {
      console.error('Failed to create auth user for invite acceptance:', authError);
      return { success: false, error: 'Failed to create account' };
    }

    userId = newAuth.user.id;
    newUserCreated = true;

    // Map org role → legacy users.role and decide whether the new user gets a
    // restaurant_id in the users table (which gates legacy branch-scoped route access).
    //
    // Rules:
    //   founder_full_control / founder_operations
    //     → role='owner', gets a restaurant_id (full legacy access to branch routes)
    //   founder_finance / branch_general_manager
    //     → role='manager', gets a restaurant_id (branch ops access, not org settings)
    //   accountant_readonly
    //     → role='staff', restaurant_id=null  (NO legacy branch route access — this
    //       role reads finance data only through org-level permission-gated API routes)
    //
    // This prevents accountant_readonly and similarly restricted org roles from
    // inheriting write access to branch-scoped routes that still authorize via
    // the legacy getUserFromRequest() + restaurantId path.
    const { legacyRole, assignRestaurantId } = orgRoleToLegacyMapping(invite.role);

    const restaurantId = assignRestaurantId
      ? await resolveFirstAccessibleRestaurant(invite)
      : null;

    // Create the users row
    const { error: userInsertError } = await supabaseAdmin.from('users').insert({
      id: userId,
      email,
      name,
      restaurant_id: restaurantId,
      role: legacyRole,
    });

    if (userInsertError) {
      console.error('Failed to create users row for invited member:', userInsertError);
      // Rollback the auth user
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { success: false, error: 'Failed to create user record' };
    }
  }

  // 3. Check for duplicate org membership
  const { data: existingMember } = await supabaseAdmin
    .from('organization_members')
    .select('id')
    .eq('organization_id', invite.organization_id)
    .eq('user_id', userId)
    .single();

  if (!existingMember) {
    // Add the user as an org member
    const member = await addOrganizationMember(
      invite.organization_id,
      userId,
      invite.invited_by,
      invite.role,
      invite.shop_scope,
      invite.selected_restaurant_ids ?? undefined
    );

    if (!member) {
      return { success: false, error: 'Failed to add organization member' };
    }
  }

  // 4. Mark invite as accepted
  const { error: acceptError } = await supabaseAdmin
    .from('organization_pending_invites')
    .update({
      accepted_at: new Date().toISOString(),
      accepted_by_user_id: userId,
    })
    .eq('id', invite.id);

  if (acceptError) {
    console.error('Failed to mark invite as accepted:', acceptError);
    // Non-fatal: the member is already created, just log
  }

  return { success: true, user_id: userId, new_user_created: newUserCreated };
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map an org role to the legacy users.role value and whether the new users row
 * should receive a restaurant_id.
 *
 * restaurant_id in the users table is what gives the legacy owner API routes
 * branch-scoped access.  Roles that must NOT have write access to branch ops
 * (accountant_readonly) receive restaurant_id = null so those routes gate them out.
 */
function orgRoleToLegacyMapping(orgRole: OrgMemberRole): {
  legacyRole: string;
  assignRestaurantId: boolean;
} {
  switch (orgRole) {
    case 'founder_full_control':
    case 'founder_operations':
      return { legacyRole: 'owner', assignRestaurantId: true };
    case 'founder_finance':
    case 'branch_general_manager':
      return { legacyRole: 'manager', assignRestaurantId: true };
    case 'accountant_readonly':
      // No restaurant_id — this role must not inherit legacy branch-write access.
      // Access to finance read data goes through org-permission-gated routes only.
      return { legacyRole: 'staff', assignRestaurantId: false };
  }
}

/**
 * Resolve the first accessible restaurant_id for a new invited user.
 * Used when creating a users row for someone onboarding via invite
 * (they have no existing restaurant of their own).
 */
async function resolveFirstAccessibleRestaurant(
  invite: PendingInvite
): Promise<string | null> {
  if (invite.shop_scope === 'selected_shops' && invite.selected_restaurant_ids?.length) {
    return invite.selected_restaurant_ids[0];
  }

  // For all_shops: find the org's first restaurant
  const { data: orgRestaurants } = await supabaseAdmin
    .from('organization_restaurants')
    .select('restaurant_id')
    .eq('organization_id', invite.organization_id)
    .order('added_at', { ascending: true })
    .limit(1);

  return orgRestaurants?.[0]?.restaurant_id ?? null;
}

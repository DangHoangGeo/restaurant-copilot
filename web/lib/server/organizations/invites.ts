// Pending invite service and queries
//
// Implements the invite-by-email flow for Phase 2.
// An invite is created by a founder, stored with a secure token, and accepted by
// the invited person — who may or may not already have a Supabase auth account.
//
// Flow:
//   1. Founder calls createPendingInvite()    → invite row + token returned, email sent
//   2. Invitee receives branded email with acceptance link (or token for manual distribution)
//   3. Invitee calls acceptPendingInvite()    → validated, org member created
//   4. Founder may call revokePendingInvite() → sets is_active = false

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import {
  addOrganizationMember,
  resolveLegacyRestaurantIdForOrgMember,
  validateOrganizationRestaurantScope,
} from './queries';
import { mapOrgRoleToLegacyUserAccess } from './legacy-access';
import type { PendingInvite, OrgMemberRole, ShopScope } from './types';
import { sendInviteEmail, sendResendInviteEmail } from '@/lib/server/email';

// ─────────────────────────────────────────────────────────────────────────────
// Invite queries (admin client — callers are validated at route level via RLS)
// ─────────────────────────────────────────────────────────────────────────────

function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a pending invite. Returns the full invite row including the token.
 * Also dispatches a branded invite email to the invitee (non-blocking, best-effort).
 * orgName is used in the email subject and body.
 */
export async function createPendingInvite(
  orgId: string,
  invitedByUserId: string,
  email: string,
  role: OrgMemberRole,
  shopScope: ShopScope,
  selectedRestaurantIds?: string[],
  orgName?: string
): Promise<PendingInvite | null> {
  const token = generateInviteToken();

  if (shopScope === 'selected_shops') {
    const scopeValidation = await validateOrganizationRestaurantScope(
      orgId,
      selectedRestaurantIds
    );

    if (!scopeValidation.valid) {
      console.error('Invalid pending invite shop scope:', {
        orgId,
        invalidRestaurantIds: scopeValidation.invalidRestaurantIds,
      });
      return null;
    }
  }

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

  // Send invite email asynchronously — failure is non-fatal (token still returned)
  const name = orgName ?? 'your organization';
  sendInviteEmail(email.toLowerCase().trim(), name, token).catch((err) =>
    console.error('[invites] Failed to send invite email:', err)
  );

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

/**
 * Resend a pending invite: generates a fresh token and extends expiry by 7 days.
 * Returns the new token on success, null on failure.
 * Validates that the invite belongs to the given org and has not been accepted.
 * orgName is used in the resend email subject and body.
 */
export async function resendPendingInvite(
  inviteId: string,
  orgId: string,
  orgName?: string
): Promise<{ invite_token: string; expires_at: string } | null> {
  // Fetch the current invite to validate state and get current resend_count
  const { data: invite, error: fetchError } = await supabaseAdmin
    .from('organization_pending_invites')
    .select('id, organization_id, email, is_active, accepted_at, resend_count')
    .eq('id', inviteId)
    .single();

  if (fetchError || !invite) return null;
  if (invite.organization_id !== orgId) return null;
  if (!invite.is_active || invite.accepted_at !== null) return null;

  const newToken = generateInviteToken();
  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const currentCount: number = (invite.resend_count as number | null) ?? 0;

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('organization_pending_invites')
    .update({
      invite_token: newToken,
      expires_at: newExpiry,
      last_resent_at: new Date().toISOString(),
      resend_count: currentCount + 1,
    })
    .eq('id', inviteId)
    .select('invite_token, expires_at')
    .single();

  if (updateError || !updated) {
    console.error('Failed to resend invite:', updateError);
    return null;
  }

  // Send resend email asynchronously — failure is non-fatal
  const name = orgName ?? 'your organization';
  sendResendInviteEmail(invite.email as string, name, updated.invite_token).catch((err) =>
    console.error('[invites] Failed to send resend email:', err)
  );

  return { invite_token: updated.invite_token, expires_at: updated.expires_at };
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

  // 2. Check if user already exists by looking up the users table (indexed on email).
  //    Using the users table avoids an unbounded auth.admin.listUsers() scan that would
  //    only return the first page of results and miss users beyond the page limit.
  const { data: existingUserRow } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUserRow) {
    // User already has an auth account — just resolve their user_id
    userId = existingUserRow.id;
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

    const restaurantId = await resolveLegacyRestaurantIdForOrgMember(
      invite.organization_id,
      invite.shop_scope,
      invite.selected_restaurant_ids ?? undefined
    );
    const legacyAccess = mapOrgRoleToLegacyUserAccess(
      invite.role,
      restaurantId
    );

    // Create the users row
    const { error: userInsertError } = await supabaseAdmin.from('users').insert({
      id: userId,
      email,
      name,
      restaurant_id: legacyAccess.restaurantId,
      role: legacyAccess.role,
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

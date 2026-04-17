import { canUseRootDashboard } from '@/lib/server/organizations/root-dashboard';

describe('canUseRootDashboard', () => {
  it('allows founder and finance roles onto the root-domain dashboard', () => {
    expect(canUseRootDashboard('founder_full_control')).toBe(true);
    expect(canUseRootDashboard('founder_operations')).toBe(true);
    expect(canUseRootDashboard('founder_finance')).toBe(true);
    expect(canUseRootDashboard('accountant_readonly')).toBe(true);
  });

  it('keeps branch-only roles out of the root-domain founder dashboard', () => {
    expect(canUseRootDashboard('branch_general_manager')).toBe(false);
    expect(canUseRootDashboard('staff')).toBe(false);
    expect(canUseRootDashboard(null)).toBe(false);
  });
});

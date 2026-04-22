import {
  buildBranchDashboardUrl,
  buildRootControlUrl,
  getRootControlEntryPath,
  buildRootControlSectionUrl,
  canUseRootDashboard,
} from '@/lib/server/organizations/root-dashboard';

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

describe('root dashboard urls', () => {
  const previousDev = process.env.NEXT_PRIVATE_DEVELOPMENT;
  const previousProductionUrl = process.env.NEXT_PUBLIC_PRODUCTION_URL;

  afterEach(() => {
    process.env.NEXT_PRIVATE_DEVELOPMENT = previousDev;
    process.env.NEXT_PUBLIC_PRODUCTION_URL = previousProductionUrl;
  });

  it('builds the root founder control url', () => {
    process.env.NEXT_PRIVATE_DEVELOPMENT = 'false';
    process.env.NEXT_PUBLIC_PRODUCTION_URL = 'coorder.ai';

    expect(buildRootControlUrl('ja', 'bao-an-group', '2026-04-18T00:00:00.000Z')).toBe(
      'https://bao-an-group.coorder.ai/ja/control/overview'
    );
  });

  it('falls back to the root domain when no owner subdomain is available', () => {
    process.env.NEXT_PRIVATE_DEVELOPMENT = 'false';
    process.env.NEXT_PUBLIC_PRODUCTION_URL = 'coorder.ai';

    expect(buildRootControlUrl('ja')).toBe(
      'https://coorder.ai/ja/control/onboarding'
    );
  });

  it('routes incomplete founders into owner onboarding first', () => {
    expect(getRootControlEntryPath(null)).toBe('/control/onboarding');
    expect(getRootControlEntryPath('2026-04-18T00:00:00.000Z')).toBe('/control/overview');
  });

  it('builds the branch dashboard url', () => {
    process.env.NEXT_PRIVATE_DEVELOPMENT = 'false';
    process.env.NEXT_PUBLIC_PRODUCTION_URL = 'coorder.ai';

    expect(buildBranchDashboardUrl('shibuya', 'ja')).toBe(
      'https://shibuya.coorder.ai/ja/branch'
    );
  });

  it('builds a root founder control section url', () => {
    process.env.NEXT_PRIVATE_DEVELOPMENT = 'false';
    process.env.NEXT_PUBLIC_PRODUCTION_URL = 'coorder.ai';

    expect(buildRootControlSectionUrl('ja', '/control/homepage', 'bao-an-group')).toBe(
      'https://bao-an-group.coorder.ai/ja/control/homepage'
    );
  });
});

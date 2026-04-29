/** @jest-environment node */

jest.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { closeSnapshot } from "@/lib/server/finance/queries";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type { UpsertSnapshotInput } from "@/lib/server/finance/types";

const mockedFrom = jest.mocked(supabaseAdmin.from);

const snapshotInput: UpsertSnapshotInput = {
  year: 2026,
  month: 4,
  currency: "JPY",
  revenue_total: 100000,
  order_count: 42,
  discount_total: 5000,
  approved_labor_hours: 120,
  labor_entry_count: 12,
  purchasing_total: 30000,
  expense_total: 10000,
  combined_cost_total: 40000,
  snapshot_status: "closed",
  notes: "Reviewed",
  closed_by: "user-1",
  closed_at: "2026-04-24T00:00:00.000Z",
};

function buildInsertChain(result: unknown) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn(() => ({ single }));
  const insert = jest.fn(() => ({ select }));
  return { insert, select, single };
}

function buildUpdateChain(result: unknown) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const select = jest.fn(() => ({ maybeSingle }));
  type UpdateChain = {
    eq: jest.MockedFunction<() => UpdateChain>;
    select: typeof select;
  };
  const chain: UpdateChain = {
    eq: jest.fn((): UpdateChain => chain),
    select,
  };
  const update = jest.fn(() => chain);
  return { update, chain, select, maybeSingle };
}

describe("closeSnapshot", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("inserts a closed snapshot when no monthly snapshot exists", async () => {
    const inserted = {
      id: "snapshot-1",
      restaurant_id: "branch-1",
      ...snapshotInput,
    };
    const insertChain = buildInsertChain({ data: inserted, error: null });

    mockedFrom.mockReturnValue(insertChain as never);

    await expect(closeSnapshot("branch-1", snapshotInput)).resolves.toEqual(
      inserted,
    );
    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurant_id: "branch-1",
        year: 2026,
        month: 4,
        snapshot_status: "closed",
      }),
    );
  });

  it("updates an existing draft snapshot to closed after a uniqueness conflict", async () => {
    const updated = {
      id: "snapshot-1",
      restaurant_id: "branch-1",
      ...snapshotInput,
    };
    const insertChain = buildInsertChain({
      data: null,
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    });
    const updateChain = buildUpdateChain({ data: updated, error: null });

    mockedFrom
      .mockReturnValueOnce(insertChain as never)
      .mockReturnValueOnce(updateChain as never);

    await expect(closeSnapshot("branch-1", snapshotInput)).resolves.toEqual(
      updated,
    );
    expect(updateChain.update).toHaveBeenCalled();
    expect(updateChain.chain.eq).toHaveBeenCalledWith(
      "snapshot_status",
      "draft",
    );
  });

  it("rejects duplicate closes when the existing snapshot is already closed", async () => {
    const insertChain = buildInsertChain({
      data: null,
      error: {
        code: "23505",
        message: "duplicate key value violates unique constraint",
      },
    });
    const updateChain = buildUpdateChain({ data: null, error: null });

    mockedFrom
      .mockReturnValueOnce(insertChain as never)
      .mockReturnValueOnce(updateChain as never);

    await expect(
      closeSnapshot("branch-1", snapshotInput),
    ).rejects.toMatchObject({
      message: "This month is already closed. Reopen is not supported.",
      status: 409,
    });
  });
});

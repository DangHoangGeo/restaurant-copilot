/** @jest-environment node */

jest.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

import { createPurchaseOrder } from "@/lib/server/purchasing/queries";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const mockedFrom = jest.mocked(supabaseAdmin.from);

function buildInsertChain(result: unknown) {
  const single = jest.fn().mockResolvedValue(result);
  const select = jest.fn(() => ({ single }));
  const insert = jest.fn(() => ({ select }));
  return { insert, select, single };
}

function buildInsertManyChain(result: unknown) {
  const select = jest.fn().mockResolvedValue(result);
  const insert = jest.fn(() => ({ select }));
  return { insert, select };
}

function buildDeleteChain() {
  type DeleteChain = {
    eq: jest.MockedFunction<() => DeleteChain>;
  };
  const chain: DeleteChain = {
    eq: jest.fn((): DeleteChain => chain),
  };
  const deleteFn = jest.fn(() => chain);
  return { delete: deleteFn, chain };
}

describe("createPurchaseOrder", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deletes the parent purchase order if item insertion fails", async () => {
    const order = {
      id: "purchase-order-1",
      restaurant_id: "branch-1",
      supplier_id: null,
      supplier_name: "Market",
      category: "food",
      status: "pending",
      order_date: "2026-04-24",
      received_date: null,
      total_amount: 1000,
      currency: "JPY",
      tax_amount: null,
      notes: null,
      receipt_url: null,
      is_paid: false,
      paid_at: null,
      created_by: "user-1",
      created_at: "2026-04-24T00:00:00.000Z",
      updated_at: "2026-04-24T00:00:00.000Z",
    };

    const orderInsert = buildInsertChain({ data: order, error: null });
    const itemInsert = buildInsertManyChain({
      data: null,
      error: { message: "item insert failed" },
    });
    const cleanupDelete = buildDeleteChain();

    mockedFrom
      .mockReturnValueOnce(orderInsert as never)
      .mockReturnValueOnce(itemInsert as never)
      .mockReturnValueOnce(cleanupDelete as never);

    await expect(
      createPurchaseOrder(
        "branch-1",
        {
          supplier_name: "Market",
          category: "food",
          order_date: "2026-04-24",
          total_amount: 1000,
          currency: "JPY",
          is_paid: false,
          items: [
            {
              name: "Rice",
              quantity: 2,
              unit: "kg",
              unit_price: 500,
            },
          ],
        },
        "user-1",
      ),
    ).rejects.toThrow("createPurchaseOrder items: item insert failed");

    expect(cleanupDelete.delete).toHaveBeenCalled();
    expect(cleanupDelete.chain.eq).toHaveBeenCalledWith(
      "id",
      "purchase-order-1",
    );
    expect(cleanupDelete.chain.eq).toHaveBeenCalledWith(
      "restaurant_id",
      "branch-1",
    );
  });
});

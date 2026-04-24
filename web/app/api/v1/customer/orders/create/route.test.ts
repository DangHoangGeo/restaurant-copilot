/** @jest-environment node */

jest.mock("@/lib/server/customer-session", () => ({
  appendItemsToCustomerSession: jest.fn(),
  getCustomerSessionOrder: jest.fn(),
  isCustomerSessionActiveStatus: jest.fn(),
}));

jest.mock("@/lib/server/rateLimit", () => ({
  RATE_LIMIT_CONFIGS: {
    MUTATION: { max: 20, window: "60s" },
  },
  protectEndpoint: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
  },
  startPerformanceTimer: jest.fn(),
  endPerformanceTimer: jest.fn().mockResolvedValue(undefined),
}));

import { NextRequest } from "next/server";
import { POST } from "./route";
import { logger } from "@/lib/logger";
import {
  appendItemsToCustomerSession,
  getCustomerSessionOrder,
  isCustomerSessionActiveStatus,
} from "@/lib/server/customer-session";

const mockedAppendItemsToCustomerSession = jest.mocked(appendItemsToCustomerSession);
const mockedGetCustomerSessionOrder = jest.mocked(getCustomerSessionOrder);
const mockedIsCustomerSessionActiveStatus = jest.mocked(isCustomerSessionActiveStatus);
const mockedLogger = jest.mocked(logger);

describe("POST /api/v1/customer/orders/create", () => {
  const restaurantId = "55555555-5555-4555-8555-555555555555";
  const sessionId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps cart items into the canonical append RPC payload", async () => {
    mockedGetCustomerSessionOrder.mockResolvedValue({
      id: "order-1",
      restaurant_id: restaurantId,
      table_id: "66666666-6666-4666-8666-666666666666",
      session_id: sessionId,
      guest_count: 2,
      status: "new",
      total_amount: 0,
      created_at: "2026-04-22T00:00:00.000Z",
      updated_at: "2026-04-22T00:00:00.000Z",
    });
    mockedIsCustomerSessionActiveStatus.mockReturnValue(true);
    mockedAppendItemsToCustomerSession.mockResolvedValue({
      order_id: "order-1",
      total_amount: 2450,
      updated_at: "2026-04-22T00:01:00.000Z",
    });

    const request = new NextRequest("https://example.com/api/v1/customer/orders/create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "example.com",
        origin: "https://example.com",
      },
      body: JSON.stringify({
        restaurantId,
        sessionId,
        items: [
          {
            menuItemId: "22222222-2222-4222-8222-222222222222",
            quantity: 2,
            notes: "No peanuts",
            menu_item_size_id: "33333333-3333-4333-8333-333333333333",
            topping_ids: [
              "44444444-4444-4444-8444-444444444444",
            ],
          },
        ],
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockedAppendItemsToCustomerSession).toHaveBeenCalledWith({
      restaurantId,
      sessionId,
      items: [
        {
          menu_item_id: "22222222-2222-4222-8222-222222222222",
          quantity: 2,
          notes: "No peanuts",
          menu_item_size_id: "33333333-3333-4333-8333-333333333333",
          topping_ids: [
            "44444444-4444-4444-8444-444444444444",
          ],
        },
      ],
    });
    expect(payload).toEqual({
      success: true,
      orderId: "order-1",
      totalAmount: 2450,
    });
  });

  it("blocks item appends when the session is no longer active", async () => {
    mockedGetCustomerSessionOrder.mockResolvedValue({
      id: "order-1",
      restaurant_id: restaurantId,
      table_id: "66666666-6666-4666-8666-666666666666",
      session_id: sessionId,
      guest_count: 2,
      status: "completed",
      total_amount: 0,
      created_at: "2026-04-22T00:00:00.000Z",
      updated_at: "2026-04-22T00:00:00.000Z",
    });
    mockedIsCustomerSessionActiveStatus.mockReturnValue(false);

    const request = new NextRequest("https://example.com/api/v1/customer/orders/create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "example.com",
        origin: "https://example.com",
      },
      body: JSON.stringify({
        restaurantId,
        sessionId,
        items: [
          {
            menuItemId: "22222222-2222-4222-8222-222222222222",
            quantity: 1,
          },
        ],
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(mockedAppendItemsToCustomerSession).not.toHaveBeenCalled();
    expect(payload).toEqual({
      success: false,
      error: "Invalid or expired session",
    });
  });

  it("logs structured Supabase RPC errors when item appends fail", async () => {
    mockedGetCustomerSessionOrder.mockResolvedValue({
      id: "order-1",
      restaurant_id: restaurantId,
      table_id: "66666666-6666-4666-8666-666666666666",
      session_id: sessionId,
      guest_count: 2,
      status: "new",
      total_amount: 0,
      created_at: "2026-04-22T00:00:00.000Z",
      updated_at: "2026-04-22T00:00:00.000Z",
    });
    mockedIsCustomerSessionActiveStatus.mockReturnValue(true);
    mockedAppendItemsToCustomerSession.mockRejectedValue({
      code: "42702",
      details: "It could refer to either a PL/pgSQL variable or a table column.",
      hint: null,
      message: 'column reference "total_amount" is ambiguous',
      status: 400,
    });

    const request = new NextRequest("https://example.com/api/v1/customer/orders/create", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "example.com",
        origin: "https://example.com",
      },
      body: JSON.stringify({
        restaurantId,
        sessionId,
        items: [
          {
            menuItemId: "22222222-2222-4222-8222-222222222222",
            quantity: 1,
          },
        ],
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      success: false,
      error: "Failed to save order items",
    });
    expect(mockedLogger.error).toHaveBeenCalledWith(
      "orders-create-api",
      "Unexpected order creation failure",
      {
        error: {
          code: "42702",
          details: "It could refer to either a PL/pgSQL variable or a table column.",
          hint: null,
          message: 'column reference "total_amount" is ambiguous',
          status: 400,
        },
      },
    );
  });
});

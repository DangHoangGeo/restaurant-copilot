/** @jest-environment node */

jest.mock("@/lib/supabaseAdmin", () => ({
  supabaseAdmin: {
    from: jest.fn(),
  },
}));

jest.mock("@/lib/server/customer-entry", () => ({
  resolvePublicRestaurantContext: jest.fn(),
}));

jest.mock("@/lib/server/rateLimit", () => ({
  RATE_LIMIT_CONFIGS: {
    MUTATION: { max: 20, window: "60s" },
  },
  protectEndpoint: jest.fn().mockResolvedValue(null),
}));

import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePublicRestaurantContext } from "@/lib/server/customer-entry";

const mockedSupabaseAdmin = jest.mocked(supabaseAdmin);
const mockedResolvePublicRestaurantContext = jest.mocked(
  resolvePublicRestaurantContext,
);

describe("/api/v1/customer/bookings", () => {
  const restaurantId = "55555555-5555-4555-8555-555555555555";

  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolvePublicRestaurantContext.mockResolvedValue({
      restaurant: {
        id: restaurantId,
      },
    } as Awaited<ReturnType<typeof resolvePublicRestaurantContext>>);
  });

  it("rejects requests without phone or email contact", async () => {
    const request = new NextRequest("https://example.com/api/v1/customer/bookings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "example.com",
      },
      body: JSON.stringify({
        customerName: "A Guest",
        bookingDate: "2026-05-01",
        bookingTime: "19:00",
        partySize: 2,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
    expect(payload.details.fieldErrors.customerPhone).toContain(
      "phone_or_email_required",
    );
    expect(mockedSupabaseAdmin.from).not.toHaveBeenCalled();
  });

  it("creates a pending branch booking without requiring a table", async () => {
    const insert = jest.fn();
    const select = jest.fn();
    const single = jest.fn().mockResolvedValue({
      data: {
        id: "booking-1",
        customer_name: "A Guest",
        customer_phone: "+81 80 1234 5678",
        customer_email: null,
        customer_note: "Window if possible",
        booking_date: "2026-05-01",
        booking_time: "19:00:00",
        party_size: 2,
        status: "pending",
        public_lookup_token: "11111111-1111-4111-8111-111111111111",
        updated_at: "2026-04-28T00:00:00.000Z",
      },
      error: null,
    });

    insert.mockReturnValue({ select });
    select.mockReturnValue({ single });
    mockedSupabaseAdmin.from.mockReturnValue({ insert } as never);

    const request = new NextRequest("https://example.com/api/v1/customer/bookings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: "example.com",
      },
      body: JSON.stringify({
        customerName: "A Guest",
        customerPhone: "+81 80 1234 5678",
        bookingDate: "2026-05-01",
        bookingTime: "19:00",
        partySize: 2,
        customerNote: "Window if possible",
      }),
    });

    const response = await POST(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurant_id: restaurantId,
        table_id: null,
        customer_name: "A Guest",
        customer_phone: "+81 80 1234 5678",
        booking_date: "2026-05-01",
        booking_time: "19:00",
        party_size: 2,
        status: "pending",
      }),
    );
    expect(payload.booking).toEqual(
      expect.objectContaining({
        id: "booking-1",
        status: "pending",
        bookingTime: "19:00",
        partySize: 2,
      }),
    );
    expect(response.headers.get("set-cookie")).toContain(
      "coorder_booking_token=11111111-1111-4111-8111-111111111111",
    );
  });

  it("loads the cookie-backed reservation status for the same branch", async () => {
    const query = {
      select: jest.fn(),
      eq: jest.fn(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: {
          id: "booking-1",
          customer_name: "A Guest",
          customer_phone: "+81 80 1234 5678",
          customer_email: "guest@example.com",
          customer_note: null,
          booking_date: "2026-05-01",
          booking_time: "19:00:00",
          party_size: 2,
          status: "confirmed",
          public_lookup_token: "11111111-1111-4111-8111-111111111111",
          updated_at: "2026-04-28T00:00:00.000Z",
        },
        error: null,
      }),
    };

    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    mockedSupabaseAdmin.from.mockReturnValue(query as never);

    const request = new NextRequest("https://example.com/api/v1/customer/bookings", {
      headers: {
        host: "example.com",
        cookie: "coorder_booking_token=11111111-1111-4111-8111-111111111111",
      },
    });

    const response = await GET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(query.eq).toHaveBeenCalledWith("restaurant_id", restaurantId);
    expect(query.eq).toHaveBeenCalledWith(
      "public_lookup_token",
      "11111111-1111-4111-8111-111111111111",
    );
    expect(payload.booking).toEqual(
      expect.objectContaining({
        id: "booking-1",
        status: "confirmed",
        customerEmail: "guest@example.com",
      }),
    );
  });
});

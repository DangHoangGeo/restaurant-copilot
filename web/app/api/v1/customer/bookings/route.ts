import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resolvePublicRestaurantContext } from "@/lib/server/customer-entry";
import { protectEndpoint, RATE_LIMIT_CONFIGS } from "@/lib/server/rateLimit";

const BOOKING_STATUS_COOKIE = "coorder_booking_token";
const BOOKING_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

const phonePattern = /^[+()\-\s0-9]{7,24}$/;

const bookingSchema = z
  .object({
    customerName: z.string().trim().min(2).max(80),
    customerPhone: z.string().trim().max(32).optional().default(""),
    customerEmail: z.string().trim().max(160).optional().default(""),
    bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    bookingTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    partySize: z.number().int().min(1).max(30),
    customerNote: z.string().trim().max(500).optional().default(""),
  })
  .superRefine((value, ctx) => {
    const hasPhone = value.customerPhone.length > 0;
    const hasEmail = value.customerEmail.length > 0;

    if (!hasPhone && !hasEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerPhone"],
        message: "phone_or_email_required",
      });
    }

    if (hasPhone && !phonePattern.test(value.customerPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerPhone"],
        message: "invalid_phone",
      });
    }

    if (hasEmail && !z.string().email().safeParse(value.customerEmail).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["customerEmail"],
        message: "invalid_email",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookingDate = new Date(`${value.bookingDate}T00:00:00`);
    if (Number.isNaN(bookingDate.getTime()) || bookingDate < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bookingDate"],
        message: "date_not_in_past",
      });
    }
  });

type BookingRow = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  customer_note: string | null;
  booking_date: string;
  booking_time: string;
  party_size: number;
  status: string;
  public_lookup_token: string;
  updated_at: string | null;
};

function getCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: BOOKING_COOKIE_MAX_AGE_SECONDS,
  };
}

function mapBooking(row: BookingRow) {
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    customerNote: row.customer_note,
    bookingDate: row.booking_date,
    bookingTime: row.booking_time?.slice(0, 5) ?? row.booking_time,
    partySize: row.party_size,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

async function resolveRestaurantId(req: NextRequest): Promise<string | null> {
  const restaurantContext = await resolvePublicRestaurantContext({
    host: req.headers.get("host"),
    orgIdentifier: req.nextUrl.searchParams.get("org"),
    branchCode: req.nextUrl.searchParams.get("branch"),
    restaurantId: req.nextUrl.searchParams.get("restaurantId"),
    subdomain: req.nextUrl.searchParams.get("subdomain"),
  });

  return restaurantContext?.restaurant.id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const lookupToken = req.cookies.get(BOOKING_STATUS_COOKIE)?.value;
    if (!lookupToken) {
      return NextResponse.json({ success: true, booking: null });
    }

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, customer_name, customer_phone, customer_email, customer_note, booking_date, booking_time, party_size, status, public_lookup_token, updated_at",
      )
      .eq("restaurant_id", restaurantId)
      .eq("public_lookup_token", lookupToken)
      .maybeSingle();

    if (error) {
      console.error("Customer booking status lookup failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to load booking status" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      booking: data ? mapBooking(data as BookingRow) : null,
    });
  } catch (error) {
    console.error("Unexpected customer booking status error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const protectionError = await protectEndpoint(
      req,
      RATE_LIMIT_CONFIGS.MUTATION,
      "customer-booking-create",
    );
    if (protectionError) return protectionError;

    const restaurantId = await resolveRestaurantId(req);
    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: "Restaurant not found" },
        { status: 404 },
      );
    }

    const parsed = bookingSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid booking request",
          details: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const customerContact = [parsed.data.customerPhone, parsed.data.customerEmail]
      .filter(Boolean)
      .join(" / ");

    const { data, error } = await supabaseAdmin
      .from("bookings")
      .insert({
        restaurant_id: restaurantId,
        table_id: null,
        customer_name: parsed.data.customerName,
        customer_contact: customerContact,
        customer_phone: parsed.data.customerPhone || null,
        customer_email: parsed.data.customerEmail || null,
        customer_note: parsed.data.customerNote || null,
        booking_date: parsed.data.bookingDate,
        booking_time: parsed.data.bookingTime,
        party_size: parsed.data.partySize,
        preorder_items: [],
        status: "pending",
      })
      .select(
        "id, customer_name, customer_phone, customer_email, customer_note, booking_date, booking_time, party_size, status, public_lookup_token, updated_at",
      )
      .single();

    if (error || !data) {
      console.error("Customer booking creation failed:", error);
      return NextResponse.json(
        { success: false, error: "Failed to create booking" },
        { status: 500 },
      );
    }

    const row = data as BookingRow;
    const response = NextResponse.json({
      success: true,
      booking: mapBooking(row),
    });
    response.cookies.set(
      BOOKING_STATUS_COOKIE,
      row.public_lookup_token,
      getCookieOptions(),
    );

    return response;
  } catch (error) {
    console.error("Unexpected customer booking creation error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

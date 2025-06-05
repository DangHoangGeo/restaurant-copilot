import { db } from "@/lib/db";
import { orders, tables as dbTables } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';


interface SessionData {
  sessionId: string;
  tableId: string;
  status: "new" | "open" | "pending_payment" | "completed" | "canceled" | "expired";
}

// This function is intended for server-side use (e.g., in page.tsx or route handlers)
// It directly interacts with the database. Cookie handling is passed via the `cookies` parameter.
export async function createOrRetrieveSessionOnPageLoad(
  restaurantId: string,
  tableId: string,
  // Next.js cookies() returns a ReadonlyRequestCookies. For setting, you'd typically use NextResponse.cookies.
  // However, server components cannot directly set cookies that way.
  // This function will focus on GETTING session data. Cookie setting should be in API routes or middleware.
  // If a session is created here, it implies it's "new" but not yet persisted via cookie to the client.
  // The /api/v1/sessions/create route is responsible for cookie setting.
  // This function could alternatively call that API route if preferred, but direct DB access is also an option.
  nextCookies: ReadonlyRequestCookies
): Promise<SessionData | null> {
  try {
    // 1. Validate tableId against the restaurant
    const table = await db.query.dbTables.findFirst({
      where: and(eq(dbTables.id, tableId), eq(dbTables.restaurantId, restaurantId)),
      columns: { id: true }
    });

    if (!table) {
      console.warn(`Session Handler: Invalid tableId ${tableId} for restaurant ${restaurantId}.`);
      return null;
    }

    // 2. Check for an existing 'new' or 'open' session for this table
    //    An 'open' session might mean the customer navigated away and came back.
    //    The definition of which statuses are "resumable" might vary.
    //    For QR code scanning, usually a 'new' session is expected, or an existing 'new' one is returned.
    let existingOrder = await db.query.orders.findFirst({
      where: and(
        eq(orders.restaurantId, restaurantId),
        eq(orders.tableId, tableId),
        // Consider which statuses are acceptable to "resume" or if only 'new' is.
        // If an order is 'pending_payment', we probably should not return it here as a general session.
        eq(orders.status, "new")
      ),
      columns: { sessionId: true, status: true }
    });

    if (existingOrder) {
      // It's important that the client-side cookie (`customer_session_id`) is also updated
      // if this function were to create a *new* session ID that differs from an existing cookie.
      // However, this function primarily *retrieves*. The API route handles creation & cookie set.
      // For now, we assume if an existingOrder is found, its sessionId is what matters.
      return {
        sessionId: existingOrder.sessionId,
        tableId: tableId,
        status: existingOrder.status as SessionData['status'],
      };
    }

    // 3. If no suitable existing session, create a new one (conceptually)
    //    The actual cookie setting and ensuring client awareness happens via API.
    //    This part simulates what the API would do to provide data for the initial page load.
    const newSessionId = uuidv4();

    // This insert operation makes this function more than just a "getter".
    // This is similar to what the API route does.
    // If called directly from a page load without a subsequent API call that sets the cookie,
    // the client won't know about this `newSessionId` from a cookie.
    // This is why often such creation logic is kept within API routes called by client/middleware.

    // For the purpose of loading /r/[subdomain]?tableId=xxx, we need to create the session
    // so that MenuClientContent can receive initialSessionData.
    // The cookie will be set when MenuClientContent (or another client component)
    // calls the actual /api/v1/sessions/create API, which should ideally be idempotent
    // and return this same session if it's still 'new'.

    await db.insert(orders).values({
      id: uuidv4(), // This is the order.id, not sessionId for orders table
      restaurantId,
      tableId,
      sessionId: newSessionId, // This is the session identifier
      status: "new",
      totalAmount: 0,
      orderDate: new Date(),
      // items: [], // If JSONB
    });

    // IMPORTANT: This function DOES NOT SET THE COOKIE.
    // The expectation is that an API route like /api/v1/sessions/create
    // would be called client-side or by middleware to establish the cookie.
    // This server helper provides the data for the *initial render* if tableId is present.

    return {
      sessionId: newSessionId,
      tableId: tableId,
      status: "new",
    };

  } catch (error) {
    console.error("Error in createOrRetrieveSessionOnPageLoad:", error);
    return null;
  }
}

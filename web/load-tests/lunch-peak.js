import http from "k6/http";
import { check, group, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const restaurantId = __ENV.RESTAURANT_ID || "";
const tableId = __ENV.TABLE_ID || "";
const existingSessionId = __ENV.SESSION_ID || "";
const existingOrderId = __ENV.ORDER_ID || "";
const enableOrderWrites = __ENV.ENABLE_ORDER_WRITES === "true";
const menuItemIds = (__ENV.MENU_ITEM_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export const options = {
  scenarios: {
    lunch_peak: {
      executor: "ramping-vus",
      stages: [
        { duration: __ENV.RAMP_UP || "2m", target: Number(__ENV.VUS || 50) },
        { duration: __ENV.HOLD || "5m", target: Number(__ENV.VUS || 50) },
        { duration: __ENV.RAMP_DOWN || "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{endpoint:menu}": ["p(95)<300"],
    "http_req_duration{endpoint:order_create}": ["p(95)<500", "p(99)<1000"],
    "http_req_duration{endpoint:order_status}": ["p(95)<500"],
  },
};

function jsonHeaders() {
  return {
    "Content-Type": "application/json",
  };
}

function getMenu() {
  const url = `${baseUrl}/api/v1/customer/menu?restaurantId=${restaurantId}&lite=1`;
  const response = http.get(url, { tags: { endpoint: "menu" } });
  check(response, {
    "menu loaded": (res) => res.status === 200,
  });
  return response;
}

function createSession() {
  if (!enableOrderWrites || !tableId) return existingSessionId;

  const response = http.post(
    `${baseUrl}/api/v1/customer/session/create`,
    JSON.stringify({
      restaurantId,
      tableId,
      guests: Number(__ENV.GUESTS || 2),
    }),
    { headers: jsonHeaders(), tags: { endpoint: "session_create" } },
  );

  check(response, {
    "session created": (res) => res.status === 200 && Boolean(res.json("sessionId")),
  });

  return response.json("sessionId");
}

function createOrder(sessionId) {
  if (!enableOrderWrites || !sessionId || menuItemIds.length === 0) {
    return existingOrderId;
  }

  const items = menuItemIds.slice(0, 3).map((menuItemId) => ({
    menuItemId,
    quantity: 1,
  }));

  const response = http.post(
    `${baseUrl}/api/v1/customer/orders/create`,
    JSON.stringify({
      restaurantId,
      sessionId,
      items,
    }),
    { headers: jsonHeaders(), tags: { endpoint: "order_create" } },
  );

  check(response, {
    "order created": (res) => res.status === 200 && Boolean(res.json("orderId")),
  });

  return response.json("orderId");
}

function checkOrderStatus(orderId, sessionId) {
  if (!orderId || !sessionId) return;

  const url = `${baseUrl}/api/v1/customer/orders/${orderId}?restaurantId=${restaurantId}&sessionId=${sessionId}`;
  const response = http.get(url, { tags: { endpoint: "order_status" } });
  check(response, {
    "order status loaded": (res) => res.status === 200 || res.status === 404,
  });
}

export default function () {
  if (!restaurantId) {
    throw new Error("RESTAURANT_ID is required.");
  }

  group("scan QR and browse menu", () => {
    http.get(`${baseUrl}/api/v1/customer/restaurant?restaurantId=${restaurantId}`, {
      tags: { endpoint: "restaurant" },
    });
    getMenu();
  });

  const sessionId = createSession();
  const orderId = createOrder(sessionId);
  checkOrderStatus(orderId, sessionId);

  sleep(Number(__ENV.SLEEP_SECONDS || 1));
}

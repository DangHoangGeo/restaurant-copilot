import http from "k6/http";
import { check, group, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const restaurantId = __ENV.RESTAURANT_ID || "";
const subdomain = __ENV.SUBDOMAIN || "";
const lite = __ENV.LITE_MENU === "false" ? "0" : "1";

export const options = {
  scenarios: {
    menu_browse: {
      executor: "ramping-vus",
      stages: [
        { duration: __ENV.RAMP_UP || "2m", target: Number(__ENV.VUS || 100) },
        { duration: __ENV.HOLD || "5m", target: Number(__ENV.VUS || 100) },
        { duration: __ENV.RAMP_DOWN || "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{endpoint:restaurant}": ["p(95)<300"],
    "http_req_duration{endpoint:menu}": ["p(95)<100"],
  },
};

function restaurantQuery() {
  if (restaurantId) return `restaurantId=${restaurantId}`;
  if (subdomain) return `subdomain=${subdomain}`;
  throw new Error("Set RESTAURANT_ID or SUBDOMAIN.");
}

export default function () {
  const query = restaurantQuery();

  group("public menu browse", () => {
    const restaurantResponse = http.get(
      `${baseUrl}/api/v1/customer/restaurant?${query}`,
      { tags: { endpoint: "restaurant" } },
    );
    check(restaurantResponse, {
      "restaurant loaded": (res) => res.status === 200,
    });

    const menuResponse = http.get(
      `${baseUrl}/api/v1/customer/menu?${query}&lite=${lite}`,
      { tags: { endpoint: "menu" } },
    );
    check(menuResponse, {
      "menu loaded": (res) => res.status === 200,
    });
  });

  sleep(Number(__ENV.SLEEP_SECONDS || 1));
}

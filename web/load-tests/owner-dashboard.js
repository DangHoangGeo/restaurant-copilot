import http from "k6/http";
import { check, group, sleep } from "k6";

const baseUrl = (__ENV.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const locale = __ENV.LOCALE || "en";
const ownerToken = __ENV.OWNER_TOKEN || "";
const ownerCookie = __ENV.OWNER_COOKIE || "";

export const options = {
  scenarios: {
    owner_dashboard: {
      executor: "ramping-vus",
      stages: [
        { duration: __ENV.RAMP_UP || "1m", target: Number(__ENV.VUS || 25) },
        { duration: __ENV.HOLD || "5m", target: Number(__ENV.VUS || 25) },
        { duration: __ENV.RAMP_DOWN || "1m", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{endpoint:owner_overview}": ["p(95)<1000"],
    "http_req_duration{endpoint:owner_org_overview}": ["p(95)<1000"],
    "http_req_duration{endpoint:owner_finance}": ["p(95)<1000"],
  },
};

function authHeaders() {
  const headers = {};
  if (ownerToken) headers.Authorization = `Bearer ${ownerToken}`;
  if (ownerCookie) headers.Cookie = ownerCookie;
  return headers;
}

function get(path, endpoint) {
  const response = http.get(`${baseUrl}${path}`, {
    headers: authHeaders(),
    tags: { endpoint },
  });
  check(response, {
    [`${endpoint} completed`]: (res) => res.status < 500,
  });
  return response;
}

export default function () {
  group("owner dashboard reads", () => {
    get(`/${locale}/control/overview`, "owner_overview");
    get("/api/v1/owner/organization/overview", "owner_org_overview");
    get("/api/v1/owner/finance/org-rollup", "owner_finance");
  });

  sleep(Number(__ENV.SLEEP_SECONDS || 1));
}

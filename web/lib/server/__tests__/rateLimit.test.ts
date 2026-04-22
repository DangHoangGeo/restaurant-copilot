/** @jest-environment node */

jest.mock("@/lib/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

import { NextRequest } from "next/server";
import {
  __resetRateLimitMemoryStore,
  rateLimit,
  validateCSRF,
} from "../rateLimit";

describe("rate limit hardening", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  function setNodeEnv(value: string | undefined) {
    Object.defineProperty(process.env, "NODE_ENV", {
      value,
      configurable: true,
    });
  }

  beforeEach(() => {
    __resetRateLimitMemoryStore();
    setNodeEnv("test");
  });

  afterEach(() => {
    setNodeEnv(originalNodeEnv);
  });

  it("uses the in-memory fallback instead of disabling rate limiting", async () => {
    const request = new NextRequest("https://example.com/api/test", {
      method: "POST",
      headers: {
        host: "example.com",
        origin: "https://example.com",
        "x-forwarded-for": "203.0.113.10",
      },
    });

    expect(
      await rateLimit(request, { max: 1, window: "60s" }, "test-limit"),
    ).toBeNull();

    const blocked = await rateLimit(
      request,
      { max: 1, window: "60s" },
      "test-limit",
    );
    expect(blocked?.status).toBe(429);
  });

  it("rejects mutation requests without origin or referer in production mode", () => {
    setNodeEnv("production");

    const request = new NextRequest("https://example.com/api/test", {
      method: "POST",
      headers: {
        host: "example.com",
      },
    });

    expect(validateCSRF(request)).toBe(false);
  });

  it("allows same-origin mutation requests in production mode", () => {
    setNodeEnv("production");

    const request = new NextRequest("https://example.com/api/test", {
      method: "POST",
      headers: {
        host: "example.com",
        origin: "https://example.com",
      },
    });

    expect(validateCSRF(request)).toBe(true);
  });
});

/** @jest-environment node */

import {
  createCustomerSessionCode,
  isCustomerSessionActiveStatus,
  verifyCustomerSessionCode,
} from "../customer-session";
import {
  CUSTOMER_SESSION_CODE_LENGTH,
  sanitizeCustomerSessionCodeInput,
} from "@/shared/customer-session";

describe("customer session code helpers", () => {
  const originalSecret = process.env.CUSTOMER_SESSION_CODE_SECRET;

  beforeEach(() => {
    process.env.CUSTOMER_SESSION_CODE_SECRET = "unit-test-session-secret";
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.CUSTOMER_SESSION_CODE_SECRET;
      return;
    }

    process.env.CUSTOMER_SESSION_CODE_SECRET = originalSecret;
  });

  it("creates a deterministic session code with the shared length", () => {
    const code = createCustomerSessionCode(
      "e8ff1b3d-61bd-4f98-9608-9eaa8cdbf6b3",
      "efcf61d1-3f88-47a5-b67e-553f292f7325",
    );

    expect(code).toHaveLength(CUSTOMER_SESSION_CODE_LENGTH);
    expect(code).toBe(
      createCustomerSessionCode(
        "e8ff1b3d-61bd-4f98-9608-9eaa8cdbf6b3",
        "efcf61d1-3f88-47a5-b67e-553f292f7325",
      ),
    );
  });

  it("changes the code when the restaurant or session changes", () => {
    const base = createCustomerSessionCode(
      "e8ff1b3d-61bd-4f98-9608-9eaa8cdbf6b3",
      "efcf61d1-3f88-47a5-b67e-553f292f7325",
    );

    expect(
      createCustomerSessionCode(
        "4d8928da-95be-412f-9132-3d759d7d6d82",
        "efcf61d1-3f88-47a5-b67e-553f292f7325",
      ),
    ).not.toBe(base);

    expect(
      createCustomerSessionCode(
        "e8ff1b3d-61bd-4f98-9608-9eaa8cdbf6b3",
        "be408eb5-5d05-46d4-a876-b386c5e9b4fd",
      ),
    ).not.toBe(base);
  });

  it("verifies a normalized session code and rejects wrong values", () => {
    const sessionId = "e8ff1b3d-61bd-4f98-9608-9eaa8cdbf6b3";
    const restaurantId = "efcf61d1-3f88-47a5-b67e-553f292f7325";
    const code = createCustomerSessionCode(sessionId, restaurantId);

    expect(
      verifyCustomerSessionCode({
        sessionId,
        restaurantId,
        candidateCode: sanitizeCustomerSessionCodeInput(code.toLowerCase()),
      }),
    ).toBe(true);

    expect(
      verifyCustomerSessionCode({
        sessionId,
        restaurantId,
        candidateCode: "AAAAAAAA",
      }),
    ).toBe(false);
  });

  it("only treats new and serving orders as active customer sessions", () => {
    expect(isCustomerSessionActiveStatus("new")).toBe(true);
    expect(isCustomerSessionActiveStatus("serving")).toBe(true);
    expect(isCustomerSessionActiveStatus("completed")).toBe(false);
    expect(isCustomerSessionActiveStatus("canceled")).toBe(false);
    expect(isCustomerSessionActiveStatus("ready")).toBe(false);
  });
});

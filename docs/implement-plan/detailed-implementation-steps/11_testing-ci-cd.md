### 11. Testing & CI/CD

11.1. **Web Unit & Integration Tests (Jest + React Testing Library)**

* **Set up Jest** in `/web` if not already:

  ```bash
  npm install --save-dev jest @testing-library/react @testing-library/jest-dom supertest
  ```

* **RLS Protection Test** (`__tests__/rls.test.ts`):

  ```ts
  import { createClient } from "@supabase/supabase-js";

  const SUPABASE_URL = process.env.SUPABASE_TEST_URL!;
  const SUPABASE_KEY = process.env.SUPABASE_TEST_ANON_KEY!;

  describe("RLS Protection", () => {
    it("should not return menu_items for other restaurant", async () => {
      const clientA = createClient(SUPABASE_URL, SUPABASE_KEY, {
        global: { headers: { Authorization: `Bearer ${process.env.TEST_JWT_RESTAURANT_A}` } }
      });
      const { data } = await clientA
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", process.env.RESTAURANT_B_ID!);
      expect(data).toEqual([]);
    });
  });
  ```

  (Req 9.1.1)

* **Signup Flow Test** (`__tests__/signup.test.tsx`):

  ```tsx
  import { render, screen, fireEvent } from "@testing-library/react";
  import SignupPage from "../app/ja/signup/page";

  test("shows validation errors for invalid subdomain", async () => {
    render(<SignupPage />);
    fireEvent.change(screen.getByLabelText("SUBDOMAIN_LABEL"), { target: { value: "Inv@lid" } });
    fireEvent.blur(screen.getByLabelText("SUBDOMAIN_LABEL"));
    expect(await screen.findByText("Invalid subdomain format")).toBeInTheDocument();
  });
  ```

  (Req 9.1.2)

* **Order Creation Validation Test** (`__tests__/order.test.ts`):

  ```ts
  import request from "supertest";
  import app from "../app"; // Next.js handler wrapped for Supertest

  test("create order with invalid sessionId returns 400", async () => {
    const response = await request(app)
      .post("/api/v1/orders/create")
      .send({ sessionId: "invalid-uuid", items: [] });
    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/Invalid or expired session/);
  });
  ```

  (Req 9.1.3)

* **i18n Rendering Test** (`__tests__/i18n.test.tsx`):

  ```tsx
  import { render, screen } from "@testing-library/react";
  import MyHeader from "../components/MyHeader";

  test("renders header in English when locale is en", async () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={{ "HEADER_TITLE": "Welcome" }}>
        <MyHeader />
      </NextIntlClientProvider>
    );
    expect(screen.getByText("Welcome")).toBeInTheDocument();
  });
  ```

  (Req 9.1.4)

* **Feature Flag Test** (`__tests__/featureFlags.test.tsx`):

  ```tsx
  import { render, screen } from "@testing-library/react";
  import CheckoutPage from "../app/ja/customer/checkout/page";
  import { FEATURE_FLAGS } from "../config/feature-flags";

  test("hides payment form if FEATURE_FLAGS.payments is false", () => {
    jest.spyOn(FEATURE_FLAGS, 'payments', 'get').mockReturnValue(false);
    render(<CheckoutPage orderId="..." totalAmount={1000} locale="ja" />);
    expect(screen.queryByText("Card Details")).not.toBeInTheDocument();
    expect(screen.getByText("Cash only")).toBeInTheDocument();
  });
  ```

  (Req 9.1.5)

‣ (Req 9.1)

11.2. **iOS Unit & UI Tests**

* **OrderService Grouping Test** (`ShopCopilotStaffTests/OrderServiceTests.swift`):

  ```swift
  import XCTest
  @testable import ShopCopilotStaff

  final class OrderServiceTests: XCTestCase {
    func testComputeGrouping() {
      let orders = [
        Order(id: "1", tableId: "T1",
          items: [OrderItem(id: "i1", menuItemId: "m1", menuItemName: "Ramen", quantity: 2, notes: nil)],
          totalAmount: 1000, status: "new", createdAt: Date()),
        Order(id: "2", tableId: "T2",
          items: [OrderItem(id: "i2", menuItemId: "m1", menuItemName: "Ramen", quantity: 1, notes: nil)],
          totalAmount: 500, status: "new", createdAt: Date())
      ]
      let service = OrderService(jwt: "dummy", restaurantId: "dummy")
      service.activeOrders = orders
      let board = KitchenBoardView(orderService: service)
      board.computeGrouping()
      XCTAssertEqual(board.groupedItems.count, 1)
      XCTAssertEqual(board.groupedItems.first?.quantity, 3)
      XCTAssertEqual(board.groupedItems.first?.tables, Set(["T1", "T2"]))
    }
  }
  ```

  (Req 9.2.1)

* **LoginView Snapshot Test** (`ShopCopilotStaffTests/LoginViewTests.swift`):

  ```swift
  import XCTest
  import SwiftUI
  @testable import ShopCopilotStaff

  final class LoginViewTests: XCTestCase {
    func testLoginViewInitialRender() {
      let view = LoginView()
      let controller = UIHostingController(rootView: view)
      XCTAssertNotNil(controller.view)
      // Optionally compare snapshot images if set up
    }
  }
  ```

  (Req 9.2.2)

* **PrinterManager Error Handling Test** (`ShopCopilotStaffTests/PrinterManagerTests.swift`):

  ```swift
  import XCTest
  @testable import ShopCopilotStaff

  final class PrinterManagerTests: XCTestCase {
    func testPrintReceiptNoPrinter() {
      let manager = PrinterManager.shared
      manager.writeCharacteristic = nil // simulate no connection
      let dummyOrder = Order(id: "1", tableId: "T1", items: [], totalAmount: 0, status: "ready", createdAt: Date())
      // Should not crash
      manager.printReceipt(order: dummyOrder)
    }
  }
  ```

  (Req 9.2.3)

* **Feature Flag UI Test**: In a SwiftUI view where Payments UI is conditional:

  * Use environment or injection to simulate `FeatureFlags.enablePayments = false` and assert that no payment button appears.
    (Req 9.2.4)
    ‣ (Req 9.2)

11.3. **Security Scans & Dependency Checks in CI**

* **Web Job**: add steps in `.github/workflows/ci.yml`:

  ```yaml
  - name: Run npm Audit
    run: npm audit --audit-level=high
    working-directory: web
  - name: Run ESLint
    run: npm run lint
    working-directory: web
  - name: Run Prettier Check
    run: npm run format:check
    working-directory: web
  ```

  (Req 9.3.1)
* **iOS Job**:

  ```yaml
  - name: Install SwiftLint
    run: brew install swiftlint
  - name: Run SwiftLint
    run: swiftlint --strict
  ```

  (Req 9.3.2)
* If security vulnerabilities or lint errors exist, the CI job should fail.

11.4. **CI/CD Deployment & Environment Separation**

* **Web**: In GitHub Actions:

  ```yaml
  jobs:
    web-ci:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - name: Setup Node
          uses: actions/setup-node@v3
          with:
            node-version: 18
        - name: Install Dependencies
          run: npm install
          working-directory: web
        - name: Run ESLint
          run: npm run lint
          working-directory: web
        - name: Run Prettier Check
          run: npm run format:check
          working-directory: web
        - name: Run Web Tests
          run: npm test
          working-directory: web
        - name: Run npm Audit
          run: npm audit --audit-level=high
          working-directory: web
        - name: Deploy to Vercel
          uses: amondnet/vercel-action@v20
          with:
            vercel-token: ${{ secrets.VERCEL_TOKEN }}
            vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
            vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
            working-directory: web
            scope: shop-copilot
          env:
            VERCEL_ENV: ${{ github.ref == 'refs/heads/main' && 'production' || 'preview' }}
    ios-ci:
      runs-on: macos-latest
      steps:
        - uses: actions/checkout@v3
        - name: Install Dependencies
          run: brew install swiftlint
        - name: Run SwiftLint
          run: swiftlint --strict
        - name: Build & Test iOS App
          run: xcodebuild -scheme ShopCopilotStaff -destination 'platform=iOS Simulator,name=iPhone 14' test | xcpretty
        - name: Archive & Upload to TestFlight
          env:
            APP_STORE_API_KEY: ${{ secrets.APP_STORE_API_KEY }}
            APP_STORE_API_ISSUER_ID: ${{ secrets.APP_STORE_API_ISSUER_ID }}
          run: |
            xcodebuild -workspace ShopCopilotStaff.xcworkspace \
              -scheme ShopCopilotStaff \
              -archivePath $PWD/build/ShopCopilotStaff.xcarchive archive
            xcodebuild -exportArchive \
              -archivePath $PWD/build/ShopCopilotStaff.xcarchive \
              -exportOptionsPlist ExportOptions.plist \
              -exportPath $PWD/build
            xcrun altool --upload-app -f $PWD/build/ShopCopilotStaff.ipa -t ios --apiKey $APP_STORE_API_KEY --apiIssuer $APP_STORE_API_ISSUER_ID
  ```

  * On `develop` branch, Vercel automatically deploys to staging (`staging.shop-copilot.com`) with staging Supabase credentials.
  * On `main` branch, it deploys to production (`shop-copilot.com`) with production credentials.
    (Req 9.4)

* Ensure that `feature-flags` environment variables differ between staging and production, enabling or disabling features accordingly.
  ‣ (Req 9.4)

---

### 6. Staff iOS App

6.1. **Xcode Project & Dependency Setup**

* In Xcode, create a new SwiftUI iOS app named `SOder.jp`.
* In Project > Swift Packages, add:

  * `https://github.com/supabase-community/supabase-swift.git`
  * `https://github.com/KazuCocoa/ESCManager.git`
  * (Optional v2) `https://github.com/stripe/stripe-ios.git` for future payments.
* Add a file `Config.swift` with:

  ```swift
  import Foundation

  struct Config {
    static let supabaseUrl = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as! String
    static let supabaseAnonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as! String
    static let defaultLocale = "ja"
    static let maxRetryAttempts = 3
  }
  ```

  (Req 6.1)
* In `Info.plist`, add keys:

  * `NSBluetoothAlwaysUsageDescription` = “Used to connect to kitchen printer.”
  * `NSPhotoLibraryAddUsageDescription` = “Used to save receipts if needed.”
* Run `swiftlint --strict` and fix any violations.
  ‣ (Req 6.1)

6.2. **Localization Setup**

* In Xcode, add Localizable.strings files for each language: `ja.lproj/Localizable.strings`, `en.lproj/Localizable.strings`, `vi.lproj/Localizable.strings`.
* Add keys such as:

  ```
  "LOGIN_TITLE" = "ログイン";
  "LOGIN_TITLE" = "Login";  // in en.lproj
  ```

  (Req 6.2)
* In all SwiftUI views, use `Text(LocalizedStringKey("KEY"))` or `NSLocalizedString("KEY", comment: "")`.
* Verify by changing the device’s language to Japanese or Vietnamese and observing UI text change.
  ‣ (Req 6.2)

6.3. **Authentication Flow in iOS**

* Create `LoginView.swift`:

  ```swift
  import SwiftUI
  import Supabase

  struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var subdomain = ""
    @State private var isLoading = false
    @AppStorage("jwtToken") private var jwtToken = ""
    @AppStorage("restaurantId") private var restaurantId = ""
    @AppStorage("userRole") private var userRole = ""
    @ObservedObject private var viewModel = AuthViewModel()

    var body: some View {
      VStack(spacing: 20) {
        TextField("Email", text: $email).keyboardType(.emailAddress).textContentType(.emailAddress)
        SecureField("Password", text: $password)
        TextField("Subdomain", text: $subdomain).autocapitalization(.none)
        if isLoading { ProgressView() }
        else {
          Button("Sign In") { signIn() }
            .disabled(email.isEmpty || password.isEmpty || subdomain.isEmpty)
        }
      }
      .padding()
    }

    func signIn() {
      isLoading = true
      Task {
        do {
          let client = SupabaseClient(supabaseURL: Config.supabaseUrl, supabaseKey: Config.supabaseAnonKey)
          let authResponse = try await client.auth.signInWithPassword(email: email, password: password)
          guard let session = authResponse.session else { return }
          let jwt = session.accessToken
          let claims = try parseJWT(jwt)
          jwtToken = jwt
          restaurantId = claims["restaurant_id"] as? String ?? ""
          userRole = claims["role"] as? String ?? ""
          // Navigate to main TabView (e.g., OrderListView)
        } catch {
          // Show error alert
        }
        isLoading = false
      }
    }
  }

  func parseJWT(_ token: String) throws -> [String: Any] {
    // …base64 decode payload, JSON parse…
  }
  ```

  (Req 6.3)
* Create an `AuthViewModel.swift` if needed for state management.
* On app launch (e.g., in `@main` or `App` struct), check if `jwtToken` exists and is not expired; if valid, skip to `OrderListView`, otherwise show `LoginView`.
* Test by logging in with a known user’s credentials; confirm that the JWT’s payload contains correct `restaurant_id` and `role`.
  ‣ (Req 6.3)

6.4. **Realtime Order Subscription & RLS Enforcement**

* Create `OrderService.swift`:

  ```swift
  import Foundation
  import Supabase
  import Combine

  class OrderService: ObservableObject {
    @Published var activeOrders: [Order] = []
    private let client: SupabaseClient
    private var subscription: RealtimeChannel?

    init(jwt: String, restaurantId: String) {
      client = SupabaseClient(supabaseURL: Config.supabaseUrl, supabaseKey: jwt)
      subscribeToOrders(restaurantId: restaurantId)
    }

    private func subscribeToOrders(restaurantId: String) {
      subscription = client
        .realtime
        .channel("public:orders")
        .on(
          .postgresChanges(
            table: "orders",
            filter: "restaurant_id=eq.\(restaurantId)"
          ),
          { [weak self] payload in
            let newObj = payload.newObj
            let oldObj = payload.oldObj
            let eventType = payload.eventType
            DispatchQueue.main.async {
              switch eventType {
              case .INSERT:
                if newObj["status"] as? String != "completed" {
                  self?.activeOrders.append(Order(from: newObj))
                }
              case .UPDATE:
                if let updatedOrder = Order(from: newObj),
                   let idx = self?.activeOrders.firstIndex(where: { $0.id == updatedOrder.id }) {
                  if updatedOrder.status == "completed" {
                    self?.activeOrders.remove(at: idx)
                  } else {
                    self?.activeOrders[idx] = updatedOrder
                  }
                }
              case .DELETE:
                if let id = oldObj["id"] as? String,
                   let idx = self?.activeOrders.firstIndex(where: { $0.id == id }) {
                  self?.activeOrders.remove(at: idx)
                }
              default:
                break
              }
            }
          }
        )
        .subscribe()
    }

    func updateOrderStatus(orderId: String, newStatus: String) async throws {
      let response = try await client.database
        .from("orders")
        .update(values: ["status": newStatus])
        .eq(column: "id", value: orderId)
        .execute()
      if let error = response.error { throw error }
    }
  }

  struct Order: Identifiable {
    let id: String
    let tableId: String
    let totalAmount: Double
    let status: String
    let createdAt: Date
    let items: [OrderItem]

    init?(from dict: [String: Any]) {
      // Parse dictionary into Order fields, convert date string to Date
    }
  }

  struct OrderItem: Identifiable {
    let id: String
    let menuItemId: String
    let menuItemName: String
    let quantity: Int
    let notes: String?
  }
  ```
* This code relies on RLS: the Supabase client is instantiated with `jwtToken`, so any `SELECT` on `orders` will only return rows where `restaurant_id = auth.jwt() ->> 'restaurant_id'`.
* In your app’s `App` struct, instantiate:

  ```swift
  @StateObject var orderService = OrderService(jwt: jwtToken, restaurantId: restaurantId)
  ```
* Test by placing an order in the webapp and confirm it appears immediately in iOS. If you manually change the database to set `restaurant_id` to another tenant, that order should not appear in this subscription.
  (Req 6.4)
  ‣ (Req 6.4)

6.5. **Order List & Detail Views**
6.5.1. **OrderListView\.swift**
\`\`\`swift
import SwiftUI

````
 struct OrderListView: View {
   @ObservedObject var orderService: OrderService

   var body: some View {
     NavigationView {
       List(orderService.activeOrders) { order in
         NavigationLink(destination: OrderDetailView(order: order, service: orderService)) {
           HStack {
             Text("Table \(order.tableId)")
             Spacer()
             Text(order.status.capitalized)
               .font(.caption)
               .padding(6)
               .background(statusColor(order.status))
               .foregroundColor(.white)
               .cornerRadius(4)
           }
         }
       }
       .navigationTitle("Active Orders")
     }
   }

   func statusColor(_ status: String) -> Color {
     switch status {
     case "new": return .blue
     case "preparing": return .orange
     case "ready": return .green
     default: return .gray
     }
   }
 }
 ```  
 (Req 6.5)  
````

* Embed `OrderListView` inside a `TabView` or root view after successful login.
* Test that the list updates in real time as orders arrive or statuses change.

6.5.2. **OrderDetailView\.swift**
\`\`\`swift
import SwiftUI

````
 struct OrderDetailView: View {
   @State var order: Order
   @ObservedObject var service: OrderService

   var body: some View {
     VStack(alignment: .leading, spacing: 16) {
       Text("Table \(order.tableId)").font(.title2)
       Divider()
       ForEach(order.items) { item in
         VStack(alignment: .leading) {
           HStack {
             Text(item.menuItemName)
             Spacer()
             Text("x\(item.quantity)")
           }
           if let notes = item.notes, !notes.isEmpty {
             Text("Notes: \(notes)").font(.footnote).foregroundColor(.gray)
           }
           Divider()
         }
       }
       HStack {
         Text("Total:").font(.headline)
         Spacer()
         Text("¥\(order.totalAmount, specifier: "%.2f")").font(.headline)
       }
       Divider()
       HStack {
         if order.status == "new" {
           Button("Mark Preparing") { updateStatus("preparing") }
             .buttonStyle(.borderedProminent)
         }
         if order.status == "preparing" {
           Button("Mark Ready") { updateStatus("ready") }
             .buttonStyle(.borderedProminent)
         }
         if order.status == "ready" {
           Button("Complete & Print") { completeAndPrint() }
             .buttonStyle(.borderedProminent)
         }
       }
       Spacer()
     }
     .padding()
     .navigationTitle("Order Details")
   }

   func updateStatus(_ newStatus: String) {
     Task {
       do {
         try await service.updateOrderStatus(orderId: order.id, newStatus: newStatus)
         order.status = newStatus
       } catch {
         // Show error alert
       }
     }
   }

   func completeAndPrint() {
     updateStatus("completed")
     PrinterManager.shared.printReceipt(order: order)
   }
 }
 ```  
 (Req 6.5)  
````

* Test that tapping each status button updates the order in Supabase (check the `orders` table) and that the UI updates accordingly. When “Complete & Print” is tapped, the app should call `PrinterManager.printReceipt(order)` and remove the order from `activeOrders`.

---

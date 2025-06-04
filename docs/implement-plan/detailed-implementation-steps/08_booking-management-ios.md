### 8. Booking Management in iOS App

8.1. **BookingService (Realtime Subscription & CRUD)**

* Create `BookingService.swift`:

  ```swift
  import Foundation
  import Supabase

  class BookingService: ObservableObject {
    @Published var bookings: [Booking] = []
    private let client: SupabaseClient
    private var subscription: RealtimeChannel?

    init(jwt: String, restaurantId: String) {
      client = SupabaseClient(supabaseURL: Config.supabaseUrl, supabaseKey: jwt)
      subscribeToBookings(restaurantId: restaurantId)
    }

    private func subscribeToBookings(restaurantId: String) {
      subscription = client
        .realtime
        .channel("public:bookings")
        .on(
          .postgresChanges(table: "bookings", filter: "restaurant_id=eq.\(restaurantId)"),
          { [weak self] payload in
            let newObj = payload.newObj
            let oldObj = payload.oldObj
            let eventType = payload.eventType
            DispatchQueue.main.async {
              switch eventType {
              case .INSERT:
                if let booking = Booking(from: newObj) {
                  self?.bookings.append(booking)
                }
              case .UPDATE:
                if let booking = Booking(from: newObj),
                   let idx = self?.bookings.firstIndex(where: { $0.id == booking.id }) {
                  self?.bookings[idx] = booking
                }
              case .DELETE:
                if let id = oldObj["id"] as? String,
                   let idx = self?.bookings.firstIndex(where: { $0.id == id }) {
                  self?.bookings.remove(at: idx)
                }
              default:
                break
              }
            }
          }
        )
        .subscribe()
    }

    func updateBookingStatus(bookingId: String, newStatus: String) async throws {
      let response = try await client.database
        .from("bookings")
        .update(values: ["status": newStatus])
        .eq(column: "id", value: bookingId)
        .execute()
      if let error = response.error { throw error }
    }
  }

  struct Booking: Identifiable {
    let id: String
    let tableId: String
    let customerName: String
    let customerContact: String
    let bookingDate: Date
    let bookingTime: String
    let partySize: Int
    let preorderItems: [[String: Any]]
    let status: String

    init?(from dict: [String: Any]) {
      // parse fields from dictionary into Booking properties
    }
  }
  ```

  (Req 6.8)
* Test by creating a booking via the web and confirm it appears immediately in the iOS app. Changing its status via the web should update the app in real time.

8.2. **BookingListView\.swift**

```swift
import SwiftUI

struct BookingListView: View {
  @ObservedObject var bookingService: BookingService

  var body: some View {
    NavigationView {
      List(bookingService.bookings) { booking in
        NavigationLink(destination: BookingDetailView(booking: booking, service: bookingService)) {
          VStack(alignment: .leading) {
            Text(booking.customerName).font(.headline)
            Text("\(booking.bookingDate, formatter: DateFormatter.shortDate) @ \(booking.bookingTime)")
              .font(.subheadline)
            Text("Party: \(booking.partySize)").font(.subheadline)
          }
        }
      }
      .navigationTitle("Table Bookings")
    }
  }
}
```

(Req 6.8)

* Add `BookingListView` as a separate tab or a section in the same TabView as orders.

8.3. **BookingDetailView\.swift**

```swift
import SwiftUI

struct BookingDetailView: View {
  @State var booking: Booking
  @ObservedObject var service: BookingService

  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      Text("Customer: \(booking.customerName)").font(.title2)
      Text("Contact: \(booking.customerContact)").font(.body)
      Text("Date: \(booking.bookingDate, formatter: DateFormatter.shortDate)").font(.body)
      Text("Time: \(booking.bookingTime)").font(.body)
      Text("Party Size: \(booking.partySize)").font(.body)
      if !booking.preorderItems.isEmpty {
        Text("Preorder Items:").font(.headline)
        ForEach(booking.preorderItems, id: \.self) { item in
          let name = item["menuItemName"] as? String ?? "Unknown"
          let qty = item["quantity"] as? Int ?? 0
          let notes = item["notes"] as? String ?? ""
          Text("\(name) x\(qty) \(notes)")
        }
      }
      HStack {
        if booking.status == "pending" {
          Button("Confirm") { updateStatus("confirmed") }
            .buttonStyle(.borderedProminent)
          Button("Cancel") { updateStatus("canceled") }
            .buttonStyle(.bordered)
        } else if booking.status == "confirmed" {
          Button("Cancel") { updateStatus("canceled") }
            .buttonStyle(.bordered)
        }
      }
      Spacer()
    }
    .padding()
    .navigationTitle("Booking Details")
  }

  func updateStatus(_ newStatus: String) {
    Task {
      do {
        try await service.updateBookingStatus(bookingId: booking.id, newStatus: newStatus)
        booking.status = newStatus
      } catch {
        // Show error
      }
    }
  }
}
```

(Req 6.8)

* Test: confirm that tapping “Confirm” changes `bookings.status` to “confirmed” in Supabase and the UI badge updates.
  ‣ (Req 6.8)

---

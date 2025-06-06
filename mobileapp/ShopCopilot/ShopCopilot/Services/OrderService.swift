import Foundation
import Supabase
import Combine

/// Service responsible for listening to realtime order updates and exposing an
/// array of active orders to the UI. Annotated with `@MainActor` so that all
/// published changes occur on the main thread.
@MainActor
class OrderService: ObservableObject {
    @Published var activeOrders: [Order] = []

    private var client: SupabaseClient?
    private var orderSubscription: RealtimeChannel?
    private var restaurantId: String?

    // Debouncer for processing batch updates or frequent single updates
    private var updateDebouncer: AnyCancellable?

    init() {
        // Initialization is now handled by initializeSubscription
    }

    deinit {
        unsubscribe()
    }

    func initializeSubscription(jwt: String, restaurantId: String) {
        // If already subscribed for the same restaurant, don't re-initialize
        if self.client != nil && self.orderSubscription != nil && self.restaurantId == restaurantId {
            print("OrderService: Subscription already active for restaurant \(restaurantId).")
            return
        }

        // If there's an existing subscription (e.g. different restaurant), unsubscribe first
        if self.orderSubscription != nil {
            unsubscribe()
        }

        self.restaurantId = restaurantId
        self.client = SupabaseClient(
            supabaseURL: URL(string: Config.supabaseUrl)!,
            supabaseKey: Config.supabaseAnonKey,
            options: SupabaseClientOptions(
                global: SupabaseGlobalClientOptions(
                    headers: ["Authorization": "Bearer \(jwt)"]
                )
            )
        )

        guard let client = self.client else {
            print("OrderService: Supabase client initialization failed.")
            return
        }

        orderSubscription = client.realtime
            .channel("public:orders")
            .on(
                event: "postgres_changes",
                filter: RealtimeChannelFilter(
                    type: .postgresChanges,
                    schema: "public",
                    table: "orders",
                    filter: "restaurant_id=eq.\(restaurantId)" // Ensure this matches your RLS policy and column name
                )
            ) { [weak self] message in
                self?.handleOrderChange(payload: message)
            }
            .subscribe { [weak self] status, error in
                DispatchQueue.main.async {
                    if let error = error {
                        print("OrderService: Realtime subscription error: \(error.localizedDescription)")
                        // Potentially try to resubscribe or notify user
                    } else {
                        print("OrderService: Realtime subscription status: \(status)")
                        if status == .subscribed {
                            // Initial fetch of orders can be done here if needed,
                            // though realtime should provide current state.
                            // For safety, or if initial data isn't pushed on subscribe,
                            // you might fetch existing active orders once.
                            self?.fetchInitialActiveOrders()
                        }
                    }
                }
            }
        print("OrderService: Subscribed to orders for restaurant \(restaurantId)")
    }

    private func fetchInitialActiveOrders() {
        guard let client = client, let restaurantId = restaurantId else { return }
        Task {
            do {
                let query = client.database
                    .from("orders")
                    .select(columns: """
                    id, table_id, total_amount, status, created_at, restaurant_id,
                    items:order_items (id, menu_item_id, menu_item_name, quantity, notes)
                    """) // Adjust columns as per your actual schema
                    .eq(column: "restaurant_id", value: restaurantId)
                    .neq(column: "status", value: OrderStatus.completed.rawValue) // Fetch only active orders
                    .order(column: "created_at", ascending: false)

                let response: [Order] = try await query.execute().value

                DispatchQueue.main.async {
                    self.activeOrders = response
                    self.sortOrders()
                    print("OrderService: Fetched initial \(response.count) active orders.")
                }
            } catch {
                print("OrderService: Error fetching initial active orders: \(error.localizedDescription)")
            }
        }
    }


    private func handleOrderChange(payload: RealtimeMessage) {
        // Debounce updates to avoid UI churn with rapid changes
        // Cancels previous debouncer if a new message comes in quickly
        updateDebouncer?.cancel()
        updateDebouncer = Just(payload)
            .delay(for: .milliseconds(100), scheduler: DispatchQueue.main) // Adjust delay as needed
            .sink { [weak self] debouncedPayload in
                self?.processOrderChange(payload: debouncedPayload)
            }
    }

    private func processOrderChange(payload: RealtimeMessage) {
        guard let changes = payload.payload["data"] as? [String: Any],
              let record = changes["record"] as? [String: Any] else {
            // Handle delete, where record might be in `old_record`
            if payload.eventType == .delete,
               let oldRecord = (payload.payload["data"] as? [String: Any])?["old_record"] as? [String: Any],
               let orderId = oldRecord["id"] as? String {
                DispatchQueue.main.async {
                    self.activeOrders.removeAll { $0.id == orderId }
                    self.sortOrders()
                     print("OrderService: Deleted order \(orderId)")
                }
            } else {
                print("OrderService: Could not parse record from payload: \(payload)")
            }
            return
        }

        guard let order = Order(from: record) else {
            print("OrderService: Could not decode order from record: \(record)")
            return
        }

        DispatchQueue.main.async {
            switch payload.eventType {
            case .insert:
                if order.status != .completed {
                    if !self.activeOrders.contains(where: { $0.id == order.id }) {
                        self.activeOrders.append(order)
                        print("OrderService: Inserted order \(order.id)")
                    } else {
                         print("OrderService: Received insert for existing order \(order.id), likely due to subscription reconnect. Ignoring.")
                    }
                }
            case .update:
                if let index = self.activeOrders.firstIndex(where: { $0.id == order.id }) {
                    if order.status == .completed {
                        self.activeOrders.remove(at: index)
                        print("OrderService: Order \(order.id) completed and removed.")
                    } else {
                        self.activeOrders[index] = order
                        print("OrderService: Updated order \(order.id)")
                    }
                } else if order.status != .completed {
                    // If an update is for an order not in the list (e.g. status changed from completed to active)
                    self.activeOrders.append(order)
                    print("OrderService: Order \(order.id) became active and was added.")
                }
            case .delete: // Delete is handled above by checking old_record
                break
            default:
                print("OrderService: Unhandled event type: \(payload.eventType)")
            }
            self.sortOrders()
        }
    }

    private func sortOrders() {
        activeOrders.sort { $0.createdAt > $1.createdAt }
    }

    func updateOrderStatus(orderId: String, newStatus: OrderStatus) async throws {
        guard let client = client else {
            print("OrderService: Supabase client not initialized.")
            throw OrderServiceError.clientNotInitialized
        }

        struct OrderStatusUpdate: Encodable {
            let status: String
        }
        let updateData = OrderStatusUpdate(status: newStatus.rawValue)

        do {
            try await client.database
                .from("orders")
                .update(values: updateData)
                .eq(column: "id", value: orderId)
                .execute()
            print("OrderService: Successfully requested status update for order \(orderId) to \(newStatus.rawValue). Realtime should reflect change.")
        } catch {
            print("OrderService: Error updating order status in Supabase: \(error.localizedDescription)")
            throw error
        }
        // The local activeOrders list will be updated by the realtime subscription callback
    }

    func unsubscribe() {
        DispatchQueue.main.async { // Ensure UI-related properties are cleared on main thread
            self.activeOrders = []
        }
        if let orderSubscription = orderSubscription {
            orderSubscription.unsubscribe()
            print("OrderService: Unsubscribed from order changes.")
        }
        self.orderSubscription = nil
        self.client = nil // Release client
        self.restaurantId = nil
        self.updateDebouncer?.cancel() // Cancel any pending debounced updates
        print("OrderService: Cleared subscription details and client.")
    }
}

enum OrderServiceError: Error {
    case clientNotInitialized
    case supabaseError(Error)
}

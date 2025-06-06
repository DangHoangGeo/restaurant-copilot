import Foundation
import Combine
import Supabase

// Define RealtimeStatus enum here or in a separate file
enum RealtimeStatus {
    case connecting, connected, disconnected, error
}

/// Service responsible for listening to realtime order updates and exposing an
/// array of active orders to the UI. Annotated with `@MainActor` so that all
/// published changes occur on the main thread.
@MainActor
class OrderService: ObservableObject {
    @Published var activeOrders: [Order] = []
    @Published var subscriptionStatus: RealtimeStatus = .disconnected
    @Published var subscriptionError: String? = nil

    private var client: SupabaseClient?
    private var orderSubscription: RealtimeChannel?
    private var restaurantId: String?
    private var jwtToken: String? // Store JWT for retries

    // Retry logic state variables
    private var currentRetryAttempt: Int = 0
    private let maxRetryAttempts: Int = 5
    private let retryDelaySeconds: Double = 5.0

    // Debouncer for processing batch updates or frequent single updates
    private var updateDebouncer: AnyCancellable?

    init() {
        // Initialization is now handled by initializeSubscription
    }

    deinit {
        Task { @MainActor in
            unsubscribe()
        }
    }

    func initializeSubscription(jwt: String, restaurantId: String) {
        // If already subscribed for the same restaurant and status is connected/connecting, skip
        if let existingClient = self.client,
           let existingChannel = self.orderSubscription,
           self.restaurantId == restaurantId,
           (self.subscriptionStatus == .connected || self.subscriptionStatus == .connecting) {
            print("OrderService: Subscription already active or connecting for restaurant \(restaurantId).")
            return
        }

        // If there’s an existing subscription (e.g., different restaurant), unsubscribe first
        if self.orderSubscription != nil {
            unsubscribe()
        }

        print("OrderService: Initializing subscription for restaurant \(restaurantId)...")
        self.jwtToken = jwt
        self.restaurantId = restaurantId
        self.subscriptionStatus = .connecting
        self.subscriptionError = nil

        // 1) Initialize supabase client (no AuthOptions)
        self.client = SupabaseClient(
            supabaseURL: URL(string: Config.supabaseUrl)!,
            supabaseKey: Config.supabaseAnonKey
        )

        guard let client = self.client else {
            print("OrderService: Supabase client initialization failed.")
            DispatchQueue.main.async {
                self.subscriptionStatus = .error
                self.subscriptionError = "Client initialization failed."
            }
            return
        }

        // 2) Attach JWT for Realtime via `setAuth(_:)`
        Task {
            await client.realtime.setAuth(jwt)
        }

        // 3) Subscribe to Postgres changes using ChannelFilter + `.on("postgres_changes")`
        orderSubscription = client.realtime
            .channel("public:orders")
            .on(
                "postgres_changes",
                filter: ChannelFilter(
                    event: "*",
                    schema: "public",
                    table: "orders",
                    filter: "restaurant_id=eq.\(restaurantId)"
                )
            ) { [weak self] message in
                self?.handleOrderChange(payload: message)
            }

        // 4) Subscribe with a callback (no await)
        orderSubscription?.subscribe { [weak self] status, error in
            guard let self = self else { return }
            DispatchQueue.main.async {
                if let error = error {
                    print("OrderService: Realtime subscription error: \(error.localizedDescription)")
                    self.subscriptionStatus = .error
                    self.subscriptionError = "Failed to connect. Retrying..."
                    self.attemptReconnection()
                } else {
                    print("OrderService: Realtime subscription status: \(status)")
                    switch status {
                    case .subscribed:
                        self.subscriptionStatus = .connected
                        self.subscriptionError = nil
                        self.currentRetryAttempt = 0
                        self.fetchInitialActiveOrders()
                    case .closed, .channelError, .timedOut:
                        self.subscriptionStatus = (status == .timedOut) ? .error : .disconnected
                        self.subscriptionError = (self.subscriptionStatus == .error)
                            ? "Connection timed out. Retrying..."
                            : "Connection closed. Retrying..."
                        if self.orderSubscription != nil {
                            self.attemptReconnection()
                        }
                    default:
                        break
                    }
                }
            }
        }
    }

    private func attemptReconnection() {
        guard currentRetryAttempt < maxRetryAttempts else {
            print("OrderService: Max retry attempts reached for restaurant \(restaurantId ?? "unknown"). Giving up.")
            DispatchQueue.main.async {
                self.subscriptionStatus = .error
                self.subscriptionError = "Real-time service unavailable. Please try again later."
            }
            return
        }

        currentRetryAttempt += 1
        print("OrderService: Attempting reconnection (\(currentRetryAttempt)/\(maxRetryAttempts)) for restaurant \(restaurantId ?? "unknown") in \(retryDelaySeconds) seconds...")
        DispatchQueue.main.async {
            self.subscriptionStatus = .connecting
            self.subscriptionError = "Connection failed. Attempting to reconnect (\(self.currentRetryAttempt)/\(self.maxRetryAttempts))..."
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + retryDelaySeconds) { [weak self] in
            guard let self = self, let jwt = self.jwtToken, let resId = self.restaurantId else {
                print("OrderService: Cannot retry, JWT or Restaurant ID missing.")
                return
            }
            if self.subscriptionStatus == .connecting || self.subscriptionStatus == .error {
                print("OrderService: Retrying subscription for restaurant \(resId)...")
                self.initializeSubscription(jwt: jwt, restaurantId: resId)
            } else {
                print("OrderService: Skipping retry as status is now \(self.subscriptionStatus) for restaurant \(resId).")
            }
        }
    }

    private func fetchInitialActiveOrders() {
        guard let client = client, let restaurantId = restaurantId else {
            print("OrderService: Client or restaurantId not available for fetching initial orders.")
            return
        }
        Task {
            do {
                // 5) Use .execute().value to decode into [Order]
                let orders: [Order] = try await client.database
                    .from("orders")
                    .select("""
                        id, table_id, total_amount, status, created_at, restaurant_id,
                        items:order_items (id, menu_item_id, menu_item_name, quantity, notes)
                    """)
                    .eq("restaurant_id", value: restaurantId)
                    .neq("status", value: OrderStatus.completed.rawValue)
                    .order("created_at", ascending: false)
                    .execute()
                    .value

                DispatchQueue.main.async {
                    self.activeOrders = orders
                    self.sortOrders()
                    print("OrderService: Fetched initial \(orders.count) active orders.")
                }
            } catch {
                print("OrderService: Error fetching initial active orders: \(error.localizedDescription)")
            }
        }
    }

    private func handleOrderChange(payload: RealtimeMessage) {
        // Debounce updates to avoid UI churn
        updateDebouncer?.cancel()
        updateDebouncer = Just(payload)
            .delay(for: .milliseconds(100), scheduler: DispatchQueue.main)
            .sink { [weak self] debouncedPayload in
                self?.processOrderChange(payload: debouncedPayload)
            }
    }

    private func processOrderChange(payload: RealtimeMessage) {
        // 6) Look for “new” vs. “old” in payload.payload
        guard let newRecord = payload.payload["new"] as? [String: Any] else {
            // DELETE handling via “old”
            if let oldRecord = payload.payload["old"] as? [String: Any],
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

        guard let order = Order(from: newRecord) else {
            print("OrderService: Could not decode order from record: \(newRecord)")
            return
        }

        DispatchQueue.main.async {
            let eventTypeString = (payload.payload["eventType"] as? String) ?? (payload.payload["type"] as? String) // “INSERT”, “UPDATE”, or “DELETE”
            switch eventTypeString {
            case "INSERT":
                if order.status != .completed {
                    if !self.activeOrders.contains(where: { $0.id == order.id }) {
                        self.activeOrders.append(order)
                        print("OrderService: Inserted order \(order.id)")
                    } else {
                        print("OrderService: Received insert for existing order \(order.id); ignoring.")
                    }
                }
            case "UPDATE":
                if let index = self.activeOrders.firstIndex(where: { $0.id == order.id }) {
                    if order.status == .completed {
                        self.activeOrders.remove(at: index)
                        print("OrderService: Order \(order.id) completed and removed.")
                    } else {
                        self.activeOrders[index] = order
                        print("OrderService: Updated order \(order.id)")
                    }
                } else if order.status != .completed {
                    self.activeOrders.append(order)
                    print("OrderService: Order \(order.id) became active and was added.")
                }
            case "DELETE":
                // already handled above via “old”
                break
            default:
                print("OrderService: Unhandled event type: \(eventTypeString ?? "unknown")")
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
            // 7) Use execute() directly; no .get() needed
            _ = try await client.database
                .from("orders")
                .update(updateData)
                .eq("id", value: orderId)
                .execute()

            print("OrderService: Successfully requested status update for order \(orderId) to \(newStatus.rawValue).")
        } catch {
            print("OrderService: Error updating order status in Supabase: \(error.localizedDescription)")
            throw error
        }
    }

    func unsubscribe() {
        print("OrderService: Unsubscribing and resetting state for restaurant \(restaurantId ?? "N/A").")
        DispatchQueue.main.async {
            self.activeOrders = []
            self.subscriptionStatus = .disconnected
            self.subscriptionError = nil
        }

        if let channel = orderSubscription {
            Task { @MainActor in
                await channel.unsubscribe()
                print("OrderService: Realtime channel unsubscribed.")
            }
        }

        self.orderSubscription = nil
        self.currentRetryAttempt = 0
        self.updateDebouncer?.cancel()
        print("OrderService: Cleared subscription details, reset retry attempts, and status.")
    }
}

enum OrderServiceError: Error {
    case clientNotInitialized
    case supabaseError(Error)
}

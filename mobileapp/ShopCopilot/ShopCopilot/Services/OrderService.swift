import Foundation
import Supabase
import Combine

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
    private let retryDelaySeconds: Double = 5.0 // Could implement exponential backoff

    // Debouncer for processing batch updates or frequent single updates
    private var updateDebouncer: AnyCancellable?

    init() {
        // Initialization is now handled by initializeSubscription
    }

    deinit {
        unsubscribe()
    }

    func initializeSubscription(jwt: String, restaurantId: String) {
        // If already subscribed for the same restaurant and status is connected or connecting, don't re-initialize
        if self.client != nil && self.orderSubscription != nil && self.restaurantId == restaurantId && (self.subscriptionStatus == .connected || self.subscriptionStatus == .connecting) {
            print("OrderService: Subscription already active or connecting for restaurant \(restaurantId).")
            return
        }

        // If there's an existing subscription (e.g. different restaurant or trying to re-init), unsubscribe first
        // This also clears previous retry attempts by calling unsubscribe()
        if self.orderSubscription != nil {
            unsubscribe() // Resets retry attempts and status
        }

        print("OrderService: Initializing subscription for restaurant \(restaurantId)...")
        self.jwtToken = jwt // Store JWT for potential retries
        self.restaurantId = restaurantId
        self.subscriptionStatus = .connecting
        self.subscriptionError = nil

        self.client = SupabaseClient(
            supabaseURL: URL(string: Config.supabaseUrl)!,
            supabaseKey: Config.supabaseAnonKey,
            options: SupabaseClientOptions(
                global: SupabaseGlobalClientOptions(
                    headers: ["Authorization": "Bearer \(self.jwtToken!)"] // Use stored token
                )
            )
        )

        guard let client = self.client else {
            print("OrderService: Supabase client initialization failed.")
            DispatchQueue.main.async {
                self.subscriptionStatus = .error
                self.subscriptionError = "Client initialization failed."
            }
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
                    filter: "restaurant_id=eq.\(self.restaurantId!)" // Use stored restaurantId
                )
            ) { [weak self] message in
                self?.handleOrderChange(payload: message)
            }
            .subscribe { [weak self] status, error in
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
                            // Treat these as disconnection/error and attempt to reconnect
                            self.subscriptionStatus = (status == .timedOut) ? .error : .disconnected
                            if self.subscriptionStatus == .error {
                                self.subscriptionError = "Connection timed out. Retrying..."
                            } else {
                                self.subscriptionError = "Connection closed. Retrying..."
                            }
                            // Only attempt reconnection if not explicitly unsubscribed
                            if self.orderSubscription != nil { // Check if unsubscribe was called
                                 self.attemptReconnection()
                            }
                        default:
                            // Handle other statuses if necessary, for now, we are interested in subscribed, closed, error.
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
            // Update error message to reflect retry attempt
            self.subscriptionError = "Connection failed. Attempting to reconnect (\(self.currentRetryAttempt)/\(self.maxRetryAttempts))..."
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + retryDelaySeconds) { [weak self] in
            guard let self = self, let jwt = self.jwtToken, let resId = self.restaurantId else {
                print("OrderService: Cannot retry, JWT or Restaurant ID missing.")
                return
            }
            // Only retry if we haven't successfully connected or explicitly unsubscribed in the meantime
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
                // Order.status is now OrderStatus, compare with .completed case
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
                    // Order.status is now OrderStatus, compare with .completed case
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
        print("OrderService: Unsubscribing and resetting state for restaurant \(restaurantId ?? "N/A").")
        DispatchQueue.main.async { // Ensure UI-related properties are cleared on main thread
            self.activeOrders = []
            self.subscriptionStatus = .disconnected
            self.subscriptionError = nil
        }

        if let orderSubscription = orderSubscription {
            orderSubscription.unsubscribe()
            print("OrderService: Realtime channel unsubscribed.")
        }

        self.orderSubscription = nil
        // Do not nullify client, jwtToken, restaurantId if you want manual re-initiation to work without new params.
        // However, for a full clean slate, especially if tenant changes, nullifying them is better.
        // For this task, let's keep them if a manual call to initializeSubscription is made later with new/same params.
        // self.client = nil
        // self.jwtToken = nil
        // self.restaurantId = nil

        self.currentRetryAttempt = 0 // Reset retry attempts
        self.updateDebouncer?.cancel() // Cancel any pending debounced updates
        print("OrderService: Cleared subscription details, reset retry attempts, and status.")
    }
}

enum OrderServiceError: Error {
    case clientNotInitialized
    case supabaseError(Error)
    // Potentially add more specific errors related to subscription if needed
}

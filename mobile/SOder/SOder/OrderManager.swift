import Foundation
import Supabase
import Combine

class OrderManager: ObservableObject {
    private let supabaseManager = SupabaseManager.shared
    
    @Published var orders: [Order] = []
    @Published var isLoading = false
    @Published var errorMessage: String? = nil
    @Published var isRealtimeConnected = false
    
    private var realtimeChannel: RealtimeChannelV2?
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // Monitor authentication state changes
        setupAuthenticationMonitoring()
    }
    
    deinit {
        //realtimeChannel?.unsubscribe()
        cancellables.removeAll()
    }
    
    // MARK: - Authentication Monitoring
    private func setupAuthenticationMonitoring() {
        // Listen for authentication state changes
        supabaseManager.$isAuthenticated
            .combineLatest(supabaseManager.$currentRestaurant)
            .sink { [weak self] (isAuthenticated, restaurant) in
                // Use Task to bridge async context
                Task { @MainActor in
                    if isAuthenticated && restaurant != nil {
                        await self?.onAuthenticationSuccess()
                    } else {
                        await self?.onAuthenticationLost()
                    }
                }
            }
            .store(in: &cancellables)
    }
    
    @MainActor
    private func onAuthenticationSuccess() async {
        print("Authentication successful - setting up OrderManager")
        await setupRealtimeSubscription()
        await fetchActiveOrders()
    }
    
    @MainActor
    private func onAuthenticationLost() async {
        print("Authentication lost - cleaning up OrderManager")
        await cleanupRealtimeSubscription()
        orders = []
        errorMessage = "Authentication required"
        isRealtimeConnected = false
    }
    
    // MARK: - Fetch Orders
    @MainActor
    func fetchActiveOrders() async {
        guard supabaseManager.isAuthenticated else {
            errorMessage = "User not authenticated"
            print("Cannot fetch orders - user not authenticated")
            return
        }
        
        guard let restaurantId = supabaseManager.currentRestaurantId else {
            errorMessage = "No restaurant ID available"
            print("No restaurant ID available - restaurant not loaded")
            return
        }
        
        print("Fetching orders for restaurant ID: \(restaurantId)")
        
        isLoading = true
        errorMessage = nil
        
        do {
            // Use the efficient PostgreSQL function - single call!
            let response: [OrderWithDetailsResponse] = try await supabaseManager.client
                .rpc("get_active_orders_with_details", params: ["restaurant_uuid": restaurantId])
                .execute()
                .value
            
            // Convert response to Order models
            self.orders = response.map { $0.toOrder() }
            
            print("Active orders fetched efficiently: \(self.orders.count)")
            
            // Debug: Print order details
            for order in self.orders {
                print("Order ID: \(order.id), Table: \(order.table?.name ?? order.table_id), Status: \(order.status), Items: \(order.order_items?.count ?? 0)")
            }
            
        } catch {
            errorMessage = "Failed to fetch orders: \(error.localizedDescription)"
            print("Error fetching orders: \(error)")
        }
        
        isLoading = false
    }
    
    // MARK: - Update Order Status
    @MainActor
    func updateOrderStatus(orderId: String, newStatus: OrderStatus) async {
        do {
            let _: Order = try await supabaseManager.client
                .from("orders")
                .update([
                    "status": newStatus.rawValue,
                    "updated_at": ISO8601DateFormatter().string(from: Date())
                ])
                .eq("id", value: orderId)
                .single()
                .execute()
                .value
            
            // Update local state
            if let index = orders.firstIndex(where: { $0.id == orderId }) {
                orders[index].status = newStatus
                orders[index].updated_at = ISO8601DateFormatter().string(from: Date())
                
                // If order is completed, remove it from the list
                if newStatus == .completed {
                    orders.remove(at: index)
                }
            }
            
            print("Updated order status to \(newStatus.rawValue)")
            
        } catch {
            errorMessage = "Failed to update order status: \(error.localizedDescription)"
            print("Error updating order status: \(error)")
        }
    }
    
    // MARK: - Update Order Item Status
    @MainActor
    func updateOrderItemStatus(orderItemId: String, newStatus: OrderItemStatus) async {
        do {
            let _: OrderItem = try await supabaseManager.client
                .from("order_items")
                .update([
                    "status": newStatus.rawValue
                ])
                .eq("id", value: orderItemId)
                .single()
                .execute()
                .value
            
            // Update local state
            for (orderIndex, order) in orders.enumerated() {
                if let orderItems = order.order_items,
                   let itemIndex = orderItems.firstIndex(where: { $0.id == orderItemId }) {
                    orders[orderIndex].order_items?[itemIndex] = OrderItem(
                        id: orderItems[itemIndex].id,
                        restaurant_id: orderItems[itemIndex].restaurant_id,
                        order_id: orderItems[itemIndex].order_id,
                        menu_item_id: orderItems[itemIndex].menu_item_id,
                        quantity: orderItems[itemIndex].quantity,
                        notes: orderItems[itemIndex].notes,
                        status: newStatus,
                        created_at: orderItems[itemIndex].created_at,
                        menu_item: orderItems[itemIndex].menu_item
                    )
                    break
                }
            }
            
            print("Updated order item status to \(newStatus.rawValue)")
            
        } catch {
            errorMessage = "Failed to update order item status: \(error.localizedDescription)"
            print("Error updating order item status: \(error)")
        }
    }
    
    // MARK: - Realtime Subscription Management
    private func setupRealtimeSubscription() async {
        // Clean up any existing subscription first
        await cleanupRealtimeSubscription()
        
        guard supabaseManager.isAuthenticated else {
            print("Cannot setup realtime subscription - user not authenticated")
            return
        }
        
        guard let restaurantId = supabaseManager.currentRestaurantId else {
            print("Cannot setup realtime subscription - no restaurant ID")
            return
        }
        
        print("Setting up realtime subscription for restaurant: \(restaurantId)")
        
        realtimeChannel = supabaseManager.client.realtimeV2.channel("orders-\(restaurantId)")
        
        // Listen for order insertions
        if let ordersInsertion = realtimeChannel?.postgresChange(
            InsertAction.self,
            schema: "public",
            table: "orders",
            filter: "restaurant_id=eq.\(restaurantId)"
        ) {
            Task { [weak self] in
                for await _ in ordersInsertion {
                    print("New order inserted via realtime")
                    await MainActor.run {
                        Task { await self?.handleOrderChange() }
                    }
                }
            }
        }
        // Listen for order updates
        if let ordersUpdate = realtimeChannel?.postgresChange(
            UpdateAction.self,
            schema: "public",
            table: "orders",
            filter: "restaurant_id=eq.\(restaurantId)"
        ) {
            Task { [weak self] in
                for await _ in ordersUpdate {
                    print("Order updated via realtime")
                    await MainActor.run {
                        Task { await self?.handleOrderChange() }
                    }
                }
            }
        }
        // Listen for order item updates
        if let orderItemsUpdate = realtimeChannel?.postgresChange(
            UpdateAction.self,
            schema: "public",
            table: "order_items"
        ) {
            Task { [weak self] in
                for await _ in orderItemsUpdate {
                    print("Order item updated via realtime")
                    await MainActor.run {
                        Task { await self?.handleOrderItemChange() }
                    }
                }
            }
        }
        // Listen for subscription status
        if let channel = realtimeChannel {
            Task { [weak self] in
                // channel.subscribe() returns Void, not AsyncSequence, so just call it
                await channel.subscribe()
            }
        }
    }
    
    private func cleanupRealtimeSubscription() async {
        if let channel = realtimeChannel {
            await channel.unsubscribe()
            realtimeChannel = nil
            print("Cleaned up realtime subscription")
        }
        isRealtimeConnected = false
    }
    
    @MainActor
    private func handleOrderChange() {
        // Refresh orders when changes occur
        Task { [weak self] in
            await self?.fetchActiveOrders()
        }
    }
    
    @MainActor
    private func handleOrderItemChange() {
        // Refresh orders when order items change
        Task { [weak self] in
            await self?.fetchActiveOrders()
        }
    }
    
    // MARK: - Public Methods for Manual Control
    @MainActor
    func refreshOrders() async {
        await fetchActiveOrders()
    }
    
    @MainActor
    func reconnectRealtime() async {
        await setupRealtimeSubscription()
    }
    
    // MARK: - Helper Functions
    private func withTimeout<T>(seconds: TimeInterval, operation: @escaping () async throws -> T) async throws -> T {
        return try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask {
                return try await operation()
            }
            
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000))
                throw TimeoutError()
            }
            
            guard let result = try await group.next() else {
                throw TimeoutError()
            }
            
            group.cancelAll()
            return result
        }
    }
}

struct TimeoutError: LocalizedError {
    var errorDescription: String? {
        return "Request timed out"
    }
}

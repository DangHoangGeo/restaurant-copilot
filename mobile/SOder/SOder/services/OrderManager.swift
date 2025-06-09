import Foundation
import Supabase
import Combine
#if os(iOS)
import UIKit
#endif

class OrderManager: ObservableObject {
    private let supabaseManager = SupabaseManager.shared
    
    @Published var orders: [Order] = []
    @Published var allOrders: [Order] = []  // Add missing allOrders property
    @Published var isLoading = false
    @Published var errorMessage: String? = nil
    @Published var isRealtimeConnected = false
    @Published var newOrderIds: Set<String> = []
    
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
            print("Cannot fetch orders - no restaurant ID")
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let response: [OrderWithTableResponse] = try await supabaseManager.client
                .from("orders")
                .select("""
                    *,
                    table:tables(*),
                    order_items(
                        *,
                        menu_item:menu_items(*)
                    )
                """)
                .eq("restaurant_id", value: restaurantId)
                .in("status", values: ["new", "preparing", "ready"])
                .order("created_at", ascending: false)
                .execute()
                .value
            
            self.orders = response.map { $0.toOrder() }
            print("Fetched \(orders.count) active orders")
            
            for order in orders {
                print("Order ID: \(order.id), Table: \(order.table?.name ?? order.table_id), Status: \(order.status), Items: \(order.order_items?.count ?? 0)")
            }
            
        } catch {
            errorMessage = "Failed to fetch orders: \(error.localizedDescription)"
            print("Error fetching orders: \(error)")
        }
        
        isLoading = false
    }
    
    // Add missing fetchAllOrders method
    @MainActor
    func fetchAllOrders() async {
        guard supabaseManager.isAuthenticated else {
            errorMessage = "User not authenticated"
            print("Cannot fetch all orders - user not authenticated")
            return
        }
        
        guard let restaurantId = supabaseManager.currentRestaurantId else {
            errorMessage = "No restaurant ID available"
            print("Cannot fetch all orders - no restaurant ID")
            return
        }
        
        isLoading = true
        errorMessage = nil
        
        do {
            let response: [OrderWithTableResponse] = try await supabaseManager.client
                .from("orders")
                .select("""
                    *,
                    table:tables(*),
                    order_items(
                        *,
                        menu_item:menu_items(*)
                    )
                """)
                .eq("restaurant_id", value: restaurantId)
                .order("created_at", ascending: false)
                .execute()
                .value
            
            self.allOrders = response.map { $0.toOrder() }
            print("Fetched \(allOrders.count) total orders")
            
        } catch {
            errorMessage = "Failed to fetch all orders: \(error.localizedDescription)"
            print("Error fetching all orders: \(error)")
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
                        Task { @MainActor in
                            await self?.handleOrderChange()
                        }
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
                        Task { @MainActor in
                            await self?.handleOrderChange()
                        }
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
                        Task { @MainActor in
                            await self?.handleOrderItemChange()
                        }
                    }
                }
            }
        }
        // Listen for subscription status
        if let channel = realtimeChannel {
            Task { [weak self] in
                await channel.subscribe()
                await MainActor.run {
                    self?.isRealtimeConnected = true
                }
            }
        }
    }
    
    private func cleanupRealtimeSubscription() async {
        if let channel = realtimeChannel {
            await channel.unsubscribe()
            realtimeChannel = nil
            print("Cleaned up realtime subscription")
        }
        await MainActor.run {
            isRealtimeConnected = false
        }
    }
    
    @MainActor
    private func handleOrderChange() async {
        let previousOrders = orders
        await fetchActiveOrders()
        if orders.count > previousOrders.count {
            triggerFeedback()
        }
    }
    
    @MainActor
    private func handleOrderItemChange() async {
        // Refresh orders when order items change
        await fetchActiveOrders()
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

    private func triggerFeedback() {
        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        #endif
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

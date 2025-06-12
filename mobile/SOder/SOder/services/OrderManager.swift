import Foundation
import Supabase
import Combine
#if os(iOS)
import UIKit
#endif

// MARK: - Auto-printing Statistics
struct AutoPrintStats {
    var totalNewOrdersPrinted: Int = 0
    var totalReadyItemsPrinted: Int = 0
    var lastPrintTime: Date? = nil
    var printFailures: Int = 0
    
    mutating func recordNewOrderPrint() {
        totalNewOrdersPrinted += 1
        lastPrintTime = Date()
    }
    
    mutating func recordReadyItemPrint() {
        totalReadyItemsPrinted += 1
        lastPrintTime = Date()
    }
    
    mutating func recordPrintFailure() {
        printFailures += 1
    }
    
    mutating func reset() {
        totalNewOrdersPrinted = 0
        totalReadyItemsPrinted = 0
        lastPrintTime = nil
        printFailures = 0
    }
}

class OrderManager: ObservableObject {
    private let supabaseManager = SupabaseManager.shared
    
    @Published var orders: [Order] = []
    @Published var allOrders: [Order] = []  // Add missing allOrders property
    @Published var isLoading = false
    @Published var errorMessage: String? = nil
    @Published var isRealtimeConnected = false
    @Published var newOrderIds: Set<String> = []
    
    // Auto-printing tracking
    @Published var autoPrintingEnabled = true
    @Published var lastAutoPrintResult: String? = nil
    @Published var autoPrintingInProgress = false
    @Published var autoPrintStats = AutoPrintStats()
    internal var printedNewOrders: Set<String> = []
    internal var printedReadyItems: Set<String> = []
    
    private var realtimeChannel: RealtimeChannelV2?
    private var cancellables = Set<AnyCancellable>()
    
    init() {
        // Monitor authentication state changes
        setupAuthenticationMonitoring()
        loadAutoPrintingSettings()
    }
    
    deinit {
        //realtimeChannel?.unsubscribe()
        cancellables.removeAll()
    }
    
    // MARK: - Auto-printing Settings
    
    private func loadAutoPrintingSettings() {
        autoPrintingEnabled = UserDefaults.standard.object(forKey: "auto_printing_enabled") as? Bool ?? true
    }
    
    func setAutoPrintingEnabled(_ enabled: Bool) {
        autoPrintingEnabled = enabled
        UserDefaults.standard.set(enabled, forKey: "auto_printing_enabled")
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
                        menu_item:menu_items(
                            *,
                            category:categories(
                                id,
                                name_en,
                                name_ja,
                                name_vi
                            )
                        ),
                        menu_item_size:menu_item_sizes(*),
                        toppings:toppings(*)
                    )
                """)
                .eq("restaurant_id", value: restaurantId)
                .in("status", values: ["new", "serving"])
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
                        menu_item:menu_items(
                            *,
                            category:categories(
                                id,
                                name_en,
                                name_ja,
                                name_vi
                            )
                        ),
                        menu_item_size:menu_item_sizes(*),
                        toppings:toppings(*)
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
    func updateOrderStatus(orderId: String, newStatus: OrderStatus) async throws {
        do {
            // Use a simple update without expecting the full object back
            let _ = try await supabaseManager.client
                .from("orders")
                .update([
                    "status": newStatus.rawValue,
                    "updated_at": ISO8601DateFormatter().string(from: Date())
                ])
                .eq("id", value: orderId)
                .execute()
            
            // Update local state
            if let index = orders.firstIndex(where: { $0.id == orderId }) {
                orders[index].status = newStatus
                orders[index].updated_at = ISO8601DateFormatter().string(from: Date())
                
                // If order is completed, remove it from the list
                if newStatus == .completed {
                    orders.remove(at: index)
                }
            }
            
            // Also update in allOrders if needed
            if let allIndex = allOrders.firstIndex(where: { $0.id == orderId }) {
                allOrders[allIndex].status = newStatus
                allOrders[allIndex].updated_at = ISO8601DateFormatter().string(from: Date())
            }
            
            print("Updated order status to \(newStatus.rawValue)")
            
        } catch {
            print("Error updating order status: \(error)")
            throw error
        }
    }
    
    // MARK: - Update Order Item Notes
    @MainActor
    func updateOrderItemNotes(orderItemId: String, notes: String?) async {
        do {
            let _: OrderItem = try await supabaseManager.client
                .from("order_items")
                .update([
                    "notes": notes
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
                        notes: notes,
                        status: orderItems[itemIndex].status,
                        created_at: orderItems[itemIndex].created_at,
                        updated_at: orderItems[itemIndex].updated_at,
                        menu_item: orderItems[itemIndex].menu_item
                    )
                    break
                }
            }
            
            print("Updated order item notes")
            
        } catch {
            errorMessage = "Failed to update order item notes: \(error.localizedDescription)"
            print("Error updating order item notes: \(error)")
        }
    }
    
    // MARK: - Cancel Order Item
    @MainActor
    func cancelOrderItem(orderItemId: String) async {
        do {
            // Set status to cancelled
            let _: OrderItem = try await supabaseManager.client
                .from("order_items")
                .update([
                    "status": OrderItemStatus.cancelled.rawValue,
                    "updated_at": ISO8601DateFormatter().string(from: Date())
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
                        status: .cancelled,
                        created_at: orderItems[itemIndex].created_at,
                        updated_at: ISO8601DateFormatter().string(from: Date()),
                        menu_item: orderItems[itemIndex].menu_item
                    )
                    break
                }
            }
            
            print("Cancelled order item: \(orderItemId)")
            
        } catch {
            errorMessage = "Failed to cancel order item: \(error.localizedDescription)"
            print("Error cancelling order item: \(error)")
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
                        updated_at: orderItems[itemIndex].updated_at,
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
        
        // Check for new orders to auto-print
        if orders.count > previousOrders.count {
            triggerFeedback()
            
            // Auto-print new orders if enabled and kitchen printer is configured
            if autoPrintingEnabled && hasKitchenPrinter() {
                await autoPrintNewOrders(previousOrders: previousOrders)
            }
        }
    }
    
    @MainActor
    private func handleOrderItemChange() async {
        let previousOrders = orders
        
        // Refresh orders when order items change
        await fetchActiveOrders()
        
        // Check for items changing to "ready" status for auto-printing
        if autoPrintingEnabled && hasKitchenPrinter() {
            await autoPrintReadyItems(previousOrders: previousOrders)
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

    private func triggerFeedback() {
        #if os(iOS)
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        #endif
    }
    
    // MARK: - Auto-printing Methods
    
    private func hasKitchenPrinter() -> Bool {
        let settingsManager = PrinterSettingsManager.shared
        return settingsManager.hasKitchenPrinter() || settingsManager.isUsingDefaultPrinter()
    }
    
    @MainActor
    private func autoPrintNewOrders(previousOrders: [Order]) async {
        let newOrders = findNewOrders(currentOrders: orders, previousOrders: previousOrders)
        
        guard !newOrders.isEmpty else { return }
        
        autoPrintingInProgress = true
        
        for order in newOrders {
            // Skip if already printed
            if printedNewOrders.contains(order.id) {
                continue
            }
            
            // Only print if order has items
            guard let items = order.order_items, !items.isEmpty else {
                continue
            }
            
            do {
                try await PrinterManager().printKitchenSlip(for: order)
                printedNewOrders.insert(order.id)
                autoPrintStats.recordNewOrderPrint()
                
                let tableInfo = order.table?.name ?? "Table \(order.table_id)"
                lastAutoPrintResult = "✅ Auto-printed new order for \(tableInfo)"
                print("Auto-printed new order: \(order.id) for \(tableInfo)")
                
            } catch {
                autoPrintStats.recordPrintFailure()
                lastAutoPrintResult = "❌ Auto-print failed: \(error.localizedDescription)"
                print("Auto-print failed for new order \(order.id): \(error.localizedDescription)")
            }
        }
        
        autoPrintingInProgress = false
        
        // Clear the result message after 5 seconds
        Task {
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            lastAutoPrintResult = nil
        }
    }
    
    @MainActor
    private func autoPrintReadyItems(previousOrders: [Order]) async {
        let readyItems = findItemsChangedToReady(currentOrders: orders, previousOrders: previousOrders)
        
        guard !readyItems.isEmpty else { return }
        
        autoPrintingInProgress = true
        
        for item in readyItems {
            // Skip if already printed
            if printedReadyItems.contains(item.id) {
                continue
            }
            
            // Find the order containing this item
            guard let order = orders.first(where: { order in
                order.order_items?.contains(where: { $0.id == item.id }) == true
            }) else {
                continue
            }
            
            do {
                try await printItemOverview(item: item, order: order)
                printedReadyItems.insert(item.id)
                autoPrintStats.recordReadyItemPrint()
                
                let itemName = item.menu_item?.displayName ?? "Unknown Item"
                let tableInfo = order.table?.name ?? "Table \(order.table_id)"
                lastAutoPrintResult = "✅ Auto-printed ready: \(itemName) for \(tableInfo)"
                print("Auto-printed ready item: \(item.id) - \(itemName)")
                
            } catch {
                autoPrintStats.recordPrintFailure()
                lastAutoPrintResult = "❌ Auto-print failed: \(error.localizedDescription)"
                print("Auto-print failed for ready item \(item.id): \(error.localizedDescription)")
            }
        }
        
        autoPrintingInProgress = false
        
        // Clear the result message after 5 seconds
        Task {
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            lastAutoPrintResult = nil
        }
    }
    
    internal func findNewOrders(currentOrders: [Order], previousOrders: [Order]) -> [Order] {
        let previousOrderIds = Set(previousOrders.map { $0.id })
        return currentOrders.filter { !previousOrderIds.contains($0.id) }
    }
    
    internal func findItemsChangedToReady(currentOrders: [Order], previousOrders: [Order]) -> [OrderItem] {
        var readyItems: [OrderItem] = []
        
        // Create lookup for previous order items
        var previousItemStatuses: [String: OrderItemStatus] = [:]
        for order in previousOrders {
            if let items = order.order_items {
                for item in items {
                    previousItemStatuses[item.id] = item.status
                }
            }
        }
        
        // Check current orders for items that changed to ready
        for order in currentOrders {
            if let items = order.order_items {
                for item in items {
                    if item.status == .ready {
                        let previousStatus = previousItemStatuses[item.id]
                        if previousStatus != .ready {
                            readyItems.append(item)
                        }
                    }
                }
            }
        }
        
        return readyItems
    }
    
    @MainActor
    private func printItemOverview(item: OrderItem, order: Order) async throws {
        let settingsManager = PrinterSettingsManager.shared
        let printerService = PrinterService.shared
        
        // Create a simple overview format for ready items
        var overview = "ITEM READY\n"
        overview += String(repeating: "=", count: 32) + "\n"
        overview += "Item: \(item.menu_item?.displayName ?? "Unknown Item")\n"
        overview += "Table: \(order.table?.name ?? "Table \(order.table_id)")\n"
        overview += "Quantity: \(item.quantity)\n"
        
        if let notes = item.notes, !notes.isEmpty {
            overview += "Notes: \(notes)\n"
        }
        
        overview += "Time: \(DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short))\n"
        overview += String(repeating: "=", count: 32) + "\n\n\n"
        
        let printData = Data(overview.utf8)
        
        // Use kitchen printer if configured, otherwise use default
        switch settingsManager.printerMode {
        case .single:
            try await printerService.connectAndSendData(data: printData)
        case .dual:
            if let kitchenConfig = settingsManager.getKitchenPrinterConfig() {
                try await printerService.connectAndSendData(data: printData, to: kitchenConfig)
            } else {
                try await printerService.connectAndSendData(data: printData)
            }
        }
    }
    
    // MARK: - Clear Print History (for testing/reset)
    
    func clearPrintHistory() {
        printedNewOrders.removeAll()
        printedReadyItems.removeAll()
        autoPrintStats.reset()
        lastAutoPrintResult = "🔄 Print history cleared"
        print("Print history and statistics cleared")
        
        // Clear the result message after 3 seconds
        Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            lastAutoPrintResult = nil
        }
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

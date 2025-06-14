import SwiftUI

/// Main kitchen board coordinator view - streamlined to use modular components
/// and overlay dialog design for better chef workflow
struct KitchenBoardView: View {
    @EnvironmentObject var printerManager: PrinterManager
    @EnvironmentObject private var localizationManager: LocalizationManager
    @StateObject private var orderManager = OrderManager()
    @StateObject private var supabaseManager = SupabaseManager.shared
    
    // State management
    @State private var groupedByCategory: [CategoryGroup] = []
    @State private var selectedCategoryFilter: String = "kitchen_all".localized
    @State private var selectedGroupedItem: GroupedItem? = nil
    @State private var showingItemDetails = false
    @State private var showingPrintAlert = false
    @State private var printMessage = ""
    @State private var refreshTimer: Timer?
    @State private var viewMode: KitchenViewMode = .statusColumns
    
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    
    var body: some View {
        ZStack {
            // Main kitchen view - always visible
            VStack(spacing: 0) {
                // Header with stats and filters
                KitchenHeaderView(
                    totalItemsCount: totalItemsCount,
                    urgentItemsCount: urgentItemsCount,
                    selectedCategoryFilter: selectedCategoryFilter,
                    categories: Array(Set(groupedByCategory.map { $0.categoryName })),
                    viewMode: viewMode,
                    onCategoryFilterChange: { category in
                        selectedCategoryFilter = category
                    },
                    onViewModeChange: { mode in
                        viewMode = mode
                    },
                    onRefresh: {
                        Task {
                            await orderManager.fetchActiveOrders()
                            await MainActor.run {
                                computeCategoryGrouping()
                            }
                        }
                    },
                    onPrintSummary: {
                        Task {
                            await printKitchenSummary()
                        }
                    },
                    onSignOut: {
                        Task {
                            try? await supabaseManager.signOut()
                        }
                    },
                    orderManager: orderManager
                )
                
                // Main kitchen items list - always visible
                if orderManager.isLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("kitchen_loading_data".localized)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    KitchenItemsListView(
                        groupedByCategory: groupedByCategory,
                        selectedCategoryFilter: selectedCategoryFilter,
                        orderCount: orderManager.orders.count,
                        viewMode: viewMode,
                        onItemStatusTap: { item in
                            advanceItemStatus(item)
                        },
                        onItemDetailTap: { item in
                            selectedGroupedItem = item
                            showingItemDetails = true
                        }
                    )
                }
                
                // Error Message
                if let errorMessage = orderManager.errorMessage {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Spacer()
                        Button("kitchen_retry".localized) {
                            Task {
                                await orderManager.fetchActiveOrders()
                                await MainActor.run {
                                    computeCategoryGrouping()
                                }
                            }
                        }
                        .font(.caption)
                        .foregroundColor(.blue)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                }
            }
            
            // Detail overlay - shown as dialog
            if showingItemDetails, let selectedItem = selectedGroupedItem {
                ItemDetailView(
                    item: selectedItem,
                    orderManager: orderManager,
                    printerManager: printerManager,
                    onComplete: {
                        showingItemDetails = false
                        selectedGroupedItem = nil
                    },
                    onPrintResult: { message in
                        printMessage = message
                        showingPrintAlert = true
                    },
                    onStatusAdvance: {
                        advanceItemStatus(selectedItem)
                        showingItemDetails = false
                        selectedGroupedItem = nil
                    }
                )
                .transition(.opacity.combined(with: .scale(scale: 0.9)))
                .animation(.easeInOut(duration: 0.3), value: showingItemDetails)
            }
        }
        .navigationBarHidden(true)
        .task {
            await orderManager.fetchActiveOrders()
            await MainActor.run {
                computeCategoryGrouping()
            }
            startRefreshTimer()
        }
        .onDisappear {
            stopRefreshTimer()
        }
        .alert("kitchen_print_status".localized, isPresented: $showingPrintAlert) {
            Button("ok".localized) { }
        } message: {
            Text(printMessage)
        }
    }
    
    // MARK: - Computed Properties
    
    private var totalItemsCount: Int {
        groupedByCategory.reduce(0) { total, categoryGroup in
            total + categoryGroup.items.reduce(0) { sum, item in sum + item.quantity }
        }
    }
    
    private var urgentItemsCount: Int {
        var count = 0
        for categoryGroup in groupedByCategory {
            for item in categoryGroup.items {
                let timeSinceOrder = Date().timeIntervalSince(item.orderTime)
                if timeSinceOrder > KitchenBoardConfig.urgentThresholdMinutes * 60 {
                    count += item.quantity
                }
            }
        }
        return count
    }
    
    // MARK: - Helper Methods
    
    private func dateFromString(_ dateString: String) -> Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: dateString) {
            return date
        }
        // Fallback for dates without fractional seconds
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: dateString) ?? Date() // Return current date as a last resort
    }
    
    private func computeCategoryGrouping() {
        var newGroupedItems: [GroupedItem] = []
        
        // Sort orders by creation time first (oldest first - first come first serve)
        let sortedOrders = orderManager.orders.sorted { order1, order2 in
            let date1 = dateFromString(order1.created_at)
            let date2 = dateFromString(order2.created_at)
            return date1 < date2
        }
        
        for order in sortedOrders {
            for orderItem in order.order_items ?? [] {
                guard let menuItem = orderItem.menu_item else { continue }
                
                // Only show active items (new, preparing)
                guard orderItem.status == .ordered || orderItem.status == .preparing else { continue }
                
                // Use the individual order item's creation time, not the order's creation time
                let itemTime = dateFromString(orderItem.created_at)
                
                // Safely unwrap optionals and provide default values
                let itemName = menuItem.displayName
                let quantity = orderItem.quantity ?? 0
                let priority = 0 // Default priority

                // Get category name from the fetched category data
                let categoryName = menuItem.categoryDisplayName
                
                // Get table name instead of ID
                let tableName = order.table?.name ?? String(format: "order_table_number".localized, order.table_id)
                
                // Create a UNIQUE identifier that ensures items with different sizes/toppings are NEVER grouped
                // Include order ID to prevent grouping across different orders
                let sizeKey = orderItem.menu_item_size_id ?? "no_size"
                let toppingsKey = (orderItem.topping_ids?.sorted().joined(separator: ",")) ?? "no_toppings"
                let notesKey = orderItem.notes ?? "no_notes"
                let uniqueKey = "\(order.id)_\(menuItem.id)_\(sizeKey)_\(toppingsKey)_\(notesKey)_\(orderItem.status.rawValue)"
                
                // Each unique combination should be its own item - no grouping across different sizes/toppings
                let newGroupedItem = GroupedItem(
                    itemId: uniqueKey,
                    itemName: itemName,
                    quantity: quantity,
                    tables: [tableName],
                    orderItems: [orderItem],
                    categoryName: categoryName,
                    notes: orderItem.notes,
                    orderTime: itemTime, // Use individual item time instead of order time
                    priority: priority,
                    status: orderItem.status
                )
                newGroupedItems.append(newGroupedItem)
            }
        }
        
        // Group by category and maintain the order (already sorted by order time)
        groupedByCategory = Dictionary(grouping: newGroupedItems) { $0.categoryName }
            .map { categoryName, items in
                CategoryGroup(
                    categoryName: categoryName,
                    items: items // Already sorted by order time (first come first serve)
                )
            }
            .sorted { $0.categoryName < $1.categoryName }
    }
    
    private func advanceItemStatus(_ groupedItem: GroupedItem) {
        Task {
            do {
                let newStatus: OrderItemStatus
                
                switch groupedItem.status {
                    case .draft:
                        newStatus = .ordered
                    case .ordered:
                        newStatus = .preparing
                    case .preparing:
                        newStatus = .ready
                    case .ready:
                        newStatus = .served
                    case .served:
                        newStatus = .cancelled
                    case .cancelled:
                        return // Already completed
                }
                
                // Update all order items in this group
                for orderItem in groupedItem.orderItems {
                    try await orderManager.updateOrderItemStatus(
                        orderItemId: orderItem.id,
                        newStatus: newStatus
                    )
                }
                
                // Refresh the data
                await orderManager.fetchActiveOrders()
                computeCategoryGrouping()
                
            } catch {
                print("Failed to update item status: \(error)")
            }
        }
    }
    
    private func startRefreshTimer() {
        refreshTimer = Timer.scheduledTimer(withTimeInterval: KitchenBoardConfig.autoRefreshInterval, repeats: true) { _ in 
            Task {
                await orderManager.fetchActiveOrders()
                await MainActor.run {
                    computeCategoryGrouping()
                }
            }
        }
    }
    
    private func stopRefreshTimer() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }
    
    // MARK: - Printing Methods
    
    private func printKitchenSummary() async {
        do {
            try await printerManager.printKitchenBoardSummary(groupedByCategory.flatMap { $0.items })
            
            await MainActor.run {
                printMessage = "kitchen_print_success".localized
                showingPrintAlert = true
            }
        } catch {
            await MainActor.run {
                printMessage = String(format: "kitchen_print_failure".localized, error.localizedDescription)
                showingPrintAlert = true
            }
        }
    }
    
    private func printIndividualItem(_ groupedItem: GroupedItem) async {
        do {
            try await printerManager.printKitchenItemSummary(groupedItem)
            
            await MainActor.run {
                printMessage = "kitchen_item_print_success".localized
                showingPrintAlert = true
            }
        } catch {
            await MainActor.run {
                printMessage = String(format: "kitchen_item_print_failure".localized, error.localizedDescription)
                showingPrintAlert = true
            }
        }
    }
}


#Preview {
    KitchenBoardView()
        .environmentObject(PrinterManager())
}

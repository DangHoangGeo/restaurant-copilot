import SwiftUI

/// Main kitchen board coordinator view - streamlined to use modular components
/// and overlay dialog design for better chef workflow
struct KitchenBoardView: View {
    @EnvironmentObject var printerManager: PrinterManager
    @StateObject private var orderManager = OrderManager()
    @StateObject private var supabaseManager = SupabaseManager.shared
    
    // State management
    @State private var groupedByCategory: [CategoryGroup] = []
    @State private var selectedCategoryFilter: String = "All"
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
                    orderCount: orderManager.orders.count,
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
                            computeCategoryGrouping()
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
                    }
                )
                
                // Main kitchen items list - always visible
                if orderManager.isLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Loading kitchen data...")
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
                        Button("Retry") {
                            Task {
                                await orderManager.fetchActiveOrders()
                                computeCategoryGrouping()
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
            computeCategoryGrouping()
            startRefreshTimer()
        }
        .onDisappear {
            stopRefreshTimer()
        }
        .alert("Print Status", isPresented: $showingPrintAlert) {
            Button("OK") { }
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
        var newGroupedItems: [GroupedItem] = [] // Changed variable name to avoid conflict
        
        for order in orderManager.orders {
            for orderItem in order.order_items ?? [] {
                guard let menuItem = orderItem.menu_item else { continue }
                
                // Only show active items (new, preparing)
                guard orderItem.status == .ordered || orderItem.status == .preparing else { continue }
                
                // Safely unwrap optionals and provide default values
                let itemName = menuItem.displayName
                let quantity = orderItem.quantity ?? 0
                let orderTime = dateFromString(order.created_at) ?? Date() // Use current date as fallback
                // FIXME: The OrderItem model does not have a priority field. Defaulting to 0.
                // This needs to be addressed in the data model or by providing a default mechanism.
                let priority = 0 // Default priority

                // Get category name from the fetched category data, with fallback to category_id
                let categoryName = menuItem.categoryDisplayName
                
                // Get table name instead of ID
                let tableName = order.table?.name ?? "Table \(order.table_id)"
                
                // Items with notes or different statuses should not be grouped
                // Create unique identifier including notes and status for grouping
                let groupingKey = "\(menuItem.id)_\(orderItem.notes ?? "")_\(orderItem.status.rawValue)"
                
                if let existingItemIndex = newGroupedItems.firstIndex(where: { 
                    $0.itemId == groupingKey && 
                    $0.categoryName == categoryName && 
                    $0.itemName == itemName && 
                    $0.notes == orderItem.notes &&
                    $0.status == orderItem.status 
                }) {
                    // Update existing item in the new list
                    newGroupedItems[existingItemIndex].quantity += quantity
                    newGroupedItems[existingItemIndex].tables.insert(tableName)
                    newGroupedItems[existingItemIndex].orderItems.append(orderItem)
                    // Ensure orderTime is the earliest for the group
                    if orderTime < newGroupedItems[existingItemIndex].orderTime {
                        newGroupedItems[existingItemIndex].orderTime = orderTime
                    }
                    // Potentially update priority if logic is defined

                } else {
                    // Create new group
                    let newGroupedItem = GroupedItem(
                        itemId: groupingKey,
                        itemName: itemName,
                        quantity: quantity,
                        tables: [tableName],
                        orderItems: [orderItem],
                        categoryName: categoryName,
                        notes: orderItem.notes,
                        orderTime: orderTime,
                        priority: priority,
                        status: orderItem.status
                    )
                    newGroupedItems.append(newGroupedItem)
                }
            }
        }
        
        // Sort and group the items
        groupedByCategory = newGroupedItems // Assign to the correct state variable
            .sorted(by: { $0.categoryName < $1.categoryName })
            .reduce(into: [String: [GroupedItem]]()) { result, item in
                result[item.categoryName, default: []].append(item)
            }
            .map { categoryName, items in
                CategoryGroup(
                    categoryName: categoryName,
                    items: items.sorted { item1, item2 in
                        if item1.priority != item2.priority {
                            return item1.priority > item2.priority
                        }
                        return item1.orderTime < item2.orderTime
                    }
                )
            }
    }
    
    private func advanceItemStatus(_ groupedItem: GroupedItem) {
        Task {
            do {
                let newStatus: OrderItemStatus
                
                switch groupedItem.status {
                case .ordered:
                    newStatus = .preparing
                case .preparing:
                    newStatus = .ready
                case .ready:
                    newStatus = .served
                case .served:
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
                computeCategoryGrouping()
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
                printMessage = "Kitchen summary printed successfully"
                showingPrintAlert = true
            }
        } catch {
            await MainActor.run {
                printMessage = "Failed to print kitchen summary: \(error.localizedDescription)"
                showingPrintAlert = true
            }
        }
    }
    
    private func printIndividualItem(_ groupedItem: GroupedItem) async {
        do {
            try await printerManager.printKitchenItemSummary(groupedItem)
            
            await MainActor.run {
                printMessage = "Item details printed successfully"
                showingPrintAlert = true
            }
        } catch {
            await MainActor.run {
                printMessage = "Failed to print item: \(error.localizedDescription)"
                showingPrintAlert = true
            }
        }
    }
}


#Preview {
    KitchenBoardView()
        .environmentObject(PrinterManager())
}

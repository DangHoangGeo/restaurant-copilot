import SwiftUI

struct KitchenBoardView: View {
    @EnvironmentObject var printerManager: PrinterManager
    @StateObject private var orderManager = OrderManager()
    @State private var groupedByCategory: [CategoryGroup] = []
    @State private var selectedCategoryFilter: String = "All"
    
    var body: some View {
        // Use NavigationStack for iOS 16+ or NavigationView with proper iPad handling
        if #available(iOS 16.0, *) {
            NavigationStack {
                mainContent
            }
        } else {
            NavigationView {
                // Empty sidebar for iPad to force content to main area
                if UIDevice.current.userInterfaceIdiom == .pad {
                    Text("Kitchen Board")
                        .navigationBarHidden(true)
                }
                
                mainContent
                    .navigationViewStyle(StackNavigationViewStyle()) // Force stack style
            }
            .navigationViewStyle(StackNavigationViewStyle()) // Ensure stack style on iPad
        }
    }
    
    private var mainContent: some View {
        VStack(spacing: 0) {
            // Simplified Filter Controls
            VStack(spacing: 12) {
                // Category Filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        CategoryFilterChip(
                            title: "All",
                            isSelected: selectedCategoryFilter == "All",
                            action: { selectedCategoryFilter = "All" }
                        )
                        
                        ForEach(Array(Set(groupedByCategory.map { $0.categoryName })).sorted(), id: \.self) { category in
                            CategoryFilterChip(
                                title: category,
                                isSelected: selectedCategoryFilter == category,
                                action: { selectedCategoryFilter = category }
                            )
                        }
                    }
                    .padding(.horizontal)
                }
                
                // Summary Info
                HStack {
                    Label("\(orderManager.orders.count) orders", systemImage: "list.bullet")
                    Spacer()
                    Label("\(totalItemsCount) items", systemImage: "square.stack.3d.up")
                    Spacer()
                    Button("Refresh") {
                        Task {
                            await orderManager.refreshOrders()
                            computeCategoryGrouping()
                        }
                    }
                    .buttonStyle(.bordered)
                }
                .font(.caption)
                .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemGray6))
            
            // Content
            if orderManager.isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("Loading kitchen data...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredCategoryGroups.isEmpty {
                KitchenEmptyStateView(
                    orderCount: orderManager.orders.count
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 20) {
                        ForEach(filteredCategoryGroups) { categoryGroup in
                            CategoryGroupView(
                                categoryGroup: categoryGroup,
                                onItemStatusTap: { item in
                                    advanceItemStatus(item)
                                }
                            )
                        }
                    }
                    .padding()
                }
            }
        }
        .navigationTitle("Kitchen Board")
        .navigationBarTitleDisplayMode(.large)
        .task {
            await orderManager.refreshOrders()
            computeCategoryGrouping()
        }
        .onChange(of: orderManager.orders) { _ in computeCategoryGrouping() }
    }
    
    // MARK: - Computed Properties
    
    private var filteredCategoryGroups: [CategoryGroup] {
        let filtered = selectedCategoryFilter == "All" 
            ? groupedByCategory 
            : groupedByCategory.filter { $0.categoryName == selectedCategoryFilter }
        
        return filtered.sorted { lhs, rhs in
            // Sort by priority first (urgent items at top)
            let lhsUrgent = lhs.items.contains { isUrgentItem($0) }
            let rhsUrgent = rhs.items.contains { isUrgentItem($0) }
            
            if lhsUrgent != rhsUrgent {
                return lhsUrgent
            }
            
            // Then by category order (Drinks, Appetizers, Mains, Desserts)
            return categoryPriority(lhs.categoryName) < categoryPriority(rhs.categoryName)
        }
    }
    
    private var totalItemsCount: Int {
        filteredCategoryGroups.reduce(0) { $0 + $1.items.count }
    }
    
    // MARK: - Helper Functions
    
    private func computeCategoryGrouping() {
        print("Computing category grouping with \(orderManager.orders.count) orders")
        
        var categoryGroups: [String: [GroupedItem]] = [:]
        
        for order in orderManager.orders {
            // Only show orders that are new or preparing
            guard order.status == .new || order.status == .preparing else { continue }
            
            guard let orderItems = order.order_items else { continue }
            
            for item in orderItems {
                // Only show items that are ordered or preparing (not ready or served)
                guard item.status == .ordered || item.status == .preparing else { continue }
                
                let categoryName = getCategoryName(for: item)
                let tableName = order.table?.name ?? "Table \(order.table_id)"
                let orderDate = parseOrderDate(order.created_at) ?? Date()
                
                // Create unique key that includes status to separate items by status
                let uniqueKey = "\(item.menu_item_id)_\(item.status.rawValue)"
                
                let groupedItem = GroupedItem(
                    itemId: item.menu_item_id,
                    itemName: item.menu_item?.displayName ?? "Unknown Item",
                    quantity: item.quantity,
                    tables: Set([tableName]),
                    orderItems: [item],
                    categoryName: categoryName,
                    notes: item.notes,
                    orderTime: orderDate,
                    priority: calculatePriority(for: item, orderTime: orderDate),
                    status: item.status // Add status to GroupedItem
                )
                
                if categoryGroups[categoryName] == nil {
                    categoryGroups[categoryName] = []
                }
                
                // Check if we already have this item with the same status in this category
                if let existingIndex = categoryGroups[categoryName]!.firstIndex(where: { 
                    $0.itemId == item.menu_item_id && $0.status == item.status 
                }) {
                    var existing = categoryGroups[categoryName]![existingIndex]
                    existing.quantity += item.quantity
                    existing.tables.insert(tableName)
                    existing.orderItems.append(item)
                    categoryGroups[categoryName]![existingIndex] = existing
                } else {
                    categoryGroups[categoryName]!.append(groupedItem)
                }
            }
        }
        
        self.groupedByCategory = categoryGroups.map { categoryName, items in
            CategoryGroup(
                categoryName: categoryName,
                items: items.sorted { lhs, rhs in
                    // First sort by status (ordered items first, then preparing)
                    if lhs.status != rhs.status {
                        return lhs.status == .ordered && rhs.status == .preparing
                    }
                    
                    // Then by priority
                    if lhs.priority != rhs.priority {
                        return lhs.priority > rhs.priority // Higher priority first
                    }
                    
                    // Finally by order time
                    return lhs.orderTime < rhs.orderTime // Older orders first
                }
            )
        }
        
        print("Created \(groupedByCategory.count) category groups")
    }
    
    private func parseOrderDate(_ dateString: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: dateString)
    }
    
    private func getCategoryName(for item: OrderItem) -> String {
        // Try to determine category from menu item or use a default
        if let menuItem = item.menu_item {
            // You could have category info in the menu item
            // For now, we'll categorize based on item name patterns
            let itemName = menuItem.displayName.lowercased()
            
            if itemName.contains("drink") || itemName.contains("juice") || itemName.contains("coffee") || itemName.contains("tea") || itemName.contains("soda") {
                return "🥤 Drinks"
            } else if itemName.contains("soup") || itemName.contains("salad") || itemName.contains("appetizer") || itemName.contains("starter") {
                return "🥗 Appetizers"
            } else if itemName.contains("dessert") || itemName.contains("cake") || itemName.contains("ice cream") || itemName.contains("sweet") {
                return "🍰 Desserts"
            } else {
                return "🍽️ Main Dishes"
            }
        }
        return "🍽️ Main Dishes"
    }
    
    private func calculatePriority(for item: OrderItem, orderTime: Date) -> Int {
        let now = Date()
        let timeSinceOrder = now.timeIntervalSince(orderTime)
        
        var priority = 0
        
        // Time-based priority
        if timeSinceOrder > 1800 { // 30 minutes
            priority += 3 // Very urgent
        } else if timeSinceOrder > 900 { // 15 minutes
            priority += 2 // Urgent
        } else if timeSinceOrder > 300 { // 5 minutes
            priority += 1 // Normal
        }
        
        // Status-based priority
        switch item.status {
        case .ordered:
            priority += 2 // New orders should be prioritized
        case .preparing:
            priority += 1 // Already being worked on
        case .ready:
            priority += 3 // Ready items need attention
        case .served:
            priority = 0 // Shouldn't appear, but just in case
        }
        
        return priority
    }
    
    private func isUrgentItem(_ item: GroupedItem) -> Bool {
        return item.priority >= 4 // Urgent threshold
    }
    
    private func categoryPriority(_ categoryName: String) -> Int {
        switch categoryName {
        case "🥤 Drinks": return 1
        case "🥗 Appetizers": return 2
        case "🍽️ Main Dishes": return 3
        case "🍰 Desserts": return 4
        default: return 5
        }
    }
    
    private func advanceItemStatus(_ item: GroupedItem) {
        Task { @MainActor in
            // Advance all order items in this group to the next status
            for orderItem in item.orderItems {
                let nextStatus = getNextStatus(for: orderItem.status)
                await orderManager.updateOrderItemStatus(
                    orderItemId: orderItem.id,
                    newStatus: nextStatus
                )
            }
            
            // If items are now ready, print a summary for the kitchen
            if let firstItem = item.orderItems.first, getNextStatus(for: firstItem.status) == .ready {
                await printerManager.printKitchenSummary(item)
            }
            
            // Refresh grouping
            computeCategoryGrouping()
        }
    }
    
    private func getNextStatus(for currentStatus: OrderItemStatus) -> OrderItemStatus {
        switch currentStatus {
        case .ordered:
            return .preparing
        case .preparing:
            return .ready
        case .ready:
            return .served
        case .served:
            return .served // Already at final status
        }
    }
}

// MARK: - Supporting Views

struct CategoryFilterChip: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.caption)
                .fontWeight(.medium)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.blue : Color(.systemGray5))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(16)
        }
    }
}

struct CategoryGroupView: View {
    let categoryGroup: CategoryGroup
    let onItemStatusTap: (GroupedItem) -> Void
    
    private var columns: [GridItem] {
        [
            GridItem(.adaptive(minimum: 280, maximum: 400), spacing: 16)
        ]
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Category Header
            HStack {
                Text(categoryGroup.categoryName)
                    .font(.title2)
                    .fontWeight(.bold)
                
                Spacer()
                
                Text("\(categoryGroup.items.count) items")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(.systemGray5))
                    .cornerRadius(12)
            }
            
            // Items Grid
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(categoryGroup.items) { item in
                    KitchenItemCard(
                        item: item,
                        onStatusTap: { onItemStatusTap(item) }
                    )
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
    }
}

struct KitchenItemCard: View {
    let item: GroupedItem
    let onStatusTap: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Priority and Status Indicators
            HStack {
                if item.priority >= 4 {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text("URGENT")
                            .font(.caption)
                            .fontWeight(.bold)
                    }
                    .foregroundColor(.red)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.red.opacity(0.2))
                    .cornerRadius(8)
                }
                
                Spacer()
                
                Text(timeAgoText)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Item Details
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(item.itemName)
                        .font(.headline)
                        .fontWeight(.bold)
                        .lineLimit(2)
                    
                    Spacer()
                    
                    Text("×\(item.quantity)")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(Color.orange.opacity(0.2))
                        .cornerRadius(12)
                }
                
                // Special Notes
                if let notes = item.notes, !notes.isEmpty {
                    HStack(spacing: 4) {
                        Image(systemName: "note.text")
                            .foregroundColor(.blue)
                        Text(notes)
                            .font(.subheadline)
                            .foregroundColor(.blue)
                            .fontWeight(.medium)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(8)
                }
                
                // Tables
                HStack {
                    Text("Tables:")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(Array(item.tables.sorted()), id: \.self) { table in
                                Text(table)
                                    .font(.caption)
                                    .fontWeight(.medium)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(Color.blue.opacity(0.2))
                                    .foregroundColor(.blue)
                                    .cornerRadius(12)
                            }
                        }
                    }
                }
            }
            
            // Status Button - Tap to advance to next status
            Button(action: onStatusTap) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 12, height: 12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Status: \(currentStatusText)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        Text("Tap to \(nextActionText)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding()
        .background(priorityBackgroundColor)
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(priorityBorderColor, lineWidth: item.priority >= 4 ? 2 : 1)
        )
        .scaleEffect(item.priority >= 4 ? 1.02 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: item.priority)
    }
    
    private var timeAgoText: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: item.orderTime, relativeTo: Date())
    }
    
    private var currentStatusText: String {
        // Get the most common status from all order items
        let statuses = item.orderItems.map { $0.status }
        let mostCommonStatus = statuses.reduce(into: [:]) { counts, status in
            counts[status, default: 0] += 1
        }.max(by: { $0.value < $1.value })?.key ?? .ordered
        
        return mostCommonStatus.displayName
    }
    
    private var nextActionText: String {
        let statuses = item.orderItems.map { $0.status }
        let mostCommonStatus = statuses.reduce(into: [:]) { counts, status in
            counts[status, default: 0] += 1
        }.max(by: { $0.value < $1.value })?.key ?? .ordered
        
        switch mostCommonStatus {
        case .ordered:
            return "start preparing"
        case .preparing:
            return "mark ready"
        case .ready:
            return "mark served"
        case .served:
            return "completed"
        }
    }
    
    private var statusColor: Color {
        let statuses = item.orderItems.map { $0.status }
        let mostCommonStatus = statuses.reduce(into: [:]) { counts, status in
            counts[status, default: 0] += 1
        }.max(by: { $0.value < $1.value })?.key ?? .ordered
        
        switch mostCommonStatus {
        case .ordered:
            return .blue
        case .preparing:
            return .orange
        case .ready:
            return .green
        case .served:
            return .gray
        }
    }
    
    private var priorityBackgroundColor: Color {
        // Keep urgent priority background, but also add subtle status-based background
        if item.priority >= 4 {
            return Color.red.opacity(0.1) // More visible for urgent items
        } else {
            // Subtle status-based background
            switch item.status {
            case .ordered:
                return Color.blue.opacity(0.03)
            case .preparing:
                return Color.orange.opacity(0.03)
            case .ready:
                return Color.green.opacity(0.03)
            case .served:
                return Color.gray.opacity(0.03)
            }
        }
    }
    
    private var priorityBorderColor: Color {
        // Use status-based border colors instead of priority-based
        switch item.status {
        case .ordered:
            return .blue
        case .preparing:
            return .orange
        case .ready:
            return .green
        case .served:
            return .gray
        }
    }
}

struct KitchenEmptyStateView: View {
    let orderCount: Int
    
    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)
            
            VStack(spacing: 8) {
                Text("All Caught Up!")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("No items need preparation")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            if orderCount > 0 {
                Text("There are \(orderCount) total orders")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

// MARK: - Data Models

struct CategoryGroup: Identifiable {
    let id = UUID()
    let categoryName: String
    var items: [GroupedItem]
}

struct GroupedItem: Identifiable {
    let id = UUID()
    let itemId: String
    let itemName: String
    var quantity: Int
    var tables: Set<String>
    var orderItems: [OrderItem]
    let categoryName: String
    let notes: String?
    let orderTime: Date
    let priority: Int
    let status: OrderItemStatus // Add status property
    
    init(itemId: String, itemName: String, quantity: Int, tables: Set<String>, orderItems: [OrderItem] = [], categoryName: String = "", notes: String? = nil, orderTime: Date = Date(), priority: Int = 0, status: OrderItemStatus) {
        self.itemId = itemId
        self.itemName = itemName
        self.quantity = quantity
        self.tables = tables
        self.orderItems = orderItems
        self.categoryName = categoryName
        self.notes = notes
        self.orderTime = orderTime
        self.priority = priority
        self.status = status
    }
}

#Preview {
    KitchenBoardView()
        .environmentObject(PrinterManager())
}

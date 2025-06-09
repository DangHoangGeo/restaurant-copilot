import SwiftUI

struct KitchenBoardView: View {
    @EnvironmentObject var printerManager: PrinterManager
    @StateObject private var orderManager = OrderManager()
    @State private var groupedItems: [GroupedItem] = []
    @State private var selectedTimeFilter: TimeFilter = .last10Minutes
    
    enum TimeFilter: String, CaseIterable {
        case last10Minutes = "10m"
        case last30Minutes = "30m"
        case last1Hour = "1h"
        case all = "All"
        
        var displayName: String {
            switch self {
            case .last10Minutes: return "Last 10 min"
            case .last30Minutes: return "Last 30 min"
            case .last1Hour: return "Last 1 hour"
            case .all: return "All active"
            }
        }
        
        var timeInterval: TimeInterval {
            switch self {
            case .last10Minutes: return -600
            case .last30Minutes: return -1800
            case .last1Hour: return -3600
            case .all: return -86400 // 24 hours
            }
        }
    }
    
    private var columns: [GridItem] {
        [
            GridItem(.adaptive(minimum: 200, maximum: 300), spacing: 16)
        ]
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter Controls with Debug Info
                VStack(spacing: 8) {
                    HStack {
                        Text("Show orders from:")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Picker("Time Filter", selection: $selectedTimeFilter) {
                            ForEach(TimeFilter.allCases, id: \.self) { filter in
                                Text(filter.displayName).tag(filter)
                            }
                        }
                        .pickerStyle(SegmentedPickerStyle())
                        
                        Spacer()
                        
                        Button("Refresh") {
                            Task {
                                await orderManager.refreshOrders()
                                computeGrouping()
                            }
                        }
                        .buttonStyle(.bordered)
                    }
                    
                    // Debug info
                    HStack {
                        Text("Orders: \(orderManager.orders.count)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        Text("Groups: \(groupedItems.count)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                
                // Content
                if orderManager.isLoading {
                    VStack {
                        ProgressView()
                        Text("Loading kitchen data...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if groupedItems.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "flame")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        
                        Text("No Items to Prepare")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("New and preparing items will appear here")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        // Debug: Show raw order data
                        if !orderManager.orders.isEmpty {
                            VStack(spacing: 4) {
                                Text("Debug: \(orderManager.orders.count) orders found")
                                    .font(.caption)
                                    .foregroundColor(.orange)
                                
                                ForEach(orderManager.orders.prefix(3), id: \.id) { order in
                                    Text("Order: \(order.status.rawValue), Items: \(order.order_items?.count ?? 0)")
                                        .font(.caption2)
                                        .foregroundColor(.orange)
                                }
                            }
                        }
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 16) {
                            ForEach(groupedItems) { group in
                                KitchenItemCard(
                                    group: group,
                                    onDone: { 
                                        markGroupDone(group)
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
                computeGrouping()
            }
            .onChange(of: selectedTimeFilter) { _ in
                computeGrouping()
            }
            .onChange(of: orderManager.orders) { _ in
                computeGrouping()
            }
        }
    }
    
    private func computeGrouping() {
        print("Computing grouping with \(orderManager.orders.count) orders")
        
        let cutoffDate = Date().addingTimeInterval(selectedTimeFilter.timeInterval)
        
        // Use a more flexible date formatter that handles microseconds
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSSXXXXX"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        
        var tempGrouping: [String: GroupedItem] = [:]
        
        for order in orderManager.orders {
            print("Processing order \(order.id): status=\(order.status), items=\(order.order_items?.count ?? 0)")
            
            // Parse the created_at date with better error handling
            guard let orderDate = formatter.date(from: order.created_at) else {
                print("Failed to parse date: \(order.created_at) - trying fallback parser")
                
                // Fallback to ISO8601DateFormatter
                let iso8601Formatter = ISO8601DateFormatter()
                iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                
                guard let fallbackDate = iso8601Formatter.date(from: order.created_at) else {
                    print("Failed to parse date with fallback: \(order.created_at)")
                    continue
                }
                
                // Use fallback date
                guard fallbackDate >= cutoffDate else {
                    print("Order \(order.id) is outside time filter (fallback)")
                    continue
                }
                
                // Continue processing with fallback date
                processOrderItems(order: order, tempGrouping: &tempGrouping)
                continue
            }
            
            // Check if order is within time filter
            guard orderDate >= cutoffDate else {
                print("Order \(order.id) is outside time filter")
                continue
            }
            
            processOrderItems(order: order, tempGrouping: &tempGrouping)
        }
        
        groupedItems = Array(tempGrouping.values).sorted { $0.itemName < $1.itemName }
        print("Final grouping: \(groupedItems.count) groups")
        
        for group in groupedItems {
            print("Group: \(group.itemName), qty: \(group.quantity), tables: \(group.tables)")
        }
    }
    
    private func processOrderItems(order: Order, tempGrouping: inout [String: GroupedItem]) {
        // Include orders that need kitchen attention - expand to include 'ready' status
        // since kitchen staff might need to see what's ready for pickup
        guard order.status == .new || order.status == .preparing || order.status == .ready else {
            print("Order \(order.id) status \(order.status) not relevant for kitchen")
            return
        }
        
        guard let orderItems = order.order_items else {
            print("Order \(order.id) has no items")
            return
        }
        
        for item in orderItems {
            print("Processing item \(item.id): status=\(item.status), menu_item=\(item.menu_item?.displayName ?? "nil")")
            
            // Include items that need preparation OR are ready (for kitchen visibility)
            guard item.status == .ordered || item.status == .preparing || item.status == .ready else {
                print("Item \(item.id) status \(item.status) not relevant for kitchen")
                continue
            }
            
            let key = item.menu_item_id
            let tableName = order.table?.name ?? "Table \(order.table_id)"
            
            if var existingGroup = tempGrouping[key] {
                existingGroup.quantity += item.quantity
                existingGroup.tables.insert(tableName)
                existingGroup.orderItems.append(item)
                tempGrouping[key] = existingGroup
                print("Updated existing group for \(item.menu_item?.displayName ?? "Unknown"): qty=\(existingGroup.quantity)")
            } else {
                let newGroup = GroupedItem(
                    itemId: item.menu_item_id,
                    itemName: item.menu_item?.displayName ?? "Unknown Item",
                    quantity: item.quantity,
                    tables: Set([tableName]),
                    orderItems: [item]
                )
                tempGrouping[key] = newGroup
                print("Created new group for \(newGroup.itemName): qty=\(newGroup.quantity)")
            }
        }
    }
    
    private func markGroupDone(_ group: GroupedItem) {
        Task { @MainActor in
            // Update all order items in this group to "ready"
            for item in group.orderItems {
                await orderManager.updateOrderItemStatus(
                    orderItemId: item.id,
                    newStatus: .ready
                )
            }
            
            // Print a summary for the kitchen
            await printerManager.printKitchenSummary(group)
            
            // Refresh grouping on main thread
            computeGrouping()
        }
    }
}

struct KitchenItemCard: View {
    let group: GroupedItem
    let onDone: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Item Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(group.itemName)
                        .font(.headline)
                        .fontWeight(.bold)
                        .lineLimit(2)
                    
                    Text("Qty: \(group.quantity)")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.orange)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Image(systemName: "flame.fill")
                        .foregroundColor(.orange)
                        .font(.title2)
                    
                    Text("\(group.tables.count) table\(group.tables.count == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Tables
            VStack(alignment: .leading, spacing: 4) {
                Text("Tables:")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                LazyVGrid(columns: [
                    GridItem(.adaptive(minimum: 60))
                ], spacing: 8) {
                    ForEach(Array(group.tables.sorted()), id: \.self) { table in
                        Text(table)
                            .font(.caption)
                            .fontWeight(.medium)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.2))
                            .foregroundColor(.blue)
                            .cornerRadius(8)
                    }
                }
            }
            
            // Action Button
            Button(action: onDone) {
                HStack {
                    Image(systemName: "checkmark.circle.fill")
                    Text("Mark Done")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.green)
                .foregroundColor(.white)
                .cornerRadius(10)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
    }
}

struct GroupedItem: Identifiable {
    let id = UUID()
    let itemId: String
    let itemName: String
    var quantity: Int
    var tables: Set<String>
    var orderItems: [OrderItem]
    
    init(itemId: String, itemName: String, quantity: Int, tables: Set<String>, orderItems: [OrderItem] = []) {
        self.itemId = itemId
        self.itemName = itemName
        self.quantity = quantity
        self.tables = tables
        self.orderItems = orderItems
    }
}

#Preview {
    KitchenBoardView()
        .environmentObject(PrinterManager())
}
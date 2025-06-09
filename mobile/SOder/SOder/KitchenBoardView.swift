import SwiftUI

struct KitchenBoardView: View {
    @StateObject private var orderManager = OrderManager()
    @EnvironmentObject var printerManager: PrinterManager
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
                // Filter Controls
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
                        computeGrouping()
                    }
                    .buttonStyle(.bordered)
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
                        
                        Text("Completed orders and individual items will appear here")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
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
            .onAppear {
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
        let cutoffDate = Date().addingTimeInterval(selectedTimeFilter.timeInterval)
        let formatter = ISO8601DateFormatter()
        
        var tempGrouping: [String: GroupedItem] = [:]
        
        for order in orderManager.orders {
            guard let orderDate = formatter.date(from: order.created_at),
                  orderDate >= cutoffDate,
                  order.status == .new || order.status == .preparing else {
                continue
            }
            
            guard let orderItems = order.order_items else { continue }
            
            for item in orderItems {
                guard item.status == .ordered || item.status == .preparing else { continue }
                
                let key = item.menu_item_id
                if let existingGroup = tempGrouping[key] {
                    var updatedGroup = existingGroup
                    updatedGroup.quantity += item.quantity
                    updatedGroup.tables.insert(order.table?.name ?? "Table \(order.table_id)")
                    tempGrouping[key] = updatedGroup
                } else {
                    let newGroup = GroupedItem(
                        itemId: item.menu_item_id,
                        itemName: item.menu_item?.displayName ?? "Unknown Item",
                        quantity: item.quantity,
                        tables: Set([order.table?.name ?? "Table \(order.table_id)"]),
                        orderItems: [item]
                    )
                    tempGrouping[key] = newGroup
                }
            }
        }
        
        groupedItems = Array(tempGrouping.values).sorted { $0.itemName < $1.itemName }
    }
    
    private func markGroupDone(_ group: GroupedItem) {
        Task {
            // Update all order items in this group to "ready"
            for item in group.orderItems {
                await orderManager.updateOrderItemStatus(
                    orderItemId: item.id,
                    newStatus: .ready
                )
            }
            
            // Print a summary for the kitchen
            await printerManager.printKitchenSummary(group)
            
            // Refresh grouping
            await MainActor.run {
                computeGrouping()
            }
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
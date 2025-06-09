import SwiftUI

struct OrdersView: View {
    @StateObject private var orderManager = OrderManager()
    @StateObject private var supabaseManager = SupabaseManager.shared
    @EnvironmentObject var printerManager: PrinterManager
    
    @State private var showingPrintAlert = false
    @State private var printMessage = ""
    @State private var selectedFilter: OrderFilter = .all

    enum OrderFilter: String, CaseIterable {
        case all = "all"
        case new = "new"
        case preparing = "preparing"
        case ready = "ready"
        
        var displayName: String {
            switch self {
            case .all: return "All"
            case .new: return "New"
            case .preparing: return "Preparing"
            case .ready: return "Ready"
            }
        }
        
        var color: Color {
            switch self {
            case .all: return .blue
            case .new: return .blue
            case .preparing: return .orange
            case .ready: return .green
            }
        }
    }
    
    private var filteredOrders: [Order] {
        switch selectedFilter {
        case .all:
            return orderManager.orders
        case .new:
            return orderManager.orders.filter { $0.status == .new }
        case .preparing:
            return orderManager.orders.filter { $0.status == .preparing }
        case .ready:
            return orderManager.orders.filter { $0.status == .ready }
        }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Filter Bar
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(OrderFilter.allCases, id: \.self) { filter in
                            FilterChip(
                                title: filter.displayName,
                                count: countForFilter(filter),
                                isSelected: selectedFilter == filter,
                                color: filter.color
                            ) {
                                selectedFilter = filter
                            }
                        }
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical, 8)
                .background(Color(.systemGray6))
                
                // Content
                if orderManager.isLoading {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Loading orders...")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if filteredOrders.isEmpty {
                    EmptyOrdersView(filter: selectedFilter)
                } else {
                    List {
                        ForEach(filteredOrders) { order in
                            OrderRowView(
                                order: order, 
                                orderManager: orderManager,
                                printerManager: printerManager,
                                onPrintResult: { message in
                                    printMessage = message
                                    showingPrintAlert = true
                                }
                            )
                            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                            .listRowSeparator(.hidden)
                        }
                    }
                    .listStyle(PlainListStyle())
                    .refreshable {
                        await orderManager.fetchActiveOrders()
                    }
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
                            }
                        }
                        .font(.caption)
                        .foregroundColor(.blue)
                    }
                    .padding()
                    .background(Color(.systemGray6))
                }
            }
            .navigationTitle("Orders")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("Refresh Orders") {
                            Task {
                                await orderManager.fetchActiveOrders()
                            }
                        }
                        
                        Divider()
                        
                        Button("Sign Out") {
                            Task {
                                try? await supabaseManager.signOut()
                            }
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .alert("Print Status", isPresented: $showingPrintAlert) {
                Button("OK") { }
            } message: {
                Text(printMessage)
            }
        }
        .task {
            await orderManager.fetchActiveOrders()
        }
    }
    
    private func countForFilter(_ filter: OrderFilter) -> Int {
        switch filter {
        case .all:
            return orderManager.orders.count
        case .new:
            return orderManager.orders.filter { $0.status == .new }.count
        case .preparing:
            return orderManager.orders.filter { $0.status == .preparing }.count
        case .ready:
            return orderManager.orders.filter { $0.status == .ready }.count
        }
    }
}

struct FilterChip: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .medium)
                
                if count > 0 {
                    Text("\(count)")
                        .font(.caption)
                        .fontWeight(.bold)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? Color.white.opacity(0.3) : color.opacity(0.2))
                        .cornerRadius(8)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? color : Color(.systemGray5))
            .foregroundColor(isSelected ? .white : color)
            .cornerRadius(20)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct EmptyOrdersView: View {
    let filter: OrdersView.OrderFilter
    
    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: emptyStateIcon)
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.6))
            
            Text(emptyStateTitle)
                .font(.title2)
                .fontWeight(.semibold)
                .foregroundColor(.primary)
            
            Text(emptyStateMessage)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var emptyStateIcon: String {
        switch filter {
        case .all: return "tray"
        case .new: return "plus.circle"
        case .preparing: return "clock"
        case .ready: return "checkmark.circle"
        }
    }
    
    private var emptyStateTitle: String {
        switch filter {
        case .all: return "No Active Orders"
        case .new: return "No New Orders"
        case .preparing: return "Nothing Preparing"
        case .ready: return "Nothing Ready"
        }
    }
    
    private var emptyStateMessage: String {
        switch filter {
        case .all: return "New orders will appear here automatically"
        case .new: return "New orders from customers will show up here"
        case .preparing: return "Orders being prepared will appear here"
        case .ready: return "Completed orders ready for serving will appear here"
        }
    }
}

// Enhanced OrderRowView with better design
struct OrderRowView: View {
    let order: Order
    let orderManager: OrderManager
    let printerManager: PrinterManager
    let onPrintResult: (String) -> Void
    
    @State private var isExpanded = false
    @State private var isPrinting = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Main Order Card
            VStack(alignment: .leading, spacing: 12) {
                // Order Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(order.table?.name ?? "Table \(order.table_id)")
                                .font(.headline)
                                .fontWeight(.bold)
                            
                            Spacer()
                            
                            EnhancedStatusBadge(status: order.status)
                        }
                        
                        HStack(spacing: 16) {
                            Label("\(order.guest_count)", systemImage: "person.2")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                            
                            Label(formatTime(order.created_at), systemImage: "clock")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Button(action: {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            isExpanded.toggle()
                        }
                    }) {
                        Image(systemName: isExpanded ? "chevron.up.circle.fill" : "chevron.down.circle")
                            .font(.title2)
                            .foregroundColor(.blue)
                    }
                }
                
                // Quick Actions (always visible)
                HStack(spacing: 12) {
                    StatusActionButton(
                        currentStatus: order.status,
                        orderManager: orderManager,
                        orderId: order.id
                    )
                    
                    PrintButton(
                        isPrinting: $isPrinting,
                        printerManager: printerManager,
                        order: order,
                        onResult: onPrintResult
                    )
                    
                    Spacer()
                    
                    if let total = order.total_amount {
                        Text("¥\(String(format: "%.0f", total))")
                            .font(.headline)
                            .fontWeight(.bold)
                            .foregroundColor(.primary)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.08), radius: 3, x: 0, y: 2)
            
            // Expanded Details
            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    Divider()
                        .padding(.horizontal)
                    
                    if let orderItems = order.order_items, !orderItems.isEmpty {
                        LazyVStack(spacing: 8) {
                            ForEach(orderItems) { item in
                                EnhancedOrderItemView(orderItem: item, orderManager: orderManager)
                            }
                        }
                        .padding(.horizontal)
                    } else {
                        Text("No items in this order")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .padding()
                    }
                }
                .background(Color(.systemGray6).opacity(0.5))
                .cornerRadius(12)
                .padding(.top, 4)
            }
        }
        .padding(.vertical, 4)
    }
    
    private func formatTime(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return "Unknown" }
        
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

struct EnhancedStatusBadge: View {
    let status: OrderStatus
    
    var body: some View {
        Text(status.displayName)
            .font(.caption)
            .fontWeight(.semibold)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(badgeColor.opacity(0.2))
            .foregroundColor(badgeColor)
            .cornerRadius(12)
    }
    
    private var badgeColor: Color {
        switch status {
        case .new:
            return .blue
        case .preparing:
            return .orange
        case .ready:
            return .green
        case .completed:
            return .gray
        }
    }
}

struct StatusActionButton: View {
    let currentStatus: OrderStatus
    let orderManager: OrderManager
    let orderId: String
    
    var body: some View {
        Menu {
            ForEach(OrderStatus.allCases, id: \.self) { status in
                if status != currentStatus {
                    Button(status.displayName) {
                        Task {
                            await orderManager.updateOrderStatus(
                                orderId: orderId,
                                newStatus: status
                            )
                        }
                    }
                }
            }
        } label: {
            Label("Change Status", systemImage: "arrow.up.arrow.down")
                .font(.subheadline)
                .foregroundColor(.blue)
                .padding(8)
                .background(Color(.systemGray5))
                .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct PrintButton: View {
    @Binding var isPrinting: Bool
    let printerManager: PrinterManager
    let order: Order
    let onResult: (String) -> Void
    
    var body: some View {
        Button(action: {
            Task {
                await printOrderReceipt()
            }
        }) {
            HStack {
                if isPrinting {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    Image(systemName: "printer")
                }
                Text(isPrinting ? "Printing..." : "Print")
            }
            .padding(8)
            .background(Color.green.opacity(0.2))
            .foregroundColor(.green)
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle())
        .disabled(isPrinting || !printerManager.isConnected)
    }
    
    private func printOrderReceipt() async {
        isPrinting = true
        
        let success = await printerManager.printOrderReceipt(order)
        
        await MainActor.run {
            isPrinting = false
            onResult(success 
                ? "Receipt printed successfully!" 
                : "Failed to print receipt. Check printer connection.")
        }
    }
}

struct EnhancedOrderItemView: View {
    let orderItem: OrderItem
    let orderManager: OrderManager
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("\(orderItem.quantity)x \(orderItem.menu_item?.displayName ?? "Unknown Item")")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                if let notes = orderItem.notes, !notes.isEmpty {
                    Text("Note: \(notes)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .italic()
                }
                
                if let price = orderItem.menu_item?.price {
                    Text("¥\(String(format: "%.0f", price)) each")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing) {
                StatusBadge(status: orderItem.status.displayName, color: orderItem.status.color)
                
                Menu("Update") {
                    ForEach(OrderItemStatus.allCases, id: \.self) { status in
                        if status != orderItem.status {
                            Button(status.displayName) {
                                Task {
                                    await orderManager.updateOrderItemStatus(
                                        orderItemId: orderItem.id,
                                        newStatus: status
                                    )
                                }
                            }
                        }
                    }
                }
                .buttonStyle(.plain)
                .font(.caption)
                .foregroundColor(.blue)
            }
        }
        .padding(.vertical, 4)
    }
}

struct StatusBadge: View {
    let status: String
    let color: String
    
    var body: some View {
        Text(status)
            .font(.caption)
            .fontWeight(.semibold)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(badgeColor.opacity(0.2))
            .foregroundColor(badgeColor)
            .cornerRadius(12)
    }
    
    private var badgeColor: Color {
        switch color {
        case "blue": return .blue
        case "orange": return .orange
        case "green": return .green
        case "gray": return .gray
        default: return .blue
        }
    }
}

#Preview {
    OrdersView()
}

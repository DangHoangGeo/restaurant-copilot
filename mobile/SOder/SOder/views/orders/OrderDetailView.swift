import SwiftUI

struct OrderDetailView: View {
    let orderId: String
    let orderManager: OrderManager
    let printerManager: PrinterManager
    let onCheckout: () -> Void
    let onPrintResult: (String) -> Void
    
    @State private var isUpdatingStatus = false
    @State private var selectedItems: Set<String> = []
    @State private var showingItemActions = false
    @State private var selectedItem: OrderItem? = nil
    
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    
    // Get current order from OrderManager to ensure we have the latest state
    private var currentOrder: Order? {
        return orderManager.orders.first(where: { $0.id == orderId }) ??
               orderManager.allOrders.first(where: { $0.id == orderId })
    }
    
    // Sort items by time added (ascending) and status priority
    private var sortedItems: [OrderItem] {
        guard let items = currentOrder?.order_items else { return [] }
        
        return items.sorted { item1, item2 in
            // First sort by status priority
            let status1Priority = statusPriority(item1.status.rawValue)
            let status2Priority = statusPriority(item2.status.rawValue)
            
            if status1Priority != status2Priority {
                return status1Priority < status2Priority
            }
            
            // Then by creation time (ascending)
            return item1.created_at < item2.created_at
        }
    }
    
    private func statusPriority(_ status: String) -> Int {
        switch status {
        case "ordered": return 1
        case "preparing": return 2
        case "ready": return 3
        case "served": return 4
        default: return 5
        }
    }
    
    var body: some View {
        Group {
            if let order = currentOrder {
                ScrollView {
                    VStack(spacing: 24) {
                        // Order Header (includes actions now)
                        orderHeader(for: order)
                        
                        // Order Items
                        orderItemsSection(for: order)
                    }
                    .padding()
                }
                .navigationTitle(order.table?.name ?? "Table \(order.table_id)")
                .navigationBarTitleDisplayMode(horizontalSizeClass == .regular ? .inline : .large)
                .sheet(item: $selectedItem) { item in
                    OrderItemDetailView(
                        item: item,
                        orderManager: orderManager,
                        printerManager: printerManager,
                        onComplete: {
                            selectedItem = nil
                        },
                        onPrintResult: onPrintResult
                    )
                }
                .toolbar {
                    if horizontalSizeClass != .regular && order.status == .completed {
                        ToolbarItem(placement: .navigationBarTrailing) {
                            Button("orders_print_receipt".localized) {
                                Task {
                                    await printReceipt(for: order)
                                }
                            }
                        }
                    }
                }
            } else {
                VStack {
                    Text("orders_not_found".localized)
                        .font(.title2)
                        .foregroundColor(.secondary)
                    
                    Button("orders_refresh".localized) {
                        Task {
                            await orderManager.fetchActiveOrders()
                        }
                    }
                    .buttonStyle(.bordered)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
    }
    
    private func orderHeader(for order: Order) -> some View {
        VStack(spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(order.table?.name ?? "Table \(order.table_id)")
                            .font(.title2)
                            .fontWeight(.bold)
                        
                        Spacer()
                        
                        EnhancedStatusBadge(status: order.status)
                    }
                    
                    HStack(spacing: 20) {
                        Label("\(order.guest_count)", systemImage: "person.2")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Label(formatTime(order.created_at), systemImage: "clock")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        if !order.session_id.isEmpty {
                            Label("ID: \(order.id.prefix(6).uppercased())", systemImage: "number")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            
            // Order Actions Section
            orderActionsSection(for: order)
            
            if let total = order.total_amount {
                HStack {
                    Text("orders_total_amount".localized)
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    Spacer()
                    
                    Text("¥\(String(format: "%.0f", total))")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    private func orderActionsSection(for order: Order) -> some View {
        VStack(spacing: 12) {
            if order.status == .completed {
                // Show only print receipt for completed orders
                Button(action: {
                    Task { await printReceipt(for: order) }
                }) {
                    HStack {
                        Image(systemName: "printer")
                        Text("orders_print_receipt".localized)
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: 120)
                    .frame(height: 44)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
            } else {
                // Show checkout for non-completed orders
                HStack(spacing: 16){
                    // Status progression buttons
                    if order.status == .new {
                        Button(action: {
                            Task { await updateOrderStatus(.serving) }
                        }) {
                            HStack {
                                Image(systemName: "fork.knife")
                                Text("Mark as Serving")
                                    .fontWeight(.medium)
                            }
                            .frame(maxWidth: 256)
                            .frame(height: 44)
                            .background(Color.orange)
                            .foregroundColor(.white)
                            .cornerRadius(8)
                        }
                        .disabled(isUpdatingStatus)
                    }
                    
                    Button(action: onCheckout) {
                        HStack {
                            Image(systemName: "creditcard")
                            Text("Checkout")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: 256)
                        .frame(height: 44)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                }
            }
        }
    }
    
    private func orderItemsSection(for order: Order) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Order Items (\(sortedItems.count))")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                if sortedItems.contains(where: { $0.status.rawValue == "ordered" }) {
                    HStack {
                        Image(systemName: "circle.fill")
                            .font(.caption)
                            .foregroundColor(.red)
                        Text("New items")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            VStack(spacing: 0) {
                ForEach(Array(sortedItems.enumerated()), id: \.element.id) { index, item in
                    EnhancedOrderItemView(
                        item: item,
                        orderManager: orderManager,
                        printerManager: printerManager,
                        onPrintResult: onPrintResult,
                        showDetailedActions: horizontalSizeClass == .regular
                    )
                    .contentShape(Rectangle())
                    .onTapGesture {
                        selectedItem = item
                    }
                    
                    // Add separator between items (except for the last item)
                    if index < sortedItems.count - 1 {
                        Divider()
                            .padding(.leading, 16)
                            .padding(.trailing, 16)
                            .padding(.vertical, 8)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    
    @MainActor
    private func updateOrderStatus(_ newStatus: OrderStatus) async {
        isUpdatingStatus = true
        
        do {
            try await orderManager.updateOrderStatus(orderId: orderId, newStatus: newStatus)
            onPrintResult("Order status updated to \(newStatus.displayName)")
        } catch {
            onPrintResult("Failed to update order status: \(error.localizedDescription)")
        }
        
        isUpdatingStatus = false
    }
    
    @MainActor
    private func printReceipt(for order: Order) async {
        let receiptData = CheckoutReceiptData(
            order: order,
            subtotal: order.total_amount ?? 0,
            discountAmount: 0,
            discountCode: nil,
            taxAmount: (order.total_amount ?? 0) * 0.10,
            totalAmount: (order.total_amount ?? 0) * 1.10,
            timestamp: Date()
        )
        
        do {
            try await printerManager.printCheckoutReceipt(receiptData)
            onPrintResult("Receipt printed successfully")
        } catch {
            onPrintResult("Failed to print receipt: \(error.localizedDescription)")
        }
    }
    
    private func formatTime(_ dateString: String) -> String {
        // Try ISO8601 formatter first (with fractional seconds)
        let iso8601Formatter = ISO8601DateFormatter()
        iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        var date: Date?
        
        if let parsedDate = iso8601Formatter.date(from: dateString) {
            date = parsedDate
        } else {
            // Fallback to standard ISO8601 without fractional seconds
            iso8601Formatter.formatOptions = [.withInternetDateTime]
            date = iso8601Formatter.date(from: dateString)
        }
        
        // If ISO8601 fails, try standard date formatter as fallback
        if date == nil {
            let fallbackFormatter = DateFormatter()
            fallbackFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
            date = fallbackFormatter.date(from: dateString)
        }
        
        guard let finalDate = date else { 
            print("Failed to parse date string: \(dateString)")
            return "Unknown" 
        }
        
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: finalDate)
    }
}

import SwiftUI

struct OrderDetailView: View {
    let order: Order
    let orderManager: OrderManager
    let printerManager: PrinterManager
    let onCheckout: () -> Void
    let onPrintResult: (String) -> Void
    
    @State private var isUpdatingStatus = false
    @State private var selectedItems: Set<String> = []
    @State private var showingItemActions = false
    
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    
    // Sort items by time added (ascending) and status priority
    private var sortedItems: [OrderItem] {
        guard let items = order.order_items else { return [] }
        
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
        case "new": return 1
        case "preparing": return 2
        case "ready": return 3
        case "served": return 4
        default: return 5
        }
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Order Header
                orderHeader
                
                // Order Items
                orderItemsSection
                
                // Order Actions
                if horizontalSizeClass == .regular {
                    // iPad layout - inline actions
                    ipadActionsSection
                } else {
                    // iPhone layout - prominent checkout button
                    iphoneActionsSection
                }
            }
            .padding()
        }
        .navigationTitle(order.table?.name ?? "Table \(order.table_id)")
        .navigationBarTitleDisplayMode(horizontalSizeClass == .regular ? .inline : .large)
        .toolbar {
            if horizontalSizeClass != .regular {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button("Print Kitchen Slip") {
                            Task {
                                await printKitchenSlip()
                            }
                        }
                        
                        Button("Print Receipt") {
                            Task {
                                await printReceipt()
                            }
                        }
                        
                        if order.status != .completed {
                            Divider()
                            
                            Button("Mark as Completed") {
                                Task {
                                    await updateOrderStatus(.completed)
                                }
                            }
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
    }
    
    private var orderHeader: some View {
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
                            Label("ID: \(order.session_id.prefix(6).uppercased())", systemImage: "number")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            
            if let total = order.total_amount {
                HStack {
                    Text("Total Amount")
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
    
    private var orderItemsSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("Order Items (\(sortedItems.count))")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                if sortedItems.contains(where: { $0.status.rawValue == "new" }) {
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
            
            LazyVStack(spacing: 12) {
                ForEach(sortedItems, id: \.id) { item in
                    EnhancedOrderItemView(
                        item: item,
                        orderManager: orderManager,
                        printerManager: printerManager,
                        onPrintResult: onPrintResult,
                        showDetailedActions: horizontalSizeClass == .regular
                    )
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    private var ipadActionsSection: some View {
        VStack(spacing: 16) {
            // Checkout Section
            if order.status != .completed {
                VStack(spacing: 12) {
                    HStack {
                        Image(systemName: "creditcard")
                            .font(.title2)
                            .foregroundColor(.blue)
                        
                        VStack(alignment: .leading) {
                            Text("Ready for Checkout")
                                .font(.headline)
                                .fontWeight(.semibold)
                            Text("Process payment and complete order")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        Button("Checkout") {
                            onCheckout()
                        }
                        .buttonStyle(.borderedProminent)
                        .buttonBorderShape(.roundedRectangle(radius: 8))
                    }
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
            }
            
            // Quick Actions
            HStack(spacing: 12) {
                Button(action: {
                    Task { await printKitchenSlip() }
                }) {
                    Label("Kitchen Slip", systemImage: "doc.text")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .buttonBorderShape(.roundedRectangle(radius: 8))
                
                Button(action: {
                    Task { await printReceipt() }
                }) {
                    Label("Receipt", systemImage: "printer")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .buttonBorderShape(.roundedRectangle(radius: 8))
                
                if order.status != .completed {
                    Button(action: {
                        Task { await updateOrderStatus(.completed) }
                    }) {
                        Label("Complete", systemImage: "checkmark.circle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .buttonBorderShape(.roundedRectangle(radius: 8))
                    .tint(.green)
                    .disabled(isUpdatingStatus)
                }
            }
        }
    }
    
    private var iphoneActionsSection: some View {
        VStack(spacing: 16) {
            if order.status != .completed {
                Button(action: onCheckout) {
                    HStack {
                        Image(systemName: "creditcard")
                        Text("Checkout")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
            }
            
            // Status progression buttons for iPhone
            if order.status != .completed {
                statusProgressionButtons
            }
        }
    }
    
    private var statusProgressionButtons: some View {
        VStack(spacing: 12) {
            switch order.status {
            case .new:
                Button(action: {
                    Task { await updateOrderStatus(.preparing) }
                }) {
                    HStack {
                        Image(systemName: "flame")
                        Text("Mark as Preparing")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .disabled(isUpdatingStatus)
                
            case .preparing:
                Button(action: {
                    Task { await updateOrderStatus(.ready) }
                }) {
                    HStack {
                        Image(systemName: "checkmark.circle")
                        Text("Mark as Ready")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .disabled(isUpdatingStatus)
                
            case .ready:
                Button(action: {
                    Task {
                        await updateOrderStatus(.completed)
                        await printReceipt()
                    }
                }) {
                    HStack {
                        Image(systemName: "printer")
                        Text("Complete & Print")
                            .fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color.blue)
                    .foregroundColor(.white)
                    .cornerRadius(8)
                }
                .disabled(isUpdatingStatus)
                
            default:
                EmptyView()
            }
        }
    }
    
    @MainActor
    private func updateOrderStatus(_ newStatus: OrderStatus) async {
        isUpdatingStatus = true
        
        do {
            try await orderManager.updateOrderStatus(orderId: order.id, newStatus: newStatus)
            onPrintResult("Order status updated to \(newStatus.displayName)")
        } catch {
            onPrintResult("Failed to update order status: \(error.localizedDescription)")
        }
        
        isUpdatingStatus = false
    }
    
    @MainActor
    private func printKitchenSlip() async {
        do {
            try await printerManager.printKitchenSlip(for: order)
            onPrintResult("Kitchen slip printed successfully")
        } catch {
            onPrintResult("Failed to print kitchen slip: \(error.localizedDescription)")
        }
    }
    
    @MainActor
    private func printReceipt() async {
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
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return "Unknown" }
        
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

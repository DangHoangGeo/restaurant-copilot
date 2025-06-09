import SwiftUI

struct OrdersView: View {
    @StateObject private var orderManager = OrderManager()
    @StateObject private var supabaseManager = SupabaseManager.shared
    @EnvironmentObject var printerManager: PrinterManager
    
    @State private var showingPrintAlert = false
    @State private var printMessage = ""

    var body: some View {
        NavigationView {
            VStack {
                if orderManager.isLoading {
                    VStack {
                        ProgressView()
                        Text("Loading orders...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if orderManager.orders.isEmpty {
                    VStack(spacing: 20) {
                        Image(systemName: "tray")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)
                        
                        Text("No Active Orders")
                            .font(.title2)
                            .fontWeight(.semibold)
                        
                        Text("New orders will appear here automatically")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(orderManager.orders) { order in
                            OrderRowView(
                                order: order, 
                                orderManager: orderManager,
                                printerManager: printerManager,
                                onPrintResult: { message in
                                    printMessage = message
                                    showingPrintAlert = true
                                }
                            )
                            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        }
                    }
                    .listStyle(PlainListStyle())
                    .refreshable {
                        await orderManager.fetchActiveOrders()
                    }
                }
                
                if let errorMessage = orderManager.errorMessage {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                        .padding()
                }

            }
            .navigationTitle("Active Orders")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Refresh") {
                        Task {
                            await orderManager.fetchActiveOrders()
                        }
                    }
                }
                
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Sign Out") {
                        Task {
                            try? await supabaseManager.signOut()
                        }
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
}

struct OrderRowView: View {
    let order: Order
    let orderManager: OrderManager
    let printerManager: PrinterManager
    let onPrintResult: (String) -> Void
    
    @State private var isExpanded = false
    @State private var isPrinting = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Order Header
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Table \(order.table?.name ?? "Unknown")")
                            .font(.headline)
                            .fontWeight(.semibold)
                        
                        Spacer()
                        
                        StatusBadge(status: order.status.displayName, color: order.status.color)
                    }
                    
                    HStack {
                        Text("\(order.guest_count) guest\(order.guest_count == 1 ? "" : "s")")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        Text(formatTime(order.created_at))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Button(action: {
                    withAnimation(.easeInOut(duration: 0.3)) {
                        isExpanded.toggle()
                    }
                }) {
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundColor(.blue)
                }
            }
            
            // Order Items (when expanded)
            if isExpanded {
                VStack(alignment: .leading, spacing: 8) {
                    Divider()
                    
                    if let orderItems = order.order_items, !orderItems.isEmpty {
                        ForEach(orderItems) { item in
                            OrderItemRowView(orderItem: item, orderManager: orderManager)
                        }
                    } else {
                        Text("No items")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    // Order Actions
                    HStack(spacing: 12) {
                        if order.status != .completed {
                            Menu("Change Status") {
                                ForEach(OrderStatus.allCases, id: \.self) { status in
                                    if status != order.status {
                                        Button(status.displayName) {
                                            Task {
                                                await orderManager.updateOrderStatus(
                                                    orderId: order.id,
                                                    newStatus: status
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                            .buttonStyle(.bordered)
                            .foregroundColor(.blue)
                        }
                        
                        // Print Button
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
                        }
                        .buttonStyle(.bordered)
                        .foregroundColor(.green)
                        .disabled(isPrinting || !printerManager.isConnected)
                        
                        Spacer()
                        
                        if let total = order.total_amount {
                            Text("Total: ¥\(String(format: "%.0f", total))")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                        }
                    }
                    
                    // Printer status hint
                    if !printerManager.isConnected {
                        HStack {
                            Image(systemName: "exclamationmark.triangle")
                                .foregroundColor(.orange)
                            Text("Connect a printer to enable printing")
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.1), radius: 2, x: 0, y: 1)
    }
    
    private func printOrderReceipt() async {
        isPrinting = true
        
        let success = await printerManager.printOrderReceipt(order)
        
        await MainActor.run {
            isPrinting = false
            onPrintResult(success 
                ? "Receipt printed successfully!" 
                : "Failed to print receipt. Check printer connection.")
        }
    }
    
    private func formatTime(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return dateString }
        
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

struct OrderItemRowView: View {
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

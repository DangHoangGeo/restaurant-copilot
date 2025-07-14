import SwiftUI

// MARK: - Status Badge Components

struct StatusBadge: View {
    let status: String
    
    private var display: (text: String, color: Color, icon: String) {
        switch status.lowercased() {
        // Order Statuses
        case "draft":
            return ("Draft", .gray, "doc.text")
        case "new":
            return ("New", .blue, "sparkles")
        case "serving":
            return ("Serving", .orange, "fork.knife")
        case "completed":
            return ("Completed", .gray, "checkmark.seal.fill")
        case "canceled":
            return ("Canceled", .red, "xmark.circle.fill")
        // Booking Statuses
        case "pending":
            return ("Pending", .gray, "hourglass")
        case "confirmed":
            return ("Confirmed", .green, "checkmark.seal.fill")
        default:
            return (status.capitalized, .gray, "questionmark.circle")
        }
    }
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: display.icon)
            Text(display.text)
                .fontWeight(.medium)
        }
        .font(.caption)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(display.color.opacity(0.15))
        .foregroundColor(display.color)
        .cornerRadius(20)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Status: \(display.text)")
    }
}

struct EnhancedStatusBadge: View {
    let status: OrderStatus
    
    private var display: (text: String, color: Color, icon: String) {
        switch status {
        case .draft:
            return ("Draft", .gray, "doc.text")
        case .new:
            return ("New", .blue, "sparkles")
        case .serving:
            return ("Serving", .orange, "fork.knife")
        case .completed:
            return ("Completed", .gray, "checkmark.seal.fill")
        case .canceled:
            return ("Canceled", .red, "xmark.circle.fill")
        }
    }
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: display.icon)
                .font(.caption2)
            Text(display.text)
                .fontWeight(.medium)
        }
        .font(.caption)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(display.color.opacity(0.15))
        .foregroundColor(display.color)
        .cornerRadius(20)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Status: \(display.text)")
    }
}

struct OrderItemStatusBadge: View {
    let status: OrderItemStatus
    
    private var display: (text: String, color: Color, icon: String) {
        switch status {
        case .draft:
            return ("Draft", .gray, "doc.text")
        case .ordered:
            return ("Ordered", .blue, "doc.text")
        case .preparing:
            return ("Preparing", .orange, "flame.fill")
        case .ready:
            return ("Ready", .green, "checkmark.circle.fill")
        case .served:
            return ("Served", .gray, "checkmark.seal.fill")
        case .cancelled:
            return ("Cancelled", .red, "xmark.circle.fill")
        }
    }
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: display.icon)
                .font(.caption2)
            Text(display.text)
                .fontWeight(.medium)
        }
        .font(.caption)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(display.color.opacity(0.15))
        .foregroundColor(display.color)
        .cornerRadius(20)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Status: \(display.text)")
    }
}

// MARK: - Filter Chip Component

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
                    .fontWeight(.medium)
                
                if count > 0 {
                    Text("\(count)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(isSelected ? .white : color)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(isSelected ? .white.opacity(0.3) : color.opacity(0.2))
                        .cornerRadius(8)
                }
            }
            .font(.subheadline)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? color : color.opacity(0.1))
            .foregroundColor(isSelected ? .white : color)
            .cornerRadius(20)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - Empty Orders View

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
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var emptyStateIcon: String {
        switch filter {
        case .active, .new:
            return "tray"
        case .serving:
            return "fork.knife"
        case .completed:
            return "checkmark.seal"
        case .canceled:
            return "xmark.circle"
        }
    }
    
    private var emptyStateTitle: String {
        switch filter {
        case .active:
            return "No Active Orders"
        case .new:
            return "No New Orders"
        case .serving:
            return "Nothing Being Served"
        case .completed:
            return "No Completed Orders"
        case .canceled:
            return "No Canceled Orders"
        }
    }
    
    private var emptyStateMessage: String {
        switch filter {
        case .active:
            return "When new orders come in, they'll appear here."
        case .new:
            return "All orders are being processed."
        case .serving:
            return "No orders are currently being served."
        case .completed:
            return "No completed orders to show."
        case .canceled:
            return "No canceled orders to show."
        }
    }
}

// MARK: - Order Row View

struct OrderRowView: View {
    let order: Order
    let isNew: Bool
    let orderManager: OrderManager
    let printerManager: PrinterManager
    let onPrintResult: (String) -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(order.table?.name ?? "Table \(order.table_id)")
                            .font(.headline)
                            .fontWeight(.bold)
                        
                        if isNew {
                            Text("NEW")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.red)
                                .cornerRadius(4)
                        }
                        
                        Spacer()
                    }
                    
                    HStack(spacing: 16) {
                        Label("\(order.guest_count)", systemImage: "person.2")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Label(formatTime(order.created_at), systemImage: "clock")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                VStack(alignment: .trailing, spacing: 8) {
                    EnhancedStatusBadge(status: order.status)
                    
                    if let total = order.total_price {
                        Text("¥\(String(format: "%.0f", total))")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                    }
                }
            }
            
            // Order items preview
            if let items = order.order_items?.prefix(2) {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(items), id: \.id) { item in
                        HStack {
                            Text("\(item.quantity)×")
                                .font(.caption)
                                .fontWeight(.medium)
                                .foregroundColor(.secondary)
                            
                            Text(item.menu_item?.displayName ?? "Unknown")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(1)
                            
                            Spacer()
                            
                            OrderItemStatusBadge(status: item.status)
                        }
                    }
                    
                    if let totalItems = order.order_items?.count, totalItems > 2 {
                        Text("and \(totalItems - 2) more items...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .italic()
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
    
    private func formatTime(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return "Unknown" }
        
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

// MARK: - Enhanced Order Item View

struct EnhancedOrderItemView: View {
    let item: OrderItem
    let orderManager: OrderManager
    let printerManager: PrinterManager
    let onPrintResult: (String) -> Void
    let showDetailedActions: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.menu_item?.displayName ?? "Unknown Item")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    if let notes = item.notes, !notes.isEmpty {
                        Text(notes)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .italic()
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text("×\(item.quantity)")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    OrderItemStatusBadge(status: item.status)
                }
            }
            
            if showDetailedActions && item.status.rawValue != "served" && item.status.rawValue != "cancelled" {
                HStack {
                    Spacer()
                    
                    Button("Update Status") {
                        Task {
                            await updateItemStatus()
                        }
                    }
                    .font(.caption)
                    .buttonStyle(.bordered)
                    .buttonBorderShape(.roundedRectangle(radius: 6))
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    @MainActor
    private func updateItemStatus() async {
        let nextStatus = getNextStatus()
        await orderManager.updateOrderItemStatus(orderItemId: item.id, newStatus: nextStatus)
        onPrintResult("Updated \(item.menu_item?.displayName ?? "item") to \(nextStatus.displayName)")
    }
    
    private func getNextStatus() -> OrderItemStatus {
        switch OrderItemStatus(rawValue: item.status.rawValue) ?? .ordered {
        case .draft:
            return .ordered
        case .ordered:
            return .preparing
        case .preparing:
            return .ready
        case .ready:
            return .served
        case .served:
            return .served  // No further progression
        case .cancelled:
            return .cancelled  // Cancelled items don't progress
        }
    }
}

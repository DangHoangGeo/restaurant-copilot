import SwiftUI

// MARK: - Status Badge Components

struct StatusBadge: View {
    let status: String
    
    private var display: (text: String, color: Color, icon: String) {
        switch status.lowercased() {
        // Order Statuses
        case "draft":
            return ("Draft", .appTextSecondary, "doc.text")
        case "new":
            return ("New", .appInfo, "sparkles")
        case "serving":
            // Consistently green for Serving
            return ("Serving", .appSuccess, "fork.knife")
        case "completed":
            return ("Completed", .appTextSecondary, "checkmark.seal")
        case "canceled":
            return ("Canceled", .appError, "xmark.circle")
        // Booking Statuses
        case "pending":
            return ("Pending", .appTextSecondary, "hourglass")
        case "confirmed":
            return ("Confirmed", .appSuccess, "checkmark.seal")
        default:
            return (status.capitalized, .appTextSecondary, "questionmark.circle")
        }
    }
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: display.icon)
            Text(display.text)
                .fontWeight(.medium)
        }
        .font(.captionBold)
        .padding(.horizontal, Spacing.sm)
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
    
    private var display: (text: String, color: Color, backgroundColor: Color, icon: String) {
        switch status {
        case .draft:
            return (status.displayName, .appTextSecondary, .appSurfaceSecondary, "doc.text")
        case .new:
            return (status.displayName, .appInfo, .appInfoLight, "sparkles")
        case .serving:
            // Serving switched to green for better scannability
            return (status.displayName, .appSuccess, .appSuccessLight, "fork.knife")
        case .completed:
            return (status.displayName, .appSuccess, .appSuccessLight, "checkmark.seal")
        case .canceled:
            return (status.displayName, .appError, .appErrorLight, "xmark.circle")
        }
    }
    
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: display.icon)
                .font(.caption2)
                .fontWeight(.semibold)
            Text(display.text)
                .fontWeight(.semibold)
        }
        .font(.caption)
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, 6)
        .background(display.backgroundColor)
        .foregroundColor(display.color)
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(display.color.opacity(0.2), lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Status: \(display.text)")
    }
}

struct OrderItemStatusBadge: View {
    let status: OrderItemStatus
    
    private var display: (text: String, color: Color, backgroundColor: Color, icon: String) {
        switch status {
        case .draft:
            return (status.displayName, .appTextSecondary, .appSurfaceSecondary, "doc.text")
        case .new:
            return (status.displayName, .appInfo, .appInfoLight, "sparkles")
        case .preparing:
            return (status.displayName, .appWarning, .appWarningLight, "flame")
        case .ready:
            return (status.displayName, .appSuccess, .appSuccessLight, "checkmark.circle")
        case .served:
            return (status.displayName, .appTextSecondary, .appSurfaceSecondary, "checkmark.seal")
        case .canceled:
            return (status.displayName, .appError, .appErrorLight, "xmark.circle")
        }
    }
    
    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: display.icon)
                .font(.caption2)
                .fontWeight(.medium)
            Text(display.text)
                .fontWeight(.medium)
        }
        .font(.caption)
        .padding(.horizontal, Spacing.xs)
        .padding(.vertical, 4)
        .background(display.backgroundColor)
        .foregroundColor(display.color)
        .cornerRadius(8)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(display.color.opacity(0.2), lineWidth: 0.5)
        )
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
            HStack(spacing: Spacing.xs) {
                Text(title)
                    .fontWeight(.semibold)
                
                if count > 0 {
                    Text("\(count)")
                        .font(.captionBold)
                        .foregroundColor(isSelected ? .white : color)
                        .padding(.horizontal, Spacing.xs)
                        .padding(.vertical, 2)
                        .background(
                            Capsule()
                                .fill(isSelected ? .white.opacity(0.25) : color.opacity(0.15))
                        )
                }
            }
            .font(.buttonMedium)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(
                Capsule()
                    .fill(isSelected ? color : Color.appSurface)
                    .shadow(
                        color: isSelected ? color.opacity(0.3) : Elevation.level1.color,
                        radius: isSelected ? 3 : Elevation.level1.radius,
                        y: isSelected ? 2 : Elevation.level1.y
                    )
            )
            .foregroundColor(isSelected ? .white : color)
            .overlay(
                Capsule()
                    .stroke(isSelected ? Color.clear : color.opacity(0.3), lineWidth: 1)
            )
            .scaleEffect(isSelected ? 1.0 : 0.95)
            .animation(.easeInOut(duration: Motion.fast), value: isSelected)
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
            return "empty_active_orders_title".localized
        case .new:
            return "empty_new_orders_title".localized
        case .serving:
            return "empty_serving_orders_title".localized
        case .completed:
            return "empty_completed_orders_title".localized
        case .canceled:
            return "empty_canceled_orders_title".localized
        }
    }
    
    private var emptyStateMessage: String {
        switch filter {
        case .active:
            return "empty_active_orders_message".localized
        case .new:
            return "empty_new_orders_message".localized
        case .serving:
            return "empty_serving_orders_message".localized
        case .completed:
            return "empty_completed_orders_message".localized
        case .canceled:
            return "empty_canceled_orders_message".localized
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
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Header with table info and status
            HStack(alignment: .top, spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    // Table name and new badge
                    HStack(spacing: Spacing.sm) {
                        Text(order.table?.name ?? String(format: "orders_table_format".localized, order.table_id))
                            .font(.cardTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.appTextPrimary)
                        
                        if isNew {
                            Text("orders_new_badge".localized)
                                .font(.captionBold)
                                .foregroundColor(.white)
                                .padding(.horizontal, Spacing.sm)
                                .padding(.vertical, 4)
                                .background(
                                    Capsule()
                                        .fill(Color.appInfo)
                                        .shadow(color: Color.appInfo.opacity(0.3), radius: 2, y: 1)
                                )
                        }
                        
                        Spacer()
                    }
                    
                    // Order metadata
                    HStack(spacing: Spacing.md) {
                        Label("\(order.guest_count ?? 1)", systemImage: "person.2")
                            .font(.captionRegular)
                            .foregroundColor(.appTextTertiary)
                        
                        Label(formatTime(order.created_at), systemImage: "clock")
                            .font(.captionRegular)
                            .foregroundColor(.appTextTertiary)
                        
                        // Order ID for staff reference
                        Text(String(format: "orders_id_format".localized, String(order.id.prefix(6).uppercased())))
                            .font(.captionRegular)
                            .foregroundColor(.appTextTertiary)
                            .padding(.horizontal, Spacing.xs)
                            .padding(.vertical, 2)
                            .background(Color.appBackground)
                            .cornerRadius(4)
                    }
                }
                
                VStack(alignment: .trailing, spacing: Spacing.xs) {
                    EnhancedStatusBadge(status: order.status)
                    
                    if let total = order.total_amount {
                        Text(String(format: "price_format".localized, total))
                            .font(.bodyMedium)
                            .fontWeight(.bold)
                            .foregroundColor(.appTextPrimary)
                    }
                }
            }
            
            // Order items preview with better styling
            if let items = order.order_items?.prefix(2) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    ForEach(Array(items), id: \.id) { item in
                        HStack(spacing: Spacing.sm) {
                            // Quantity badge
                            Text("\(item.quantity)")
                                .font(.captionBold)
                                .foregroundColor(.appTextSecondary)
                                .frame(width: 20, height: 20)
                                .background(Circle().fill(Color.appSurfaceSecondary))
                            
                            // Item info
                            HStack(spacing: Spacing.xs) {
                                if let code = item.menu_item?.code, !code.isEmpty {
                                    Text(code)
                                        .font(.captionBold)
                                        .foregroundColor(.appPrimary)
                                }
                                
                                Text(item.menu_item?.displayName ?? "orders_unknown_item".localized)
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                                    .lineLimit(1)
                            }
                            
                            Spacer()
                            
                            OrderItemStatusBadge(status: item.status)
                        }
                        .padding(.vertical, 2)
                    }
                    
                    // Show more items indicator
                    if let totalItems = order.order_items?.count, totalItems > 2 {
                        HStack {
                            Image(systemName: "ellipsis")
                                .font(.captionRegular)
                                .foregroundColor(.appTextTertiary)
                            Text(String(format: "orders_more_items".localized, totalItems - 2))
                                .font(.captionRegular)
                                .foregroundColor(.appTextTertiary)
                                .italic()
                            Spacer()
                        }
                        .padding(.top, Spacing.xs)
                    }
                }
                .padding(Spacing.sm)
                .background(Color.appSurfaceSecondary)
                .cornerRadius(CornerRadius.sm)
            }
        }
        .elevatedCardStyle(padding: Spacing.md, cornerRadius: CornerRadius.md)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel)
    }
    
    private var accessibilityLabel: String {
        let tableName = order.table?.name ?? String(format: "orders_table_format".localized, order.table_id)
        let status = order.status.displayName
        let guestCount = order.guest_count ?? 1
        let timeString = formatTime(order.created_at)
        let totalString = order.total_amount.map { String(format: "price_format".localized, $0) } ?? ""
        
        var label = "\(tableName), \(status), \(guestCount) guests, \(timeString)"
        if !totalString.isEmpty {
            label += ", \(totalString)"
        }
        if isNew {
            label += ", \("orders_new_badge".localized)"
        }
        return label
    }
    
    private func formatTime(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return "orders_unknown_time".localized }
        
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

// MARK: - Skeleton Loading Components

struct SkeletonOrderRow: View {
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    HStack {
                        Text("Table 12")
                            .font(.cardTitle)
                            .foregroundColor(.appTextPrimary)
                        
                        Text("ID: ABC123")
                            .font(.bodyRegular)
                            .foregroundColor(.appTextSecondary)
                        
                        Spacer()
                    }
                    
                    HStack(spacing: Spacing.xxs) {
                        Label("4", systemImage: "person.2")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                        
                        Label("12:34 PM", systemImage: "clock")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                    }
                }
                
                VStack(alignment: .trailing, spacing: Spacing.xxs) {
                    Text("New")
                        .font(.captionBold)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, 4)
                        .background(Color.appInfo.opacity(0.15))
                        .foregroundColor(.appInfo)
                        .cornerRadius(20)
                    
                    Text("¥1,500")
                        .font(.bodyMedium)
                        .fontWeight(.semibold)
                        .foregroundColor(.appTextPrimary)
                }
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text("2× Chicken Teriyaki")
                    .font(.captionRegular)
                    .foregroundColor(.appTextSecondary)
                
                Text("1× Miso Soup")
                    .font(.captionRegular)
                    .foregroundColor(.appTextSecondary)
            }
        }
        .padding(.vertical, Spacing.sm)
        .padding(.horizontal, Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .shadow(color: Elevation.level1.color, radius: Elevation.level1.radius, y: Elevation.level1.y)
        .accessibilityHidden(true)
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
            
            if showDetailedActions && item.status.rawValue != "served" && item.status.rawValue != "canceled" {
                HStack {
                    Spacer()
                    
                    Button("order_detail_update_status_button".localized) {
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
        do {
            try await orderManager.updateOrderItemStatus(orderItemId: item.id, newStatus: nextStatus)
            onPrintResult("Updated \(item.menu_item?.displayName ?? "item") to \(nextStatus.displayName)")
            
            // Success haptic feedback
            let feedback = UINotificationFeedbackGenerator()
            feedback.notificationOccurred(.success)
        } catch {
            onPrintResult("Failed to update status: \(error.localizedDescription)")
            
            // Error haptic feedback
            let feedback = UINotificationFeedbackGenerator()
            feedback.notificationOccurred(.error)
        }
    }
    
    private func getNextStatus() -> OrderItemStatus {
        switch OrderItemStatus(rawValue: item.status.rawValue) ?? .new {
        case .draft:
            return .new
        case .new:
            return .preparing
        case .preparing:
            return .ready
        case .ready:
            return .served
        case .served:
            return .served  // No further progression
        case .canceled:
            return .canceled  // canceled items don't progress
        }
    }
}

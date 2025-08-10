import SwiftUI

struct OrderDetailView: View {
    let orderId: String
    let onCheckout: () -> Void
    let onPrintResult: (String) -> Void
    
    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var printerManager: PrinterManager

    @State private var isUpdatingStatus = false
    @State private var selectedItems: Set<String> = []
    @State private var showingItemActions = false
    @State private var selectedItem: OrderItem? = nil
    @State private var showingCancelConfirmAlert = false
    @State private var showingAddItemSheet = false
    @State private var showingStatusUpdateSheet = false
    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert = false
    
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @EnvironmentObject private var supabaseManager: SupabaseManager
    
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
        case "new": return 1
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
                .sheet(isPresented: $showingAddItemSheet) {
                    NavigationView {
                        AddItemToOrderView(order: order)
                            .environmentObject(orderManager)
                            .environmentObject(supabaseManager)
                            .toolbar {
                                ToolbarItem(placement: .navigationBarLeading) {
                                    Button("cancel".localized) {
                                        showingAddItemSheet = false
                                    }
                                }
                                ToolbarItem(placement: .navigationBarTrailing) {
                                    Button("done".localized) {
                                        showingAddItemSheet = false
                                        Task {
                                            await orderManager.fetchActiveOrders()
                                        }
                                    }
                                }
                            }
                    }
                }
                .sheet(isPresented: $showingStatusUpdateSheet) {
                    NavigationView {
                        OrderStatusUpdateView(order: order)
                            .environmentObject(orderManager)
                            .toolbar {
                                ToolbarItem(placement: .navigationBarLeading) {
                                    Button("cancel".localized) {
                                        showingStatusUpdateSheet = false
                                    }
                                }
                            }
                    }
                }
                .alert("order_detail_cancel_alert_title".localized, isPresented: $showingCancelConfirmAlert) {
                    Button("order_detail_cancel_button".localized, role: .destructive) {
                        Task { await cancelOrder() }
                    }
                    Button("order_detail_keep_button".localized, role: .cancel) {}
                } message: {
                    Text("order_detail_cancel_alert_message".localized)
                }
                .alert("error".localized, isPresented: $showingErrorAlert) {
                    Button("ok".localized) {}
                } message: {
                    Text(errorMessage ?? "order_detail_generic_error_message".localized)
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
        VStack(spacing: Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    HStack {
                        Text(order.table?.name ?? String(format: "order_detail_table_fallback".localized, order.table_id))
                            .font(.cardTitle)
                            .foregroundColor(.appTextPrimary)
                            .fontWeight(.bold)
                        Spacer()
                        EnhancedStatusBadge(status: order.status)
                    }
                    HStack(spacing: Spacing.md) {
                        Label("\(order.guest_count ?? 0)", systemImage: "person.2")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                        Label(formatTime(order.created_at), systemImage: "clock")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                        if let sessionId = order.session_id, !sessionId.isEmpty {
                            Label(String(format: "order_detail_id_label".localized, order.id.prefix(6).uppercased()), systemImage: "number")
                                .font(.captionRegular)
                                .foregroundColor(.appTextSecondary)
                        }
                    }
                }
            }
            orderActionsSection(for: order)
            if let total = order.total_amount {
                HStack {
                    Text("orders_total_amount".localized)
                        .font(.bodyMedium)
                        .fontWeight(.semibold)
                        .foregroundColor(.appTextPrimary)
                    Spacer()
                    Text("¥\(String(format: "%.0f", total))")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.appPrimary)
                }
                .padding(Spacing.md)
                .background(Color.appSurface)
                .cornerRadius(CornerRadius.md)
            }
        }
        .padding(Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.lg)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }

    private func orderActionsSection(for order: Order) -> some View {
        VStack(spacing: Spacing.sm) {
            // Primary Actions Row
            HStack(spacing: Spacing.md) {
                if order.status == .completed {
                    Button(action: {
                        Task { await printReceipt(for: order) }
                    }) {
                        HStack {
                            Image(systemName: "printer")
                            Text("orders_print_receipt".localized)
                                .font(.buttonLarge)
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(Color.appPrimary)
                        .foregroundColor(.white)
                        .cornerRadius(CornerRadius.md)
                    }
                    .accessibilityLabel("orders_print_receipt_accessibility".localized)
                } else {
                    // Add Items Button
                    Button(action: {
                        showingAddItemSheet = true
                    }) {
                        HStack {
                            Image(systemName: "plus.circle")
                            Text("order_detail_add_items_button".localized)
                                .font(.buttonLarge)
                                .fontWeight(.medium)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(Color.appInfo)
                        .foregroundColor(.white)
                        .cornerRadius(CornerRadius.md)
                    }
                    .accessibilityLabel("order_detail_add_items_accessibility".localized)
                    
                    if order.status == .new {
                        Button(action: {
                            Task { await updateOrderStatus(.serving) }
                        }) {
                            HStack {
                                Image(systemName: "fork.knife")
                                Text("orders_mark_serving".localized)
                                    .font(.buttonLarge)
                                    .fontWeight(.medium)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 44)
                            .background(Color.appWarning)
                            .foregroundColor(.white)
                            .cornerRadius(CornerRadius.md)
                        }
                        .disabled(isUpdatingStatus)
                        .accessibilityLabel("orders_mark_serving_accessibility".localized)
                    }
                    
                    Button(action: onCheckout) {
                        HStack {
                            Image(systemName: "creditcard")
                            Text("orders_checkout".localized)
                                .font(.buttonLarge)
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(Color.appPrimary)
                        .foregroundColor(.white)
                        .cornerRadius(CornerRadius.md)
                    }
                    .accessibilityLabel("orders_checkout_accessibility".localized)
                }
            }
            
            // Secondary Actions Row (only for active orders)
            if order.status != .completed && order.status != .canceled {
                HStack(spacing: Spacing.md) {
                    // Update Status Button
                    Button(action: {
                        showingStatusUpdateSheet = true
                    }) {
                        HStack {
                            Image(systemName: "arrow.up.circle")
                            Text("order_detail_update_status_button".localized)
                                .font(.buttonMedium)
                                .fontWeight(.medium)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 36)
                        .background(Color.appTextSecondary.opacity(0.1))
                        .foregroundColor(.appTextPrimary)
                        .cornerRadius(CornerRadius.sm)
                    }
                    .accessibilityLabel("order_detail_update_status_accessibility".localized)
                    
                    // Cancel Order Button (only for new orders)
                    if order.status == .new {
                        Button(action: {
                            showingCancelConfirmAlert = true
                        }) {
                            HStack {
                                Image(systemName: "xmark.circle")
                                Text("order_detail_cancel_order_button".localized)
                                    .font(.buttonMedium)
                                    .fontWeight(.medium)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 36)
                            .background(Color.appError.opacity(0.1))
                            .foregroundColor(.appError)
                            .cornerRadius(CornerRadius.sm)
                        }
                        .accessibilityLabel("order_detail_cancel_order_accessibility".localized)
                    }
                }
            }
        }
    }

    private func orderItemsSection(for order: Order) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text(String(format: "order_items_section_title".localized, sortedItems.count))
                    .font(.bodyMedium)
                    .fontWeight(.semibold)
                    .foregroundColor(.appTextPrimary)
                Spacer()
                if sortedItems.contains(where: { $0.status.rawValue == "new" }) {
                    HStack {
                        Image(systemName: "circle.fill")
                            .font(.captionRegular)
                            .foregroundColor(.appError)
                        Text("order_items_new_label".localized)
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
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
                    if index < sortedItems.count - 1 {
                        Divider()
                            .padding(.leading, Spacing.md)
                            .padding(.trailing, Spacing.md)
                            .padding(.vertical, Spacing.xs)
                    }
                }
            }
        }
        .padding(Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.lg)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    
    @MainActor
    private func updateOrderStatus(_ newStatus: OrderStatus) async {
        isUpdatingStatus = true
        
        do {
            try await orderManager.updateOrderStatus(orderId: orderId, newStatus: newStatus)
            let localizedStatus = newStatus.displayName.localized
            onPrintResult(String(format: "order_status_update_success_message".localized, localizedStatus))
        } catch {
            onPrintResult("order_status_update_failure_message".localized)
        }
        
        isUpdatingStatus = false
    }
    
    @MainActor
    private func cancelOrder() async {
        isUpdatingStatus = true
        errorMessage = nil
        
        do {
            try await orderManager.cancelOrder(orderId: orderId)
            onPrintResult("order_cancel_success_message".localized)
        } catch {
            errorMessage = "order_cancel_failure_message".localized
            showingErrorAlert = true
        }
        
        isUpdatingStatus = false
    }
    
    @MainActor
    private func printReceipt(for order: Order) async {
        let subtotal = order.total_amount ?? 0
        let taxRate = supabaseManager.currentRestaurant?.taxRate ?? 0.10
        let receiptData = CheckoutReceiptData(
            order: order,
            subtotal: subtotal,
            discountAmount: 0, // Assuming discount_amount is on Order or calculated elsewhere
            discountCode: nil,
            taxAmount: subtotal * taxRate,
            totalAmount: subtotal * (1 + taxRate),
            timestamp: Date()
        )
        
        do {
            try await printerManager.printCheckoutReceipt(receiptData)
            onPrintResult("receipt_print_success_message".localized)
        } catch {
            onPrintResult("receipt_print_failure_message".localized)
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

#if DEBUG
#Preview {
    // Mock Environment Objects
    let orderManager = OrderManager.shared
    let printerManager = PrinterManager.shared
    let localizationManager = LocalizationManager.shared

    // Populate with mock data for preview
    let mockCategory = Category(id: "1", name_en: "Drinks", name_ja: "飲み物", name_vi: "Đồ uống", position: 1)
    let mockMenuItem = MenuItem(id: "1", restaurant_id: "1", category_id: "1", name_en: "Coffee", name_ja: "コーヒー", name_vi: "Cà phê", code: "COF", description_en: "Hot coffee", description_ja: "ホットコーヒー", description_vi: "Cà phê nóng", price: 5.0, tags: [], image_url: nil, stock_level: nil, available: true, position: 1, created_at: "", updated_at: "", category: mockCategory, availableSizes: [], availableToppings: [])
    let mockOrderItem = OrderItem(id: "1", restaurant_id: "1", order_id: "1", menu_item_id: "1", quantity: 2, notes: "Extra hot", menu_item_size_id: nil, topping_ids: [], price_at_order: 5.0, status: .new, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", menu_item: mockMenuItem)
    let mockTable = Table(id: "1", restaurant_id: "1", name: "Table 1", status: .occupied, capacity: 4, is_outdoor: false, is_accessible: true, notes: nil, qr_code: nil, created_at: "", updated_at: "")
    let mockOrder = Order(id: "1", restaurant_id: "1", table_id: "1", session_id: "1", guest_count: 2, status: .new, total_amount: 10.0, order_number: 1, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", table: mockTable, order_items: [mockOrderItem], payment_method: nil, discount_amount: nil, tax_amount: nil, tip_amount: nil)

    orderManager.orders = [mockOrder]

    return OrderDetailView(orderId: "1", onCheckout: {}, onPrintResult: { _ in })
        .environmentObject(orderManager)
        .environmentObject(printerManager)
        .environmentObject(localizationManager)
        .environmentObject(SupabaseManager.shared)
}
#endif

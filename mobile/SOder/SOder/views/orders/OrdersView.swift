import SwiftUI

struct OrdersView: View {
    @EnvironmentObject private var orderManager: OrderManager
    @StateObject private var supabaseManager = SupabaseManager.shared
    @EnvironmentObject var printerManager: PrinterManager
    @EnvironmentObject private var localizationManager: LocalizationManager
    
    @State private var showingPrintAlert = false
    @State private var printMessage = ""
    @State private var selectedFilter: OrderFilter = .active
    @State private var selectedOrder: Order? = nil
    @State private var showingCheckout = false
    @State private var showAllOrders = false
    @State private var showingNewOrderFlow = false
    
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    enum OrderFilter: String, CaseIterable {
        case active = "active"
        case new = "new"
        case serving = "serving"
        case completed = "completed"
        case canceled = "canceled"
        
        var displayName: String {
            switch self {
            case .active: return "orders_filter_active".localized
            case .new: return "orders_filter_new".localized
            case .serving: return "orders_filter_serving".localized
            case .completed: return "orders_filter_completed".localized
            case .canceled: return "orders_filter_canceled".localized
            }
        }
        
        var color: Color {
            switch self {
            case .active: return .appPrimary
            case .new: return .appInfo
            case .serving: return .appWarning
            case .completed: return .appTextSecondary
            case .canceled: return .appError
            }
        }
    }
    
    private var filteredOrderGroups: [OrderFilter: [Order]] {
        let baseOrders = showAllOrders ? orderManager.allOrders : orderManager.orders
        var groups: [OrderFilter: [Order]] = [:]
        
        let byStatus = Dictionary(grouping: baseOrders, by: { $0.status })

        groups[.new] = byStatus[.new] ?? []
        groups[.serving] = byStatus[.serving] ?? []
        groups[.completed] = byStatus[.completed] ?? []
        groups[.canceled] = byStatus[.canceled] ?? []

        // Active is a combination of new and serving
        groups[.active] = (groups[.new] ?? []) + (groups[.serving] ?? [])

        return groups
    }

    private var filteredOrders: [Order] {
        filteredOrderGroups[selectedFilter] ?? []
    }

    var body: some View {
        Group {
            if horizontalSizeClass == .regular {
                // iPad Layout - Navigation Split View
                NavigationSplitView {
                    orderSidebar
                } detail: {
                    orderDetailView
                }
            } else {
                // iPhone Layout - Traditional Navigation
                NavigationStack {
                    iphoneMainContent
                }
            }
        }
        .background(Color.appBackground) // Explicit background
        .task(id: showAllOrders) {
            if showAllOrders {
                await orderManager.fetchAllOrders()
            } else {
                await orderManager.fetchActiveOrders()
            }
        }
        .alert("orders_system_message".localized, isPresented: $showingPrintAlert) {
            Button("orders_ok".localized) { }
        } message: {
            Text(printMessage)
        }
        .sheet(isPresented: $showingCheckout) {
            if let order = selectedOrder {
                CheckoutView(
                    order: order,
                    onComplete: {
                        showingCheckout = false
                        selectedOrder = nil
                    }
                )
            }
        }
        .sheet(isPresented: $showingNewOrderFlow) {
            NavigationStack {
                SelectTableView(onOrderConfirmed: {
                    // Refresh orders and close the new order flow
                    Task {
                        await orderManager.fetchActiveOrders()
                    }
                    showingNewOrderFlow = false
                })
                .environmentObject(orderManager)
                .environmentObject(supabaseManager)
                .environmentObject(printerManager)
                .environmentObject(localizationManager)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button("cancel".localized) {
                            showingNewOrderFlow = false
                        }
                    }
                }
            }
        }
    }
    
    // MARK: - iPad Sidebar
    private var orderSidebar: some View {
        VStack(spacing: 0) {
            OrderSidebarHeaderView(
                showAllOrders: $showAllOrders,
                selectedFilter: $selectedFilter,
                onRefresh: {
                    Task {
                        if showAllOrders {
                            await orderManager.fetchAllOrders()
                        } else {
                            await orderManager.fetchActiveOrders()
                        }
                    }
                },
                onToggleAutoPrint: { orderManager.setAutoPrintingEnabled(!orderManager.autoPrintingEnabled) },
                onClearPrintHistory: { orderManager.clearPrintHistory() },
                onSignOut: {
                    Task {
                        try? await supabaseManager.signOut()
                    }
                },
                onNewOrder: { showingNewOrderFlow = true },
                orderManager: orderManager
            )

            orderList
            
            errorMessageView
        }
        .navigationTitle("orders".localized)
        .navigationBarHidden(true)
    }

    private var orderList: some View {
        Group {
            if orderManager.isLoading {
                List {
                    ForEach(0..<5) { _ in
                        SkeletonOrderRow()
                            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                    }
                }
                .listStyle(.plain)
                .redacted(reason: .placeholder)
            } else if filteredOrders.isEmpty {
                Spacer()
                EmptyOrdersView(filter: selectedFilter)
                Spacer()
            } else {
                List(filteredOrders, selection: $selectedOrder) { order in
                    SidebarOrderRowView(
                        order: order,
                        isNew: orderManager.newOrderIds.contains(order.id),
                        isSelected: selectedOrder?.id == order.id
                    )
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                    .onTapGesture { selectedOrder = order }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
                .id("\(selectedFilter.rawValue)-\(showAllOrders)")
                .animation(.easeInOut(duration: Motion.medium), value: selectedFilter)
                .refreshable {
                    if showAllOrders {
                        await orderManager.fetchAllOrders()
                    } else {
                        await orderManager.fetchActiveOrders()
                    }
                }
            }
        }
    }

    @ViewBuilder
    private var errorMessageView: some View {
        if let errorMessage = orderManager.errorMessage {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundColor(.appWarning)
                Text(errorMessage)
                    .font(.caption)
                    .foregroundColor(.secondary)
                Spacer()
                Button("orders_retry".localized) {
                    Task {
                        if showAllOrders {
                            await orderManager.fetchAllOrders()
                        } else {
                            await orderManager.fetchActiveOrders()
                        }
                    }
                }
                .font(.caption)
                .foregroundColor(.appPrimary)
            }
            .padding()
            .background(Color.appSurface)
        }
    }
    
    // MARK: - iPad Detail View
    private var orderDetailView: some View {
        Group {
            if let order = selectedOrder {
                OrderDetailView(
                    orderId: order.id,
                    onCheckout: {
                        showingCheckout = true
                    },
                    onPrintResult: { message in
                        printMessage = message
                        showingPrintAlert = true
                    }
                )
            } else {
                VStack(spacing: 20) {
                    Image(systemName: "list.bullet.rectangle")
                        .font(.system(size: 60))
                        .foregroundColor(Color.appTextSecondary.opacity(0.6))
                    
                    Text("orders_select_order".localized)
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.appTextPrimary)
                    
                    Text("orders_select_order_desc".localized)
                        .font(.subheadline)
                        .foregroundColor(.appTextSecondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.appBackground)
            }
        }
    }
    
    // MARK: - iPhone Content
    private var iphoneMainContent: some View {
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
                        ) { selectedFilter = filter }
                    }
                }
                .padding(.horizontal)
            }
            .padding(.vertical, Spacing.sm)
            .background(Color.appSurface)
            .overlay(Divider(), alignment: .bottom)
            
            // Content
            if orderManager.isLoading {
                List {
                    ForEach(0..<4) { _ in
                        SkeletonOrderRow()
                            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                    }
                }
                .listStyle(PlainListStyle())
                .redacted(reason: .placeholder)
            } else if filteredOrders.isEmpty {
                EmptyOrdersView(filter: selectedFilter)
            } else {
                List {
                    ForEach(groupedOrders.keys.sorted(), id: \.self) { key in
                        Section(header: Text(key)) {
                            ForEach(groupedOrders[key] ?? []) { order in
                                NavigationLink(destination: OrderDetailView(
                                    orderId: order.id,
                                    onCheckout: {
                                        selectedOrder = order
                                        showingCheckout = true
                                    },
                                    onPrintResult: { message in
                                        printMessage = message
                                        showingPrintAlert = true
                                    }
                                )) {
                                    OrderRowView(
                                        order: order,
                                        isNew: orderManager.newOrderIds.contains(order.id),
                                        orderManager: orderManager,
                                        printerManager: printerManager,
                                        onPrintResult: { message in
                                            printMessage = message
                                            showingPrintAlert = true
                                        }
                                    )
                                }
                                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                                .listRowSeparator(.hidden)
                                .listRowBackground(Color.clear)
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    // Print action - always available
                                    Button {
                                        Task {
                                            await printOrderReceipt(order)
                                        }
                                    } label: {
                                        Label("print".localized, systemImage: "printer")
                                    }
                                    .tint(.appInfo)
                                    
                                    // Mark as Serving action - only for new orders
                                    if order.status == .new {
                                        Button {
                                            Task {
                                                await markOrderAsServing(order)
                                            }
                                        } label: {
                                            Label("orders_mark_as_serving".localized, systemImage: "fork.knife")
                                        }
                                        .tint(.appWarning)
                                    }
                                }
                            }
                        }
                    }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
                .id("\(selectedFilter.rawValue)")
                .animation(.easeInOut(duration: Motion.medium), value: selectedFilter)
                .refreshable {
                    await orderManager.fetchActiveOrders()
                }
            }
            
            // Error Message
            if let errorMessage = orderManager.errorMessage {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.appWarning)
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Button("orders_retry".localized) {
                        Task {
                            await orderManager.fetchActiveOrders()
                        }
                    }
                    .font(.caption)
                    .foregroundColor(.appPrimary)
                }
                .padding()
                .background(Color.appSurface)
            }
        }
        .navigationTitle("orders".localized)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { showingNewOrderFlow = true }) {
                    HStack { Image(systemName: "plus.circle") ; Text("tab_new_order".localized) }
                }
            }
            
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button("orders_refresh".localized) {
                        Task {
                            await orderManager.fetchActiveOrders()
                        }
                    }
                    
                    Divider()
                    
                    // Auto-printing controls
                    Section("orders_auto_printing".localized) {
                        Button(action: {
                            orderManager.setAutoPrintingEnabled(!orderManager.autoPrintingEnabled)
                        }) {
                            HStack {
                                Text("orders_auto_print_new_orders".localized)
                                Spacer()
                                if orderManager.autoPrintingEnabled {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.appSuccess)
                                }
                            }
                        }
                        
                        Button("orders_clear_print_history".localized) {
                            orderManager.clearPrintHistory()
                        }
                        .disabled(!orderManager.autoPrintingEnabled)
                    }
                    
                    Divider()
                    
                    Button("orders_sign_out".localized) {
                        Task {
                            try? await supabaseManager.signOut()
                        }
                    }
                } label: {
                    HStack {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
    }
    
    private var groupedOrders: [String: [Order]] {
        Dictionary(grouping: filteredOrders, by: { $0.table?.name ?? String(format: "orders_table_format".localized, $0.table_id) })
    }
    
    // MARK: - Swipe Actions
    
    @MainActor
    private func printOrderReceipt(_ order: Order) async {
        do {
            try await printerManager.printOrderReceipt(order)
            printMessage = "receipt_print_success_message".localized
        } catch {
            printMessage = "receipt_print_failure_message".localized
        }
        showingPrintAlert = true
    }
    
    @MainActor
    private func markOrderAsServing(_ order: Order) async {
        do {
            _ = try await orderManager.updateOrderStatus(orderId: order.id, newStatus: .serving)
            printMessage = String(format: "order_status_update_success_message".localized, OrderStatus.serving.displayName)
        } catch {
            printMessage = "order_status_update_failure_message".localized
        }
        showingPrintAlert = true
    }
}

// MARK: - Supporting Views

struct SidebarOrderRowView: View {
    let order: Order
    let isNew: Bool
    let isSelected: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    HStack {
                        HStack(spacing: Spacing.xxs){
                            Text(order.table?.name ?? String(format: "orders_table_format".localized, order.table_id))
                                .font(.cardTitle)
                                .foregroundColor(.appTextPrimary)
                                .fontWeight(.bold)
                            
                            Text(String(format: "orders_id_format".localized, order.id.prefix(6).uppercased()))
                                .font(.bodyRegular)
                                .foregroundColor(.appTextSecondary)
                        }
                        if isNew {
                            Text("orders_new_badge".localized)
                                .font(.captionBold)
                                .foregroundColor(.appSurface)
                                .padding(.horizontal, Spacing.xs)
                                .padding(.vertical, 2)
                                .background(Color.appInfo)
                                .cornerRadius(CornerRadius.xs)
                        }
                        
                        if order.order_items?.contains(where: { $0.status.rawValue == "new" }) == true {
                            Image(systemName: "circle.fill")
                                .font(.captionRegular)
                                .foregroundColor(.appInfo)
                        }
                        
                        Spacer()
                    }
                    
                    HStack(spacing: Spacing.xxs) {
                        Label("\(order.guest_count ?? 0)", systemImage: "person.2")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                            .accessibilityLabel(String(format: "orders_guest_count_accessibility".localized, order.guest_count ?? 1))
                        
                        Label(formatTime(order.created_at), systemImage: "clock")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                    }
                }
                
                VStack(alignment: .trailing, spacing: Spacing.xxs) {
                    EnhancedStatusBadge(status: order.status)
                    
                    if let total = order.total_amount {
                        Text(String(format: "price_format".localized, total))
                            .font(.bodyMedium)
                            .fontWeight(.semibold)
                            .foregroundColor(.appTextPrimary)
                    }
                }
            }
            
            // Order items preview
            if let items = order.order_items?.prefix(3) {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(Array(items), id: \.id) { item in
                        HStack(spacing: Spacing.xxs) {
                            if let code = item.menu_item?.code, !code.isEmpty {
                                Text(code)
                                    .font(.captionBold)
                                    .foregroundColor(.appTextSecondary)
                                
                                Text("•")
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                            }
                            
                            Text(item.menu_item?.displayName ?? "orders_unknown_item".localized)
                                .font(.captionRegular)
                                .foregroundColor(.appTextSecondary)
                                .lineLimit(1)
                        }
                    }
                    
                    if let totalItems = order.order_items?.count, totalItems > 3 {
                        Text(String(format: "orders_more_items".localized, totalItems - 3))
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                            .italic()
                    }
                }
            }
        }
        .padding(.vertical, Spacing.sm)
        .padding(.horizontal, Spacing.md)
        .background(isSelected ? Color.appPrimary.opacity(0.1) : Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(isSelected ? Color.appPrimary : Color.clear, lineWidth: 2)
        )
        .shadow(color: Elevation.level1.color, radius: Elevation.level1.radius, y: Elevation.level1.y)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityLabel(accessibilityLabel)
    }
    
    private var accessibilityLabel: String {
        let tableName = order.table?.name ?? String(format: "orders_table_format".localized, order.table_id)
        let orderId = String(order.id.prefix(6).uppercased())
        let status = order.status.displayName
        let guestCount = order.guest_count ?? 1
        let timeString = formatTime(order.created_at)
        let totalString = order.total_amount.map { String(format: "price_format".localized, $0) } ?? ""
        
        var label = "\(tableName), \(orderId), \(status), \(guestCount) guests, \(timeString)"
        if !totalString.isEmpty {
            label += ", \(totalString)"
        }
        if isNew {
            label += ", \("orders_new_badge".localized)"
        }
        return label
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
            return "orders_unknown_time".localized
        }
        
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: finalDate)
    }
}

// Keep existing FilterChip, EmptyOrdersView, OrderRowView, EnhancedStatusBadge, StatusActionButton, PrintButton, EnhancedOrderItemView, and StatusBadge views

private struct SegmentedPill: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.captionBold)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, 8)
                .background(isSelected ? Color.appPrimary : Color.appPrimary.opacity(0.1))
                .foregroundColor(isSelected ? .white : .appPrimary)
                .cornerRadius(20)
        }.buttonStyle(.plain)
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
    orderManager.allOrders = [mockOrder]

    return OrdersView()
        .environmentObject(orderManager)
        .environmentObject(printerManager)
        .environmentObject(localizationManager)
        .environmentObject(SupabaseManager.shared)
}
#endif

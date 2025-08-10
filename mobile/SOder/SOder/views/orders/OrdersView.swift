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
            // Header with toggle
            VStack(spacing: Spacing.lg) {
                HStack {
                    Text("orders".localized)
                        .font(.sectionHeader)
                        .foregroundColor(.appTextPrimary)
                    Spacer()
                    
                    // Auto-print status indicator
                    if orderManager.autoPrintingEnabled {
                        AutoPrintStatusView(
                            isEnabled: orderManager.autoPrintingEnabled,
                            isActivePrinting: orderManager.autoPrintingInProgress,
                            autoPrintStats: orderManager.autoPrintStats,
                            lastResult: orderManager.lastAutoPrintResult
                        )
                    }
                    
                    Menu {
                        Button("orders_refresh".localized) {
                            Task {
                                if showAllOrders {
                                    await orderManager.fetchAllOrders()
                                } else {
                                    await orderManager.fetchActiveOrders()
                                }
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
                            
                            if orderManager.autoPrintStats.totalNewOrdersPrinted > 0 || orderManager.autoPrintStats.totalReadyItemsPrinted > 0 {
                                Button("orders_view_statistics".localized) {
                                    // Show detailed statistics
                                }
                                .disabled(true) // TODO: Implement detailed stats view
                            }
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
                                .font(.title2)
                        }
                    }
                }
                
                // Order Type Toggle
                Picker("orders_order_type_picker".localized, selection: $showAllOrders) {
                    Text("orders_active_orders".localized).tag(false)
                    Text("orders_all_orders".localized).tag(true)
                }
                .pickerStyle(.segmented)
                
                // Filter Pills
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.md) {
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
                
                // New Order Button
                Button(action: {
                    showingNewOrderFlow = true
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("tab_new_order".localized)
                    }
                    .font(.buttonMedium)
                    .foregroundColor(.white)
                    .padding(.vertical, Spacing.md)
                    .frame(maxWidth: .infinity)
                    .background(Color.appPrimary)
                    .cornerRadius(CornerRadius.md)
                }
                .padding(.horizontal)
            }
            .padding()
            .background(Color.appSurface)
            
            // Orders List
            if orderManager.isLoading {
                Spacer()
                VStack(spacing: Spacing.md) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("orders_loading".localized)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                }
                Spacer()
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
                    .onTapGesture {
                        selectedOrder = order
                    }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
                .refreshable {
                    if showAllOrders {
                        await orderManager.fetchAllOrders()
                    } else {
                        await orderManager.fetchActiveOrders()
                    }
                }
                .onChange(of: selectedOrder) { newOrder in
                    print("Selected order changed to: \(newOrder?.id ?? "nil")")
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
        .navigationBarHidden(true)
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
                        ) {
                            selectedFilter = filter
                        }
                    }
                }
                .padding(.horizontal)
            }
            .padding(.vertical, Spacing.sm)
            .background(Color.appSurface)
            
            // Content
            if orderManager.isLoading {
                VStack(spacing: Spacing.md) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("orders_loading".localized)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
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
                            }
                        }
                    }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
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
                Button(action: {
                    showingNewOrderFlow = true
                }) {
                    HStack {
                        Image(systemName: "plus.circle.fill")
                        Text("tab_new_order".localized)
                    }
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
        Dictionary(grouping: filteredOrders, by: { $0.table?.name ?? "\("orders_table_prefix".localized) \($0.table_id)" })
    }
    
    private func countForFilter(_ filter: OrderFilter) -> Int {
        filteredOrderGroups[filter]?.count ?? 0
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
                            Text(order.table?.name ?? "\("orders_table_prefix".localized) \(order.table_id)")
                                .font(.cardTitle)
                                .foregroundColor(.appTextPrimary)
                                .fontWeight(.bold)
                            
                            Text("\("orders_id_prefix".localized): \(order.id.prefix(6).uppercased())")
                                .font(.bodyRegular)
                                .foregroundColor(.appTextSecondary)
                        }
                        if isNew {
                            Text("orders_new_badge".localized)
                                .font(.captionBold)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, Spacing.xs)
                                .padding(.vertical, 2)
                                .background(Color.appError)
                                .cornerRadius(CornerRadius.xs)
                        }
                        
                        if order.order_items?.contains(where: { $0.status.rawValue == "new" }) == true {
                            Image(systemName: "circle.fill")
                                .font(.captionRegular)
                                .foregroundColor(.appError)
                        }
                        
                        Spacer()
                    }
                    
                    HStack(spacing: Spacing.xxs) {
                        Label("\(order.guest_count)", systemImage: "person.2")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                        
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
                        Text("\(item.quantity)× \(item.menu_item?.displayName ?? "orders_unknown_item".localized)")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                            .lineLimit(1)
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

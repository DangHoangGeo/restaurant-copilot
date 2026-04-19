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

        groups[.new] = sortedOrders(byStatus[.new] ?? [])
        groups[.serving] = sortedOrders(byStatus[.serving] ?? [])
        groups[.completed] = sortedOrders(byStatus[.completed] ?? [])
        groups[.canceled] = sortedOrders(byStatus[.canceled] ?? [])

        // Active is a combination of new and serving
        groups[.active] = sortedOrders((groups[.new] ?? []) + (groups[.serving] ?? []))

        return groups
    }

    private var filteredOrders: [Order] {
        filteredOrderGroups[selectedFilter] ?? []
    }

    private func countForFilter(_ filter: OrderFilter) -> Int {
        filteredOrderGroups[filter]?.count ?? 0
    }

    private func sortedOrders(_ orders: [Order]) -> [Order] {
        orders.sorted { lhs, rhs in
            let lhsRank = orderUrgencyRank(lhs)
            let rhsRank = orderUrgencyRank(rhs)

            if lhsRank != rhsRank {
                return lhsRank < rhsRank
            }

            return sortDate(for: lhs) > sortDate(for: rhs)
        }
    }

    private func orderUrgencyRank(_ order: Order) -> Int {
        let items = sortedOrderItems(for: order)

        if let firstItem = items.first {
            return statusRank(for: firstItem.status)
        }

        return statusRank(for: order.status)
    }

    private func sortedOrderItems(for order: Order) -> [OrderItem] {
        (order.order_items ?? []).sorted { lhs, rhs in
            let lhsRank = statusRank(for: lhs.status)
            let rhsRank = statusRank(for: rhs.status)

            if lhsRank != rhsRank {
                return lhsRank < rhsRank
            }

            return parseDate(lhs.created_at) > parseDate(rhs.created_at)
        }
    }

    private func sortDate(for order: Order) -> Date {
        if let prioritizedItem = sortedOrderItems(for: order).first {
            return parseDate(prioritizedItem.created_at)
        }

        return parseDate(order.created_at)
    }

    private func statusRank(for status: OrderItemStatus) -> Int {
        switch status {
        case .draft:
            return 5
        case .new:
            return 0
        case .preparing:
            return 1
        case .ready:
            return 2
        case .served:
            return 3
        case .canceled:
            return 4
        }
    }

    private func statusRank(for status: OrderStatus) -> Int {
        switch status {
        case .draft:
            return 5
        case .new:
            return 0
        case .serving:
            return 1
        case .completed:
            return 3
        case .canceled:
            return 4
        }
    }

    private func parseDate(_ dateString: String) -> Date {
        let iso8601Formatter = ISO8601DateFormatter()
        iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let parsedDate = iso8601Formatter.date(from: dateString) {
            return parsedDate
        }

        iso8601Formatter.formatOptions = [.withInternetDateTime]
        if let parsedDate = iso8601Formatter.date(from: dateString) {
            return parsedDate
        }

        let fallbackFormatter = DateFormatter()
        fallbackFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        return fallbackFormatter.date(from: dateString) ?? .distantPast
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
        .onChange(of: filteredOrders) { oldValue, newValue in
            // Auto-select first order on iPad when orders are available
            if horizontalSizeClass == .regular && !newValue.isEmpty && selectedOrder == nil {
                selectedOrder = newValue.first
            }
        }
        .alert("orders_system_message".localized, isPresented: $showingPrintAlert) {
            Button("orders_ok".localized) { }
        } message: {
            Text(printMessage)
        }
        .sheet(
            isPresented: Binding(
                get: { horizontalSizeClass == .regular && showingCheckout },
                set: { showingCheckout = $0 }
            )
        ) {
            if let order = selectedOrder {
                NavigationStack {
                    CheckoutView(
                        order: order,
                        showsCancelButton: true,
                        onComplete: {
                            showingCheckout = false
                            selectedOrder = nil
                        }
                    )
                }
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
                orderManager: orderManager,
                supabaseManager: supabaseManager
            )

            orderList

            errorMessageView
        }
        .background(AppScreenBackground())
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
                .scrollContentBackground(.hidden)
                .redacted(reason: .placeholder)
                .transition(.opacity)
            } else if filteredOrders.isEmpty {
                Spacer()
                EmptyOrdersView(filter: selectedFilter)
                    .transition(.scale.combined(with: .opacity))
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
                        withAnimation(.easeInOut(duration: Motion.fast)) {
                            selectedOrder = order
                        }
                        // Haptic feedback for order selection
                        let impactFeedback = UIImpactFeedbackGenerator(style: .light)
                        impactFeedback.impactOccurred()
                    }
                    .transition(.opacity.combined(with: .move(edge: .trailing)))
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
            HStack(spacing: Spacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.title3)
                    .foregroundColor(.appError)

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text("orders_error_title".localized)
                        .font(.captionBold)
                        .foregroundColor(.appTextPrimary)
                    Text(errorMessage)
                        .font(.captionRegular)
                        .foregroundColor(.appTextSecondary)
                        .lineLimit(2)
                }

                Spacer()

                Button(action: {
                    Task {
                        if showAllOrders {
                            await orderManager.fetchAllOrders()
                        } else {
                            await orderManager.fetchActiveOrders()
                        }
                    }
                    // Haptic feedback for retry
                    let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                    impactFeedback.impactOccurred()
                }) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "arrow.clockwise")
                        Text("orders_retry".localized)
                    }
                    .font(.captionBold)
                    .foregroundColor(.white)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(Color.appPrimary)
                    .cornerRadius(CornerRadius.sm)
                }
            }
            .padding(Spacing.md)
            .background(Color.appErrorLight)
            .cornerRadius(CornerRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(Color.appError.opacity(0.3), lineWidth: 1)
            )
            .padding(.horizontal, Spacing.md)
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .animation(.easeInOut(duration: Motion.medium), value: orderManager.errorMessage)
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
        ZStack {
            AppScreenBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    iphoneHeroHeader
                    filterBar

                    if orderManager.isLoading {
                        VStack(spacing: Spacing.md) {
                            ForEach(0..<4, id: \.self) { _ in
                                SkeletonOrderRow()
                            }
                        }
                        .redacted(reason: .placeholder)
                    } else if filteredOrders.isEmpty {
                        EmptyOrdersView(filter: selectedFilter)
                    } else {
                        LazyVStack(spacing: Spacing.md) {
                            ForEach(filteredOrders) { order in
                                NavigationLink(
                                    destination: OrderDetailView(
                                        orderId: order.id,
                                        onCheckout: {
                                            selectedOrder = order
                                            showingCheckout = true
                                        },
                                        onPrintResult: { message in
                                            printMessage = message
                                            showingPrintAlert = true
                                        }
                                    )
                                ) {
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
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    if let errorMessage = orderManager.errorMessage {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.title3)
                                .foregroundColor(.appError)

                            VStack(alignment: .leading, spacing: Spacing.xxs) {
                                Text("orders_error_title".localized)
                                    .font(.captionBold)
                                    .foregroundColor(.appTextPrimary)
                                Text(errorMessage)
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                                    .lineLimit(2)
                            }

                            Spacer()

                            Button(action: {
                                Task {
                                    await orderManager.fetchActiveOrders()
                                }
                            }) {
                                HStack(spacing: Spacing.xs) {
                                    Image(systemName: "arrow.clockwise")
                                    Text("orders_retry".localized)
                                }
                            }
                            .buttonStyle(SmallButtonStyle())
                        }
                        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface)
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.md)
                .padding(.bottom, 120)
            }
            .refreshable {
                await orderManager.fetchActiveOrders()
            }
        }
        .navigationTitle("orders".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button(action: { showingNewOrderFlow = true }) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "plus")
                        Text("tab_new_order".localized)
                            .font(.monoLabel)
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
                    Image(systemName: "ellipsis")
                }
            }
        }
    }

    private var iphoneHeroHeader: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            AppSectionEyebrow(supabaseManager.currentRestaurant?.name ?? "orders".localized)

            Text("orders".localized)
                .font(.heroTitle)
                .foregroundColor(.appTextPrimary)
        }
    }

    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.sm) {
                ForEach(OrderFilter.allCases, id: \.self) { filter in
                    FilterChip(
                        title: filter.displayName,
                        count: countForFilter(filter),
                        isSelected: selectedFilter == filter,
                        color: filter.color
                    ) { selectedFilter = filter }
                }
            }
            .padding(.horizontal, Spacing.xs)
        }
        .padding(.vertical, Spacing.sm)
        .padding(.horizontal, Spacing.xs)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.lg)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.lg)
                .stroke(Color.appBorderLight, lineWidth: 1)
        )
    }

    // MARK: - Swipe Actions
    
    @MainActor
    private func printOrderReceipt(_ order: Order) async {
        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()

        let didPrint = await printerManager.printOrderReceipt(order)
        if didPrint {
            printMessage = "receipt_print_success_message".localized
            // Success haptic
            let notificationFeedback = UINotificationFeedbackGenerator()
            notificationFeedback.notificationOccurred(.success)
        } else {
            printMessage = "receipt_print_failure_message".localized
            // Error haptic
            let notificationFeedback = UINotificationFeedbackGenerator()
            notificationFeedback.notificationOccurred(.error)
        }
        showingPrintAlert = true
    }

    @MainActor
    private func markOrderAsServing(_ order: Order) async {
        // Haptic feedback
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()

        do {
            _ = try await orderManager.updateOrderStatus(orderId: order.id, newStatus: .serving)
            printMessage = String(format: "order_status_update_success_message".localized, OrderStatus.serving.displayName)
            // Success haptic
            let notificationFeedback = UINotificationFeedbackGenerator()
            notificationFeedback.notificationOccurred(.success)
        } catch {
            printMessage = "order_status_update_failure_message".localized
            // Error haptic
            let notificationFeedback = UINotificationFeedbackGenerator()
            notificationFeedback.notificationOccurred(.error)
        }
        showingPrintAlert = true
    }
}

private struct CompactOrderSummaryPill: View {
    let title: String
    let value: String
    let tint: Color

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Circle()
                .fill(tint)
                .frame(width: 8, height: 8)
                .shadow(color: tint.opacity(0.35), radius: 6, y: 0)

            Text(title.uppercased())
                .font(.buttonSmall)
                .foregroundColor(.appTextSecondary)

            Text(value)
                .font(.buttonMedium)
                .foregroundColor(.appTextPrimary)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(Color.appBorderLight, lineWidth: 1)
        )
    }
}

// MARK: - Supporting Views

struct SidebarOrderRowView: View {
    let order: Order
    let isNew: Bool
    let isSelected: Bool

    private var sortedItems: [OrderItem] {
        (order.order_items ?? []).sorted { lhs, rhs in
            let lhsRank = statusRank(for: lhs.status)
            let rhsRank = statusRank(for: rhs.status)

            if lhsRank != rhsRank {
                return lhsRank < rhsRank
            }

            return parseDate(lhs.created_at) > parseDate(rhs.created_at)
        }
    }

    private var hasNewItems: Bool {
        sortedItems.contains(where: { $0.status == .new }) || isNew
    }

    private var metadataText: String {
        let orderId = String(format: "orders_id_format".localized, String(order.id.suffix(6)).uppercased())
        guard let timeText = formattedTime(order.created_at) else {
            return orderId
        }

        return "\(orderId) • \(timeText)"
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    HStack(spacing: Spacing.sm) {
                        Text(order.table?.name ?? String(format: "orders_table_format".localized, order.table_id))
                            .font(.cardTitle)
                            .foregroundColor(.appTextPrimary)
                    }

                    Text(metadataText)
                        .font(.monoCaption)
                        .foregroundColor(.appTextSecondary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: Spacing.sm) {
                    EnhancedStatusBadge(status: order.status)
                }
            }

            if !sortedItems.isEmpty {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    ForEach(Array(sortedItems.prefix(3)), id: \.id) { item in
                        HStack(spacing: Spacing.sm) {
                            Text("\(item.quantity)x")
                                .font(.monoLabel)
                                .foregroundColor(.appTextSecondary)

                            itemStatusIcon(for: item.status)

                            Text(item.menu_item?.displayName ?? "orders_unknown_item".localized)
                                .font(.bodyMedium)
                                .foregroundColor(.appTextPrimary)
                                .lineLimit(1)

                            Spacer()
                        }
                    }
                }
                .padding(.top, Spacing.sm)
                .overlay(alignment: .top) {
                    Rectangle()
                        .fill(Color.appBorderLight.opacity(0.7))
                        .frame(height: 1)
                }
            }

            HStack {
                if let total = order.total_amount {
                    Text(AppCurrencyFormatter.format(total))
                        .font(.metricValue)
                        .foregroundColor(.appTextPrimary)
                }

                Spacer()

                Text("OPEN")
                    .font(.monoLabel)
                    .foregroundColor(.appTextSecondary)
            }
        }
        .padding(Spacing.lg)
        .background(isSelected ? Color.appSurfaceElevated : Color.appSurface)
        .cornerRadius(CornerRadius.lg)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.lg)
                .stroke(isSelected ? Color.appHighlight.opacity(0.35) : Color.appBorderLight, lineWidth: 1)
        )
        .shadow(color: Elevation.level1.color, radius: Elevation.level1.radius, y: Elevation.level1.y)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityLabel(accessibilityLabel)
    }
    
    private var accessibilityLabel: String {
        let tableName = order.table?.name ?? String(format: "orders_table_format".localized, order.table_id)
        let orderId = String(order.id.suffix(6)).uppercased()
        let status = order.status.displayName
        let guestCount = order.guest_count ?? 1
        let timeString = formattedTime(order.created_at)
        let totalString = order.total_amount.map { AppCurrencyFormatter.format($0) } ?? ""
        
        var label = "\(tableName), \(orderId), \(status), \(guestCount) guests"
        if let timeString {
            label += ", \(timeString)"
        }
        if !totalString.isEmpty {
            label += ", \(totalString)"
        }
        if hasNewItems {
            label += ", \("orders_filter_new".localized)"
        }
        return label
    }
    
    private func formattedTime(_ dateString: String) -> String? {
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        let parsedDate = parseDate(dateString)
        guard parsedDate != .distantPast else { return nil }
        return displayFormatter.string(from: parsedDate)
    }

    private func parseDate(_ dateString: String) -> Date {
        let iso8601Formatter = ISO8601DateFormatter()
        iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let parsedDate = iso8601Formatter.date(from: dateString) {
            return parsedDate
        }

        iso8601Formatter.formatOptions = [.withInternetDateTime]
        if let parsedDate = iso8601Formatter.date(from: dateString) {
            return parsedDate
        }

        let fallbackFormatter = DateFormatter()
        fallbackFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        return fallbackFormatter.date(from: dateString) ?? .distantPast
    }

    private func statusRank(for status: OrderItemStatus) -> Int {
        switch status {
        case .draft:
            return 5
        case .new:
            return 0
        case .preparing:
            return 1
        case .ready:
            return 2
        case .served:
            return 3
        case .canceled:
            return 4
        }
    }

    @ViewBuilder
    private func itemStatusIcon(for status: OrderItemStatus) -> some View {
        Image(systemName: itemStatusSymbol(for: status))
            .font(.system(size: 10, weight: .semibold))
            .foregroundColor(itemStatusTint(for: status))
            .frame(width: 12, height: 12)
    }

    private func itemStatusSymbol(for status: OrderItemStatus) -> String {
        switch status {
        case .draft:
            return "circle.dotted"
        case .new, .preparing:
            return "circle.fill"
        case .ready, .served:
            return "checkmark.circle.fill"
        case .canceled:
            return "xmark.circle.fill"
        }
    }

    private func itemStatusTint(for status: OrderItemStatus) -> Color {
        switch status {
        case .draft:
            return .appTextTertiary
        case .new:
            return .appAccent
        case .preparing:
            return .appWarning
        case .ready, .served:
            return .appSuccess
        case .canceled:
            return .appError
        }
    }
}

// Keep existing FilterChip, EmptyOrdersView, OrderRowView, EnhancedStatusBadge, StatusActionButton, PrintButton, EnhancedOrderItemView, and StatusBadge views

struct SegmentedPill: View {
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

import SwiftUI

struct OrderDetailView: View {
    let orderId: String
    let onCheckout: () -> Void
    let onPrintResult: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @Environment(\.floatingDockClearance) private var floatingDockClearance
    @EnvironmentObject private var orderManager: OrderManager
    @EnvironmentObject private var printerManager: PrinterManager
    @EnvironmentObject private var supabaseManager: SupabaseManager

    @State private var isUpdatingStatus = false
    @State private var selectedItem: OrderItem?
    @State private var itemPendingCancellation: OrderItem?
    @State private var showingCancelConfirmAlert = false
    @State private var showingAddItemSheet = false
    @State private var showingCheckoutScreen = false
    @State private var checkoutOrderSnapshot: Order?
    @State private var showingStatusUpdateSheet = false
    @State private var showingCheckoutGuidanceAlert = false
    @State private var errorMessage: String?
    @State private var showingErrorAlert = false

    private var currentOrder: Order? {
        orderManager.orders.first(where: { $0.id == orderId }) ??
        orderManager.allOrders.first(where: { $0.id == orderId })
    }

    private var sortedItems: [OrderItem] {
        guard let items = currentOrder?.order_items else { return [] }

        return items.sorted { lhs, rhs in
            if lhs.status != rhs.status {
                return lhs.status < rhs.status
            }

            return lhs.created_at < rhs.created_at
        }
    }

    private var contentWidth: CGFloat? {
        horizontalSizeClass == .regular ? 720 : nil
    }

    var body: some View {
        ZStack {
            AppScreenBackground()

            if let order = currentOrder {
                orderContent(for: order)
            } else {
                missingOrderState
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .toolbar {
            if let order = currentOrder {
                toolbarContent(for: order)
            }
        }
        .navigationDestination(isPresented: $showingCheckoutScreen) {
            if let order = checkoutOrderSnapshot {
                CheckoutView(order: order) {
                    handleCheckoutCompletion()
                }
            }
        }
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
            if let order = currentOrder {
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
        }
        .sheet(isPresented: $showingStatusUpdateSheet) {
            if let order = currentOrder {
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
        }
        .confirmationDialog(
            "order_detail_cancel_item_title".localized,
            isPresented: Binding(
                get: { itemPendingCancellation != nil },
                set: { isPresented in
                    if !isPresented {
                        itemPendingCancellation = nil
                    }
                }
            ),
            titleVisibility: .visible,
            presenting: itemPendingCancellation
        ) { item in
            Button("order_detail_remove_item".localized, role: .destructive) {
                Task {
                    await cancelOrderItem(item)
                }
            }

            Button("order_detail_keep_item".localized, role: .cancel) {
                itemPendingCancellation = nil
            }
        } message: { item in
            Text(
                "order_detail_cancel_item_message".localized(
                    with: item.menu_item?.displayName ?? "orders_unknown_item".localized
                )
            )
        }
        .alert("order_detail_cancel_alert_title".localized, isPresented: $showingCancelConfirmAlert) {
            Button("order_detail_cancel_button".localized, role: .destructive) {
                Task {
                    await cancelOrder()
                }
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
        .alert("order_detail_checkout_blocked_title".localized, isPresented: $showingCheckoutGuidanceAlert) {
            Button("order_detail_update_status_button".localized) {
                showingStatusUpdateSheet = true
            }

            Button("cancel".localized, role: .cancel) {}
        } message: {
            Text("order_detail_checkout_blocked_message".localized)
        }
    }
}

private extension OrderDetailView {
    @ViewBuilder
    func orderContent(for order: Order) -> some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: Spacing.xl) {
                OrderHeroSection(
                    orderReference: orderReference(for: order),
                    tableName: tableName(for: order),
                    statusLabel: orderStatusLabel(for: order),
                    statusTint: orderStatusTint(for: order),
                    elapsedText: elapsedText(for: order),
                    metadataText: metadataText(for: order),
                    progressSegments: progressSegments(for: order)
                )

                OrderItemsCard(
                    title: "items_section_title".localized,
                    itemCount: sortedItems.count,
                    items: sortedItems,
                    addItemLabel: "order_detail_add_items_button".localized,
                    onAddItem: order.status == .completed || order.status == .canceled ? nil : {
                        showingAddItemSheet = true
                    },
                    onSelect: { item in
                        selectedItem = item
                    },
                    onCancel: { item in
                        itemPendingCancellation = item
                    }
                )

                OrderTotalsCard(
                    subtotal: subtotalAmount(for: order),
                    discount: discountAmount(for: order),
                    tax: taxAmount(for: order),
                    tip: tipAmount(for: order),
                    total: totalAmount(for: order)
                )

                if horizontalSizeClass == .regular {
                    OrderBottomBar(
                        style: bottomBarStyle(for: order),
                        amountText: currencyText(totalAmount(for: order)),
                        isRegularLayout: true,
                        onTap: {
                            handleBottomBarTap(for: order)
                        }
                    )
                }

                if order.status != .completed && order.status != .canceled {
                    OrderManagementRow(
                        isRegularLayout: horizontalSizeClass == .regular,
                        onUpdateStatus: {
                            showingStatusUpdateSheet = true
                        },
                        onCancelOrder: order.status == .new ? {
                            showingCancelConfirmAlert = true
                        } : nil
                    )
                }
            }
            .frame(maxWidth: contentWidth, alignment: .leading)
            .frame(maxWidth: .infinity)
            .padding(.horizontal, Spacing.md)
            .padding(.top, Spacing.lg)
            .padding(.bottom, bottomContentPadding)
        }
        .safeAreaInset(edge: .bottom) {
            if horizontalSizeClass != .regular {
                OrderBottomBar(
                    style: bottomBarStyle(for: order),
                    amountText: currencyText(totalAmount(for: order)),
                    isRegularLayout: false,
                    onTap: {
                        handleBottomBarTap(for: order)
                    }
                )
                .frame(maxWidth: contentWidth)
                .frame(maxWidth: .infinity)
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.sm)
                .background(
                    LinearGradient(
                        colors: [Color.appBackground.opacity(0), Color.appBackground.opacity(0.92), Color.appBackground],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                )
            }
        }
    }

    var missingOrderState: some View {
        VStack(spacing: Spacing.md) {
            Text("orders_not_found".localized)
                .font(.cardTitle)
                .foregroundColor(.appTextPrimary)

            Button("orders_refresh".localized) {
                Task {
                    await orderManager.fetchActiveOrders()
                }
            }
            .buttonStyle(.borderedProminent)
            .tint(.appPrimary)
        }
        .padding(Spacing.xl)
    }

    var bottomContentPadding: CGFloat {
        if horizontalSizeClass == .regular {
            return max(Spacing.xl, floatingDockClearance + Spacing.lg)
        }

        return 120
    }

    @ToolbarContentBuilder
    func toolbarContent(for order: Order) -> some ToolbarContent {
        ToolbarItem(placement: .principal) {
            VStack(spacing: 2) {
                Text(orderReference(for: order))
                    .font(.monoCaption)
                    .kerning(1.3)
                    .foregroundColor(.appTextSecondary)

                    Text("order_detail_title".localized)
                    .font(.bodyMedium.weight(.semibold))
                    .foregroundColor(.appTextPrimary)
            }
        }

        if order.status == .completed {
            ToolbarItem(placement: .navigationBarTrailing) {
                ToolbarCapsuleButton(
                    systemName: "printer.fill",
                    title: "orders_print_receipt".localized
                ) {
                    Task {
                        await printReceipt(for: order)
                    }
                }
            }
        }
    }

    func tableName(for order: Order) -> String {
        order.table?.name ?? String(format: "order_detail_table_fallback".localized, order.table_id)
    }

    func orderReference(for order: Order) -> String {
        if let orderNumber = order.order_number, orderNumber > 0 {
            let formatted = String(orderNumber)
            return String(formatted.suffix(6)).uppercased()
        }

        return String(order.id.suffix(6)).uppercased()
    }

    func metadataText(for order: Order) -> String {
        let guestText = "order_detail_guest_count_short".localized(with: order.guest_count ?? 0)
        let placedText = "order_detail_placed_time".localized(with: formatTime(order.created_at))
        return "\(guestText)  •  \(placedText)"
    }

    func orderStatusLabel(for order: Order) -> String {
        let counts = itemStatusCounts(for: order)

        if order.status == .completed {
            return order.status.displayName.uppercased()
        }

        if order.status == .canceled {
            return order.status.displayName.uppercased()
        }

        if counts.ready > 0 && counts.new == 0 && counts.preparing == 0 {
            return "order_item_status_ready".localized.uppercased()
        }

        if counts.preparing > 0 {
            return "order_item_status_preparing".localized.uppercased()
        }

        if counts.new > 0 {
            return "order_item_status_new".localized.uppercased()
        }

        if counts.served > 0 {
            return "order_item_status_served".localized.uppercased()
        }

        return order.status.displayName.uppercased()
    }

    func orderStatusTint(for order: Order) -> Color {
        let counts = itemStatusCounts(for: order)

        if order.status == .completed {
            return Color.appHighlightSoft
        }

        if order.status == .canceled {
            return .appError
        }

        if counts.ready > 0 && counts.new == 0 && counts.preparing == 0 {
            return .appSuccess
        }

        if counts.preparing > 0 {
            return .appWarning
        }

        if counts.new > 0 {
            return .appAccent
        }

        if counts.served > 0 {
            return .appHighlightSoft
        }

        return order.status.statusColor
    }

    func progressSegments(for order: Order) -> [OrderProgressSegment] {
        let counts = itemStatusCounts(for: order)

        return [
            OrderProgressSegment(count: counts.new, tint: Color.appWarning),
            OrderProgressSegment(count: counts.preparing, tint: Color.appError),
            OrderProgressSegment(count: counts.ready, tint: Color.appSuccess),
            OrderProgressSegment(count: counts.served, tint: Color.appHighlightSoft)
        ]
    }

    func itemStatusCounts(for order: Order) -> (new: Int, preparing: Int, ready: Int, served: Int) {
        let items = order.order_items ?? []

        return (
            new: items.filter { $0.status == .new }.count,
            preparing: items.filter { $0.status == .preparing }.count,
            ready: items.filter { $0.status == .ready }.count,
            served: items.filter { $0.status == .served }.count
        )
    }

    func subtotalAmount(for order: Order) -> Double {
        let activeItems = (order.order_items ?? []).filter { $0.status != .canceled }
        let liveSubtotal = activeItems.reduce(0) { partial, item in
            partial + (Double(item.quantity) * item.price_at_order)
        }

        if order.order_items != nil {
            return liveSubtotal
        }

        let total = order.total_amount ?? 0
        return max(0, total - taxAmount(for: order) - tipAmount(for: order) + discountAmount(for: order))
    }

    func discountAmount(for order: Order) -> Double {
        max(0, order.discount_amount ?? 0)
    }

    func taxAmount(for order: Order) -> Double {
        if order.status == .completed, let storedTax = order.tax_amount {
            return storedTax
        }

        let taxRate = supabaseManager.currentRestaurant?.taxRate ?? 0.10
        return subtotalAmount(for: order) * taxRate
    }

    func tipAmount(for order: Order) -> Double {
        max(0, order.tip_amount ?? 0)
    }

    func totalAmount(for order: Order) -> Double {
        return subtotalAmount(for: order) - discountAmount(for: order) + taxAmount(for: order) + tipAmount(for: order)
    }

    func currencyText(_ amount: Double) -> String {
        AppCurrencyFormatter.format(amount, currencyCode: supabaseManager.currentCurrencyCode)
    }

    func canCheckout(for order: Order) -> Bool {
        let items = order.order_items ?? []
        guard !items.isEmpty else { return false }

        return items.allSatisfy { $0.status == .served || $0.status == .canceled }
    }

    func bottomBarStyle(for order: Order) -> OrderBottomBar.Style {
        switch order.status {
        case .completed:
            return .receipt
        case .canceled:
            return .hidden
        default:
            return canCheckout(for: order) ? .checkoutReady : .checkoutBlocked
        }
    }

    func handleBottomBarTap(for order: Order) {
        switch bottomBarStyle(for: order) {
        case .checkoutReady:
            if horizontalSizeClass == .regular {
                onCheckout()
            } else {
                checkoutOrderSnapshot = order
                showingCheckoutScreen = true
            }
        case .checkoutBlocked:
            showingCheckoutGuidanceAlert = true
        case .receipt:
            Task {
                await printReceipt(for: order)
            }
        case .hidden:
            break
        }
    }

    func elapsedText(for order: Order) -> String {
        guard let createdDate = parseDate(order.created_at) else {
            return "orders_unknown_time".localized
        }

        let elapsed = max(0, Int(Date().timeIntervalSince(createdDate)))
        let hours = elapsed / 3600
        let minutes = (elapsed % 3600) / 60

        if hours > 0 {
            return "\(hours)h \(minutes)m elapsed"
        }

        return "\(minutes)m elapsed"
    }

    func formatTime(_ dateString: String) -> String {
        guard let date = parseDate(dateString) else {
            return "orders_unknown_time".localized
        }

        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    func parseDate(_ dateString: String) -> Date? {
        let iso8601 = ISO8601DateFormatter()
        iso8601.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let parsed = iso8601.date(from: dateString) {
            return parsed
        }

        iso8601.formatOptions = [.withInternetDateTime]
        if let parsed = iso8601.date(from: dateString) {
            return parsed
        }

        let fallback = DateFormatter()
        fallback.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
        return fallback.date(from: dateString)
    }

    @MainActor
    func updateOrderStatus(_ newStatus: OrderStatus) async {
        isUpdatingStatus = true

        defer {
            isUpdatingStatus = false
        }

        do {
            try await orderManager.updateOrderStatus(orderId: orderId, newStatus: newStatus)
            onPrintResult("order_status_update_success_message".localized(with: newStatus.displayName))
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            onPrintResult("order_status_update_failure_message".localized)
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }

    func handleCheckoutCompletion() {
        checkoutOrderSnapshot = nil
        showingCheckoutScreen = false

        DispatchQueue.main.async {
            dismiss()
        }
    }

    @MainActor
    func cancelOrder() async {
        isUpdatingStatus = true
        errorMessage = nil

        defer {
            isUpdatingStatus = false
        }

        do {
            try await orderManager.cancelOrder(orderId: orderId)
            onPrintResult("order_cancel_success_message".localized)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            errorMessage = "order_cancel_failure_message".localized
            showingErrorAlert = true
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }

    @MainActor
    func cancelOrderItem(_ item: OrderItem) async {
        itemPendingCancellation = nil

        do {
            try await orderManager.cancelOrderItem(orderItemId: item.id)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            errorMessage = "error_cancel_item".localized
            showingErrorAlert = true
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }

    @MainActor
    func printReceipt(for order: Order) async {
        let subtotal = subtotalAmount(for: order)
        let receiptData = CheckoutReceiptData(
            order: order,
            subtotal: subtotal,
            discountAmount: discountAmount(for: order),
            discountCode: nil,
            taxAmount: taxAmount(for: order),
            totalAmount: totalAmount(for: order),
            timestamp: Date()
        )

        do {
            try await printerManager.printCheckoutReceipt(receiptData)
            onPrintResult("receipt_print_success_message".localized)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            onPrintResult("receipt_print_failure_message".localized)
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }
}

private struct OrderHeroSection: View {
    let orderReference: String
    let tableName: String
    let statusLabel: String
    let statusTint: Color
    let elapsedText: String
    let metadataText: String
    let progressSegments: [OrderProgressSegment]

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            AppSectionEyebrow(orderReference)

            HStack(alignment: .top, spacing: Spacing.md) {
                Text(tableName)
                    .font(.heroTitle)
                    .foregroundColor(.appHighlight)
                    .lineLimit(2)

                Spacer(minLength: Spacing.md)

                VStack(alignment: .trailing, spacing: Spacing.sm) {
                    OrderStatusCapsule(label: statusLabel, tint: statusTint)

                    Text(elapsedText)
                        .font(.monoLabel)
                        .foregroundColor(.appHighlight)
                }
            }

            Text(metadataText)
                .font(.bodyMedium)
                .foregroundColor(.appTextSecondary)

            OrderProgressStrip(segments: progressSegments)
        }
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.xl)
                .fill(Color.appSurface.opacity(0.92))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.xl)
                        .stroke(Color.appBorderLight, lineWidth: 1)
                )
        )
        .shadow(
            color: Elevation.level2.color,
            radius: Elevation.level2.radius,
            y: Elevation.level2.y
        )
    }
}

private struct OrderProgressSegment {
    let count: Int
    let tint: Color
}

private struct OrderProgressStrip: View {
    let segments: [OrderProgressSegment]

    var body: some View {
        HStack(spacing: Spacing.sm) {
            ForEach(Array(segments.enumerated()), id: \.offset) { _, segment in
                Capsule()
                    .fill(segment.count > 0 ? segment.tint : Color.appSurfaceSecondary)
                    .frame(height: 6)
                    .overlay(
                        Capsule()
                            .stroke(Color.appBorder.opacity(0.35), lineWidth: 0.5)
                    )
            }
        }
    }
}

private struct OrderItemsCard: View {
    let title: String
    let itemCount: Int
    let items: [OrderItem]
    let addItemLabel: String
    let onAddItem: (() -> Void)?
    let onSelect: (OrderItem) -> Void
    let onCancel: (OrderItem) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                HStack(spacing: Spacing.sm) {
                    Text(title.uppercased())
                        .font(.monoLabel)
                        .kerning(1.6)
                        .foregroundColor(.appTextSecondary)

                    Text("· \(itemCount)")
                        .font(.monoLabel)
                        .foregroundColor(.appTextSecondary)
                }

                Spacer()

                if let onAddItem {
                    OrderPillButton(
                        label: addItemLabel,
                        systemImage: "plus",
                        tint: .appHighlight,
                        foreground: .appTextPrimary,
                        action: onAddItem
                    )
                }
            }

            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    OrderItemRow(
                        item: item,
                        onSelect: {
                            onSelect(item)
                        },
                        onCancel: {
                            onCancel(item)
                        }
                    )

                    if index < items.count - 1 {
                        Divider()
                            .overlay(Color.appBorder.opacity(0.7))
                            .padding(.horizontal, Spacing.md)
                    }
                }
            }
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(Color.appSurface.opacity(0.9))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                            .stroke(Color.appBorderLight, lineWidth: 1)
                    )
            )
        }
    }
}

private struct OrderItemRow: View {
    let item: OrderItem
    let onSelect: () -> Void
    let onCancel: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(alignment: .top, spacing: Spacing.md) {
                Text("\(item.quantity)x")
                    .font(.sectionHeader)
                    .foregroundColor(.appPrimary)
                    .frame(minWidth: 28, alignment: .leading)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    HStack(alignment: .top, spacing: Spacing.sm) {
                        Text(item.menu_item?.displayName ?? item.menu_item_id)
                            .font(.bodyLarge.weight(.medium))
                            .foregroundColor(.appTextPrimary)
                            .multilineTextAlignment(.leading)
                        
                        Spacer(minLength: Spacing.sm)

                        OrderItemStatusPill(status: item.status)
                    }

                    if let notes = item.notes, !notes.isEmpty {
                        Text("\"\(notes)\"")
                            .font(.bodyMedium.italic())
                            .foregroundColor(.appPrimary.opacity(0.82))
                            .multilineTextAlignment(.leading)
                    }

                    Text(AppCurrencyFormatter.format(Double(item.quantity) * item.price_at_order))
                        .font(.monoLabel)
                        .foregroundColor(.appTextSecondary)
                }

                Spacer(minLength: Spacing.sm)

                if item.status == .served {
                    Image(systemName: "checkmark")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.appSuccess)
                        .frame(width: 34, height: 34)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.sm)
                                .fill(Color.appSuccessLight)
                                .overlay(
                                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                                        .stroke(Color.appSuccess.opacity(0.28), lineWidth: 1)
                                )
                        )
                        .accessibilityLabel("order_item_status_served".localized)
                } else {
                    Button(action: onCancel) {
                        Image(systemName: "xmark")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(.appTextSecondary)
                            .frame(width: 34, height: 34)
                            .background(
                                RoundedRectangle(cornerRadius: CornerRadius.sm)
                                    .fill(Color.appSurfaceSecondary)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: CornerRadius.sm)
                                            .stroke(Color.appBorderLight, lineWidth: 1)
                                    )
                            )
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("order_detail_remove_item".localized)
                }
            }
            .padding(Spacing.md)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

private struct OrderTotalsCard: View {
    let subtotal: Double
    let discount: Double
    let tax: Double
    let tip: Double
    let total: Double

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(spacing: Spacing.sm) {
                Text("order_detail_totals_title".localized.uppercased())
                    .font(.monoLabel)
                    .kerning(1.6)
                    .foregroundColor(.appTextSecondary)

                Spacer()
            }

            VStack(spacing: Spacing.md) {
                TotalsRow(label: "subtotal".localized, value: subtotal)

                if discount > 0 {
                    TotalsRow(label: "checkout_discount_section_title".localized, value: -discount)
                }

                TotalsRow(label: "tax".localized, value: tax)

                if tip > 0 {
                    TotalsRow(label: "order_detail_tip_label".localized, value: tip)
                }

                Divider()
                    .overlay(Color.appBorder.opacity(0.7))

                TotalsRow(label: "checkout_total_label".localized.replacingOccurrences(of: ":", with: ""), value: total, emphasis: true)
            }
            .padding(Spacing.lg)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(Color.appSurface.opacity(0.92))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                            .stroke(Color.appBorderLight, lineWidth: 1)
                    )
            )
        }
    }
}

private struct TotalsRow: View {
    let label: String
    let value: Double
    var emphasis = false

    var body: some View {
        HStack {
            Text(label)
                .font(emphasis ? .bodyLarge.weight(.semibold) : .bodyMedium)
                .foregroundColor(emphasis ? .appTextPrimary : .appTextSecondary)

            Spacer()

            Text(AppCurrencyFormatter.format(value))
                .font(emphasis ? .cardTitle : .bodyLarge.weight(.medium))
                .foregroundColor(emphasis ? .appTextPrimary : .appHighlight)
        }
    }
}

private struct OrderManagementRow: View {
    let isRegularLayout: Bool
    let onUpdateStatus: () -> Void
    let onCancelOrder: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("order_detail_manage_title".localized.uppercased())
                .font(.monoLabel)
                .kerning(1.6)
                .foregroundColor(.appTextSecondary)

            HStack(spacing: Spacing.md) {
                OrderPillButton(
                    label: "order_detail_update_status_button".localized,
                    tint: .appHighlight,
                    foreground: .appTextPrimary,
                    action: onUpdateStatus
                )
            }

            if let onCancelOrder {
                Button(action: onCancelOrder) {
                    Text("order_detail_cancel_order_button".localized)
                        .font(.buttonMedium)
                        .foregroundColor(.appError)
                        .frame(maxWidth: isRegularLayout ? .infinity : nil, alignment: .leading)
                }
                .buttonStyle(.plain)
            }
        }
    }
}

private struct OrderPillButton: View {
    let label: String
    let systemImage: String?
    let tint: Color
    let foreground: Color
    let action: () -> Void
    var isFilled = false
    var isDisabled = false

    init(
        label: String,
        systemImage: String? = nil,
        tint: Color,
        foreground: Color,
        action: @escaping () -> Void,
        isFilled: Bool = false,
        isDisabled: Bool = false
    ) {
        self.label = label
        self.systemImage = systemImage
        self.tint = tint
        self.foreground = foreground
        self.action = action
        self.isFilled = isFilled
        self.isDisabled = isDisabled
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.xs) {
                if let systemImage, !systemImage.isEmpty {
                    Image(systemName: systemImage)
                        .font(.system(size: 13, weight: .semibold))
                }

                Text(label)
                    .font(.buttonMedium)
            }
            .foregroundColor(foreground)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, 12)
            .frame(maxWidth: .infinity)
            .background(
                Capsule()
                    .fill(tint.opacity(isFilled ? 1 : 0.14))
                    .overlay(
                        Capsule()
                            .stroke(tint.opacity(isFilled ? 0.18 : 0.42), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.5 : 1)
    }
}

private struct OrderItemStatusPill: View {
    let status: OrderItemStatus

    var body: some View {
        HStack(spacing: Spacing.xs) {
            Circle()
                .fill(status.statusColor)
                .frame(width: 7, height: 7)

            Text(status.displayName.uppercased())
                .font(.buttonSmall)
                .foregroundColor(status.statusColor)
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, 6)
        .background(
            Capsule()
                .fill(status.statusColor.opacity(0.12))
                .overlay(
                    Capsule()
                        .stroke(status.statusColor.opacity(0.24), lineWidth: 1)
                )
        )
    }
}

private struct OrderBottomBar: View {
    enum Style {
        case checkoutReady
        case checkoutBlocked
        case receipt
        case hidden
    }

    let style: Style
    let amountText: String
    let isRegularLayout: Bool
    let onTap: () -> Void

    var body: some View {
        switch style {
        case .hidden:
            EmptyView()

        case .checkoutReady:
            if isRegularLayout {
                regularActionPanel(
                    title: "checkout".localized,
                    detail: amountText,
                    systemImage: "creditcard",
                    tint: .appHighlight,
                    foreground: .appOnHighlight
                )
            } else {
                Button(action: onTap) {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "creditcard")
                            .font(.system(size: 15, weight: .semibold))

                        Text("checkout".localized)
                            .font(.bodyLarge.weight(.semibold))

                        Text("· \(amountText)")
                            .font(.bodyLarge.weight(.semibold))
                    }
                    .foregroundColor(.appOnHighlight)
                    .frame(maxWidth: .infinity)
                    .frame(height: 62)
                    .background(
                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                            .fill(Color.appHighlight)
                    )
                }
                .buttonStyle(.plain)
            }

        case .checkoutBlocked:
            if isRegularLayout {
                regularActionPanel(
                    title: "checkout".localized,
                    detail: amountText,
                    systemImage: "clock.badge.exclamationmark",
                    tint: .appSurfaceSecondary,
                    foreground: .appTextPrimary,
                    hint: "order_detail_checkout_blocked_hint".localized,
                    borderColor: .appBorderLight
                )
            } else {
                Button(action: onTap) {
                    VStack(spacing: 4) {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "clock.badge.exclamationmark")
                                .font(.system(size: 15, weight: .semibold))

                            Text("checkout".localized)
                                .font(.bodyLarge.weight(.semibold))

                            Text("· \(amountText)")
                                .font(.bodyLarge.weight(.semibold))
                        }

                        Text("order_detail_checkout_blocked_hint".localized)
                            .font(.buttonSmall)
                    }
                    .foregroundColor(.appTextSecondary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 62)
                    .background(
                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                            .fill(Color.appSurface.opacity(0.94))
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.lg)
                                    .stroke(Color.appBorderLight, lineWidth: 1)
                            )
                    )
                }
                .buttonStyle(.plain)
            }

        case .receipt:
            if isRegularLayout {
                regularActionPanel(
                    title: "orders_print_receipt".localized,
                    detail: amountText,
                    systemImage: "printer.fill",
                    tint: .appHighlight,
                    foreground: .appOnHighlight
                )
            } else {
                Button(action: onTap) {
                    HStack(spacing: Spacing.sm) {
                        Image(systemName: "printer.fill")
                            .font(.system(size: 15, weight: .semibold))

                        Text("orders_print_receipt".localized)
                            .font(.bodyLarge.weight(.semibold))

                        Text("· \(amountText)")
                            .font(.bodyLarge.weight(.semibold))
                    }
                    .foregroundColor(.appBackground)
                    .frame(maxWidth: .infinity)
                    .frame(height: 62)
                    .background(
                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                            .fill(Color.appHighlight)
                    )
                }
                .buttonStyle(.plain)
            }
        }
    }

    @ViewBuilder
    private func regularActionPanel(
        title: String,
        detail: String,
        systemImage: String,
        tint: Color,
        foreground: Color,
        hint: String? = nil,
        borderColor: Color? = nil
    ) -> some View {
        Button(action: onTap) {
            HStack(spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text("total".localized.uppercased())
                        .font(.monoCaption)
                        .kerning(1.2)
                        .foregroundColor(.appTextSecondary)

                    Text(detail)
                        .font(.title3.weight(.semibold))
                        .foregroundColor(.appTextPrimary)

                    if let hint {
                        Text(hint)
                            .font(.buttonSmall)
                            .foregroundColor(.appTextSecondary)
                    }
                }

                Spacer(minLength: Spacing.md)

                HStack(spacing: Spacing.sm) {
                    Image(systemName: systemImage)
                        .font(.system(size: 15, weight: .semibold))

                    Text(title)
                        .font(.bodyMedium.weight(.semibold))
                        .lineLimit(1)
                }
                .foregroundColor(foreground)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, 12)
                .background(
                    Capsule()
                        .fill(tint)
                )
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(Color.appSurface.opacity(0.98))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.lg)
                            .stroke(borderColor ?? tint.opacity(0.16), lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
        .shadow(color: Color.black.opacity(0.08), radius: 16, y: 6)
    }
}

private struct ToolbarCapsuleButton: View {
    let systemName: String
    let title: String?
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: systemName)
                    .font(.system(size: 14, weight: .semibold))

                if let title, !title.isEmpty {
                    Text(title.uppercased())
                        .font(.buttonSmall)
                        .kerning(1)
                }
            }
            .foregroundColor(.appTextPrimary)
            .padding(.horizontal, title == nil ? 12 : 14)
            .frame(height: 38)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(Color.appSurface.opacity(0.96))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(Color.appBorderLight, lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }
}

private struct OrderStatusCapsule: View {
    let label: String
    let tint: Color

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Circle()
                .fill(tint)
                .frame(width: 8, height: 8)

            Text(label)
                .font(.buttonSmall)
                .kerning(1.2)
                .foregroundColor(tint)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            Capsule()
                .fill(tint.opacity(0.14))
                .overlay(
                    Capsule()
                        .stroke(tint.opacity(0.22), lineWidth: 1)
                )
        )
    }
}

#if DEBUG
#Preview {
    let orderManager = OrderManager.shared
    let printerManager = PrinterManager.shared
    let localizationManager = LocalizationManager.shared

    let mockCategory = Category(id: "1", name_en: "Mains", name_ja: "メイン", name_vi: "Món chính", position: 1)
    let mockMenuItem = MenuItem(id: "1", restaurant_id: "1", category_id: "1", name_en: "Bavette Steak", name_ja: "バヴェットステーキ", name_vi: "Bavette Steak", code: "BVT", description_en: "Medium rare", description_ja: "ミディアムレア", description_vi: "Medium rare", price: 40.0, tags: [], image_url: nil, stock_level: nil, available: true, position: 1, created_at: "", updated_at: "", category: mockCategory, availableSizes: [], availableToppings: [])
    let mockSecondMenuItem = MenuItem(id: "2", restaurant_id: "1", category_id: "1", name_en: "Roasted Beets", name_ja: "ビーツロースト", name_vi: "Roasted Beets", code: "RBT", description_en: "", description_ja: "", description_vi: "", price: 18.0, tags: [], image_url: nil, stock_level: nil, available: true, position: 2, created_at: "", updated_at: "", category: mockCategory, availableSizes: [], availableToppings: [])

    let itemOne = OrderItem(id: "1", restaurant_id: "1", order_id: "1", menu_item_id: "1", quantity: 1, notes: "medium rare", menu_item_size_id: nil, topping_ids: [], price_at_order: 40.0, status: .preparing, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", menu_item: mockMenuItem)
    let itemTwo = OrderItem(id: "2", restaurant_id: "1", order_id: "1", menu_item_id: "2", quantity: 1, notes: nil, menu_item_size_id: nil, topping_ids: [], price_at_order: 18.0, status: .ready, created_at: "2023-01-01T12:05:00Z", updated_at: "2023-01-01T12:05:00Z", menu_item: mockSecondMenuItem)
    let mockTable = Table(id: "1", restaurant_id: "1", name: "Table 5", status: .occupied, capacity: 4, is_outdoor: false, is_accessible: true, notes: nil, qr_code: nil, created_at: "", updated_at: "")
    let mockOrder = Order(id: "1", restaurant_id: "1", table_id: "1", session_id: "A-0429", guest_count: 2, status: .new, total_amount: 101.36, order_number: 429, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", table: mockTable, order_items: [itemOne, itemTwo], payment_method: nil, discount_amount: nil, tax_amount: 6.96, tip_amount: 14.40)

    orderManager.orders = [mockOrder]

    return NavigationStack {
        OrderDetailView(orderId: "1", onCheckout: {}, onPrintResult: { _ in })
            .environmentObject(orderManager)
            .environmentObject(printerManager)
            .environmentObject(localizationManager)
            .environmentObject(SupabaseManager.shared)
    }
}
#endif

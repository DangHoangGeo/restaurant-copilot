import SwiftUI

struct AddItemToOrderView: View {
    enum Mode {
        case existingOrder(Order)
        case newDraft(orderId: String, table: Table, onOrderConfirmed: (() -> Void)?)
    }

    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var supabaseManager: SupabaseManager
    @Environment(\.dismiss) var dismiss

    @StateObject private var coordinator = AddToOrderCoordinator()
    @State private var menuItems: [MenuItem] = []
    @State private var categories: [Category] = []
    @State private var isLoading = false
    @State private var searchText = ""
    @State private var selectedCategoryId: String? = nil
    @State private var orderSummary: (itemsCount: Int, totalAmount: Double) = (0, 0.0)
    @State private var isSavingToDatabase = false
    @State private var showingCartSheet = false
    @State private var itemToCustomize: MenuItem? = nil
    @State private var itemToEdit: OrderItem? = nil

    private let mode: Mode

    init(order: Order) {
        self.mode = .existingOrder(order)
    }

    init(draftOrderId: String, table: Table, onOrderConfirmed: (() -> Void)? = nil) {
        self.mode = .newDraft(orderId: draftOrderId, table: table, onOrderConfirmed: onOrderConfirmed)
    }

    private var localDraftOrderId: String {
        switch mode {
        case .existingOrder(let order):
            return "add_items_\(order.id)"
        case .newDraft(let orderId, _, _):
            return orderId
        }
    }

    private var contextualSubtitle: String {
        switch mode {
        case .existingOrder(let order):
            let tableName = order.table?.name ?? "orders_table_prefix".localized + order.table_id
            let reference = String(order.id.suffix(6)).uppercased()
            return "add_items_existing_order_subtitle".localized(with: tableName, reference)
        case .newDraft(_, let table, _):
            return "add_items_new_order_subtitle".localized(with: table.name)
        }
    }

    private var cartConfirmLabel: String {
        switch mode {
        case .existingOrder:
            return "add_items_save_button".localized
        case .newDraft:
            return "add_items_send_to_kitchen_button".localized
        }
    }

    private var cartConfirmIcon: String {
        switch mode {
        case .existingOrder:
            return "tray.and.arrow.down.fill"
        case .newDraft:
            return "fork.knife.circle.fill"
        }
    }

    private var cartSubtitle: String {
        switch mode {
        case .existingOrder(let order):
            return "add_items_review_existing_subtitle".localized(with: order.table?.name ?? order.table_id)
        case .newDraft(_, let table, _):
            return "add_items_review_new_subtitle".localized(with: table.name)
        }
    }

    private var filteredItems: [MenuItem] {
        var items = menuItems

        if let categoryId = selectedCategoryId {
            items = items.filter { $0.category_id == categoryId }
        }

        if !searchText.isEmpty {
            items = items.filter { item in
                item.name_en.localizedCaseInsensitiveContains(searchText) ||
                (item.name_ja?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (item.name_vi?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (item.description_en?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (item.description_ja?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (item.description_vi?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (item.code?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }

        return items.sorted { $0.displayName < $1.displayName }
    }

    var body: some View {
        VStack(spacing: 0) {
            MenuSearchHeader(
                searchText: $searchText,
                selectedCategoryId: $selectedCategoryId,
                categories: categories,
                menuItems: menuItems,
                title: "add_items_title".localized,
                subtitle: contextualSubtitle
            )
            .padding()
            .background(Color.appSurfaceElevated)
            .shadow(color: Elevation.level2.color, radius: Elevation.level2.radius, x: 0, y: Elevation.level2.y)

            if isLoading {
                VStack(spacing: Spacing.lg) {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(.appPrimary)
                    Text("pos_loading_menu".localized)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.appBackground)
            } else {
                MenuItemsList(
                    menuItems: filteredItems,
                    categories: categories,
                    searchText: searchText,
                    showCategoryHeaders: true,
                    isAddingItem: coordinator.isAddingItem,
                    onItemTap: { item in
                        itemToEdit = nil
                        itemToCustomize = item
                    },
                    onQuickAdd: { item in
                        Task {
                            await coordinator.handleAddItem(item, to: localDraftOrderId) { menuItem in
                                itemToEdit = nil
                                itemToCustomize = menuItem
                            }
                            await updateOrderSummary()
                        }
                    },
                    onCustomize: { item in
                        itemToEdit = nil
                        itemToCustomize = item
                    }
                )
            }

            if orderSummary.itemsCount > 0 {
                VStack(spacing: 0) {
                    Divider()
                    OrderSummaryBar(
                        itemsCount: orderSummary.itemsCount,
                        totalAmount: orderSummary.totalAmount,
                        isVisible: true,
                        onTap: {
                            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                            impactFeedback.impactOccurred()
                            showingCartSheet = true
                        }
                    )
                    .padding()
                    .background(Color.appSurfaceElevated)
                    .shadow(color: Elevation.level3.color, radius: Elevation.level3.radius, y: -Elevation.level3.y)
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
                .animation(.spring(response: 0.4, dampingFraction: 0.7), value: orderSummary.itemsCount)
            }
        }
        .navigationTitle("add_items_title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await initializeWorkingDraft()
            await loadMenuData()
            await updateOrderSummary()
        }
        .sheet(item: $itemToCustomize) { menuItem in
            CustomizeMenuItemSheet(
                menuItem: menuItem,
                orderId: localDraftOrderId,
                coordinator: coordinator,
                onComplete: {
                    itemToEdit = nil
                    itemToCustomize = nil
                    Task {
                        await updateOrderSummary()
                    }
                },
                editingItem: itemToEdit
            )
        }
        .sheet(isPresented: $showingCartSheet) {
            if let localDraft = orderManager.localDraftOrders[localDraftOrderId] {
                CartSheet(
                    order: localDraft,
                    title: "add_items_review_title".localized,
                    subtitle: cartSubtitle,
                    confirmLabel: cartConfirmLabel,
                    confirmIcon: cartConfirmIcon,
                    onDismiss: {
                        showingCartSheet = false
                    },
                    onConfirm: {
                        showingCartSheet = false
                        Task {
                            await confirmCart()
                        }
                    },
                    onEditItem: { item in
                        showingCartSheet = false
                        itemToEdit = item
                        itemToCustomize = item.menu_item
                    }
                )
            }
        }
        .alert("error".localized, isPresented: $coordinator.showingErrorAlert) {
            Button("ok".localized) {}
        } message: {
            Text(coordinator.errorMessage ?? "order_detail_generic_error_message".localized)
        }
        .onDisappear {
            if case .existingOrder = mode,
               orderManager.localDraftOrders[localDraftOrderId] != nil {
                orderManager.localDraftOrders.removeValue(forKey: localDraftOrderId)
                print("🧹 Cleaned up unsaved local draft for add-items session \(localDraftOrderId)")
            }
        }
    }

    @MainActor
    private func initializeWorkingDraft() async {
        switch mode {
        case .existingOrder(let order):
            let localOrder = Order(
                id: localDraftOrderId,
                restaurant_id: order.restaurant_id,
                table_id: order.table_id,
                session_id: order.session_id,
                guest_count: order.guest_count,
                status: order.status,
                total_amount: 0.0,
                order_number: order.order_number,
                created_at: order.created_at,
                updated_at: order.updated_at,
                table: order.table,
                order_items: [],
                payment_method: order.payment_method,
                discount_amount: order.discount_amount,
                tax_amount: order.tax_amount,
                tip_amount: order.tip_amount
            )

            orderManager.localDraftOrders[localDraftOrderId] = localOrder
        case .newDraft(let orderId, let table, _):
            if orderManager.localDraftOrders[orderId] == nil {
                await orderManager.createLocalDraftOrder(orderId: orderId, table: table)
            }
        }
    }

    @MainActor
    private func confirmCart() async {
        switch mode {
        case .existingOrder:
            await saveLocalDraftToDatabase()
        case .newDraft(_, _, let onOrderConfirmed):
            await sendDraftOrderToKitchen(onOrderConfirmed: onOrderConfirmed)
        }
    }

    @MainActor
    private func saveLocalDraftToDatabase() async {
        guard !isSavingToDatabase else { return }

        isSavingToDatabase = true

        defer {
            isSavingToDatabase = false
        }

        do {
            guard let localDraft = orderManager.localDraftOrders[localDraftOrderId],
                  let newItems = localDraft.order_items,
                  case .existingOrder(let order) = mode else {
                dismiss()
                return
            }

            for item in newItems {
                _ = try await orderManager.addItemToDraftOrder(
                    orderId: order.id,
                    menuItemId: item.menu_item_id,
                    quantity: item.quantity,
                    notes: item.notes,
                    selectedSizeId: item.menu_item_size_id,
                    selectedToppingIds: item.topping_ids,
                    priceAtOrder: item.price_at_order
                )
            }

            orderManager.localDraftOrders.removeValue(forKey: localDraftOrderId)
            dismiss()
        } catch {
            print("❌ Error saving items to database: \(error)")
            coordinator.errorMessage = "add_items_error_save_failed".localized
            coordinator.showingErrorAlert = true
        }
    }

    @MainActor
    private func sendDraftOrderToKitchen(onOrderConfirmed: (() -> Void)?) async {
        guard !isSavingToDatabase else { return }

        isSavingToDatabase = true
        defer {
            isSavingToDatabase = false
        }

        do {
            _ = try await orderManager.confirmOrderToKitchen(orderId: localDraftOrderId)
            onOrderConfirmed?()
            dismiss()
        } catch {
            print("❌ Error confirming local draft order: \(error)")
            coordinator.errorMessage = "add_items_error_save_failed".localized
            coordinator.showingErrorAlert = true
        }
    }

    @MainActor
    private func loadMenuData() async {
        isLoading = true

        defer {
            isLoading = false
        }

        do {
            guard supabaseManager.currentRestaurantId != nil else {
                coordinator.errorMessage = "add_items_error_no_restaurant".localized
                coordinator.showingErrorAlert = true
                return
            }

            async let categoriesTask = supabaseManager.fetchAllCategories()
            async let menuItemsTask = supabaseManager.fetchAllMenuItems()

            categories = try await categoriesTask
            menuItems = try await menuItemsTask
        } catch {
            print("Error loading menu data: \(error.localizedDescription)")
            coordinator.errorMessage = "add_items_error_load_failed".localized
            coordinator.showingErrorAlert = true
        }
    }

    @MainActor
    private func updateOrderSummary() async {
        orderSummary = await coordinator.getOrderSummary(for: localDraftOrderId)
    }
}

#if DEBUG
#Preview {
    let orderManager = OrderManager.shared
    let mockCategory = Category(id: "1", name_en: "Drinks", name_ja: "飲み物", name_vi: "Do uong", position: 1)
    let mockMenuItem = MenuItem(id: "1", restaurant_id: "1", category_id: "1", name_en: "Coffee", name_ja: "コーヒー", name_vi: "Ca phe", code: "COF", description_en: "Hot coffee", description_ja: "ホットコーヒー", description_vi: "Ca phe nong", price: 500.0, tags: [], image_url: nil, stock_level: nil, available: true, position: 1, created_at: "", updated_at: "", category: mockCategory, availableSizes: [], availableToppings: [])
    let mockOrderItem = OrderItem(id: "1", restaurant_id: "1", order_id: "1", menu_item_id: "1", quantity: 2, notes: "Extra hot", menu_item_size_id: nil, topping_ids: [], price_at_order: 500.0, status: .new, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", menu_item: mockMenuItem)
    let mockTable = Table(id: "1", restaurant_id: "1", name: "Table 1", status: .occupied, capacity: 4, is_outdoor: false, is_accessible: true, notes: nil, qr_code: nil, created_at: "", updated_at: "")
    let mockOrder = Order(id: "1", restaurant_id: "1", table_id: "1", session_id: "1", guest_count: 2, status: .new, total_amount: 1000.0, order_number: 1, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", table: mockTable, order_items: [mockOrderItem], payment_method: nil, discount_amount: nil, tax_amount: nil, tip_amount: nil)

    return AddItemToOrderView(order: mockOrder)
        .environmentObject(orderManager)
        .environmentObject(SupabaseManager.shared)
}
#endif

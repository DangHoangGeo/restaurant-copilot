import SwiftUI

struct AddItemToOrderView: View {
    let order: Order

    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var supabaseManager: SupabaseManager
    @Environment(\.dismiss) var dismiss

    @StateObject private var coordinator = AddToOrderCoordinator()
    @State private var menuItems: [MenuItem] = []
    @State private var categories: [Category] = []
    @State private var isLoading = false
    @State private var searchText = ""
    @State private var selectedCategoryId: String? = nil
    @State private var showingCustomizeSheet = false
    @State private var itemToCustomize: MenuItem? = nil
    @State private var orderSummary: (itemsCount: Int, totalAmount: Double) = (0, 0.0)
    @State private var isSavingToDatabase = false
    @State private var showingCartSheet = false
    @State private var itemToEdit: OrderItem? = nil

    // Use a computed property for the local draft ID to ensure uniqueness
    private var localDraftOrderId: String {
        "add_items_\(order.id)"
    }
    
    // Filtered items based on search and category with multi-language support
    private var filteredItems: [MenuItem] {
        var items = menuItems
        
        // Filter by category
        if let categoryId = selectedCategoryId {
            items = items.filter { $0.category_id == categoryId }
        }
        
        // Multi-language search
        if !searchText.isEmpty {
            items = items.filter { item in
                // Search in all language names
                item.name_en.localizedCaseInsensitiveContains(searchText) ||
                (item.name_ja?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (item.name_vi?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                
                // Search in all language descriptions
                (item.description_en?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (item.description_ja?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (item.description_vi?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                
                // Search in code
                (item.code?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        
        return items.sorted { $0.displayName < $1.displayName }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Unified Search Header
            MenuSearchHeader(
                searchText: $searchText,
                selectedCategoryId: $selectedCategoryId,
                categories: categories,
                menuItems: menuItems,
                title: "add_items_title".localized,
                subtitle: "add_items_subtitle".localized
            )
            .padding()
            .background(Color.appSurfaceElevated)
            .shadow(color: Elevation.level2.color, radius: Elevation.level2.radius, x: 0, y: Elevation.level2.y)
            
            // Content Area
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
                        // Clicking the item line opens customization sheet
                        itemToCustomize = item
                        showingCustomizeSheet = true
                    },
                    onQuickAdd: { item in
                        // Clicking + button quick adds to cart
                        Task {
                            await coordinator.quickAddItem(item, to: localDraftOrderId)
                            await updateOrderSummary()
                        }
                    }
                )
            }
            
            // Floating Cart Button (appears when items are added)
            if orderSummary.itemsCount > 0 {
                VStack(spacing: 0) {
                    Divider()
                    OrderSummaryBar(
                        itemsCount: orderSummary.itemsCount,
                        totalAmount: orderSummary.totalAmount,
                        isVisible: true,
                        onTap: {
                            // Haptic feedback
                            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
                            impactFeedback.impactOccurred()
                            // Show cart sheet
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
            await initializeLocalDraft()
            await loadMenuData()
            await updateOrderSummary()
        }
        .sheet(item: $itemToCustomize) { menuItem in
            CustomizeMenuItemSheet(
                menuItem: menuItem,
                orderId: localDraftOrderId,
                coordinator: coordinator,
                onComplete: {
                    itemToCustomize = nil
                    showingCustomizeSheet = false
                    Task {
                        await updateOrderSummary()
                    }
                }
            )
        }
        .sheet(isPresented: $showingCartSheet) {
            if let localDraft = orderManager.localDraftOrders[localDraftOrderId] {
                CartSheet(
                    order: localDraft,
                    onDismiss: {
                        showingCartSheet = false
                    },
                    onConfirm: {
                        showingCartSheet = false
                        Task {
                            await saveLocalDraftToDatabase()
                        }
                    },
                    onEditItem: { item in
                        // Close cart and open customize sheet for editing
                        showingCartSheet = false
                        if let menuItem = item.menu_item {
                            itemToCustomize = menuItem
                            showingCustomizeSheet = true
                        }
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
            // Clean up local draft if user dismisses without saving
            if orderManager.localDraftOrders[localDraftOrderId] != nil {
                orderManager.localDraftOrders.removeValue(forKey: localDraftOrderId)
                print("🧹 Cleaned up unsaved local draft for order \(order.id)")
            }
        }
    }
    
    // MARK: - Local Draft Management

    @MainActor
    private func initializeLocalDraft() async {
        // Create a NEW empty local order for cart-like behavior
        // This prevents items from being immediately saved to the database
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
            order_items: [], // Start with empty cart
            payment_method: order.payment_method,
            discount_amount: order.discount_amount,
            tax_amount: order.tax_amount,
            tip_amount: order.tip_amount
        )

        // Store in local drafts
        orderManager.localDraftOrders[localDraftOrderId] = localOrder
        print("✅ Initialized empty local draft cart for adding items to order \(order.id)")
    }

    @MainActor
    private func saveLocalDraftToDatabase() async {
        guard !isSavingToDatabase else { return }

        isSavingToDatabase = true

        do {
            // Get the local draft order
            guard let localDraft = orderManager.localDraftOrders[localDraftOrderId],
                  let newItems = localDraft.order_items else {
                print("⚠️ No local draft or items found")
                dismiss()
                return
            }

            // Add each item from the local draft to the actual database order
            for item in newItems {
                guard let menuItem = item.menu_item else { continue }

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

            // Clean up local draft
            orderManager.localDraftOrders.removeValue(forKey: localDraftOrderId)

            print("✅ Saved \(newItems.count) items to database order \(order.id)")

            // Dismiss view to show updated order
            dismiss()

        } catch {
            print("❌ Error saving items to database: \(error)")
            coordinator.errorMessage = "add_items_error_save_failed".localized
            coordinator.showingErrorAlert = true
        }

        isSavingToDatabase = false
    }

    // MARK: - Data Loading

    @MainActor
    private func loadMenuData() async {
        isLoading = true
        
        do {
            guard supabaseManager.currentRestaurantId != nil else {
                coordinator.errorMessage = "add_items_error_no_restaurant".localized
                coordinator.showingErrorAlert = true
                isLoading = false
                return
            }
            
            // Load both categories and menu items
            async let categoriesTask = supabaseManager.fetchAllCategories()
            async let menuItemsTask = supabaseManager.fetchAllMenuItems()
            
            self.categories = try await categoriesTask
            self.menuItems = try await menuItemsTask
            
        } catch {
            print("Error loading menu data: \(error.localizedDescription)")
            coordinator.errorMessage = "add_items_error_load_failed".localized
            coordinator.showingErrorAlert = true
        }
        
        isLoading = false
    }
    
    // MARK: - Order Summary Updates

    @MainActor
    private func updateOrderSummary() async {
        orderSummary = await coordinator.getOrderSummary(for: localDraftOrderId)
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

    return AddItemToOrderView(order: mockOrder)
        .environmentObject(orderManager)
        .environmentObject(printerManager)
        .environmentObject(localizationManager)
        .environmentObject(SupabaseManager.shared)
}
#endif

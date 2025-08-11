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
                        Task {
                            await coordinator.handleAddItem(item, to: order.id) { menuItem in
                                itemToCustomize = menuItem
                                showingCustomizeSheet = true
                            }
                        }
                    },
                    onQuickAdd: { item in
                        Task {
                            await coordinator.quickAddItem(item, to: order.id)
                            await updateOrderSummary()
                        }
                    }
                )
            }
            
            // Order Summary Bar (appears when items are added)
            if orderSummary.itemsCount > 0 {
                VStack(spacing: 0) {
                    Divider()
                    OrderSummaryBar(
                        itemsCount: orderSummary.itemsCount,
                        totalAmount: orderSummary.totalAmount,
                        isVisible: true,
                        onTap: {
                            // Dismiss view to show updated order
                            dismiss()
                        }
                    )
                    .padding()
                    .background(Color.appSurfaceElevated)
                }
            }
        }
        .navigationTitle("add_items_title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadMenuData()
            await updateOrderSummary()
        }
        .sheet(item: $itemToCustomize) { menuItem in
            CustomizeMenuItemSheet(
                menuItem: menuItem,
                orderId: order.id,
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
        .alert("error".localized, isPresented: $coordinator.showingErrorAlert) {
            Button("ok".localized) {}
        } message: {
            Text(coordinator.errorMessage ?? "order_detail_generic_error_message".localized)
        }
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
        orderSummary = await coordinator.getOrderSummary(for: order.id)
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

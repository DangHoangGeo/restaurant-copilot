import SwiftUI

struct AddItemToOrderView: View {
    let order: Order
    
    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var supabaseManager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    
    @State private var menuItems: [MenuItem] = []
    @State private var categories: [Category] = []
    @State private var isLoading = false
    @State private var searchText = ""
    @State private var selectedCategoryId: String? = nil
    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert = false
    @State private var isAddingItem = false
    
    // Filtered items based on search and category
    private var filteredItems: [MenuItem] {
        var items = menuItems
        if let categoryId = selectedCategoryId {
            items = items.filter { $0.category_id == categoryId }
        }
        if !searchText.isEmpty {
            items = items.filter { item in
                item.displayName.localizedCaseInsensitiveContains(searchText) ||
                (item.displayDescription?.localizedCaseInsensitiveContains(searchText) ?? false) ||
                (item.code?.localizedCaseInsensitiveContains(searchText) ?? false)
            }
        }
        return items.sorted { $0.displayName < $1.displayName }
    }
    
    // Group items by category for headers
    private var groupedItems: [(category: Category?, items: [MenuItem])] {
        let items = filteredItems
        let map = Dictionary(grouping: items, by: { item in
            categories.first(where: { $0.id == item.category_id })
        })
        // Sort categories by their position if available, else by name
        let sortedKeys = map.keys.sorted { lhs, rhs in
            switch (lhs?.position, rhs?.position) {
            case let (l?, r?): return l < r
            case (_?, nil): return true
            case (nil, _?): return false
            default:
                let lName = lhs?.displayName ?? ""
                let rName = rhs?.displayName ?? ""
                return lName.localizedCompare(rName) == .orderedAscending
            }
        }
        return sortedKeys.map { key in (category: key, items: map[key] ?? []) }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Enhanced Sticky Search Header
            VStack(spacing: Spacing.md) {
                HStack {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("add_items_title".localized)
                            .font(.sectionHeader)
                            .fontWeight(.bold)
                            .foregroundColor(.appTextPrimary)
                        Text("add_items_subtitle".localized)
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                    }
                    Spacer()
                }
                
                // Enhanced search field with better styling
                HStack {
                    Image(systemName: "magnifyingglass")
                        .font(.subheadline)
                        .foregroundColor(.appTextTertiary)
                    
                    TextField("add_items_search_placeholder".localized, text: $searchText)
                        .font(.bodyMedium)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    
                    if !searchText.isEmpty {
                        Button(action: { searchText = "" }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.subheadline)
                                .foregroundColor(.appTextTertiary)
                        }
                    }
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .background(Color.appSurfaceSecondary)
                .cornerRadius(CornerRadius.md)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(Color.appBorderLight, lineWidth: 1)
                )
                
                // Enhanced Category Filter with better visual hierarchy
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.sm) {
                        FilterChip(
                            title: "add_items_all_categories".localized,
                            count: menuItems.count,
                            isSelected: selectedCategoryId == nil,
                            color: .appPrimary
                        ) { selectedCategoryId = nil }
                        
                        ForEach(categories) { category in
                            FilterChip(
                                title: category.displayName,
                                count: menuItems.filter { $0.category_id == category.id }.count,
                                isSelected: selectedCategoryId == category.id,
                                color: .appAccent
                            ) {
                                selectedCategoryId = selectedCategoryId == category.id ? nil : category.id
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding()
            .background(Color.appSurfaceElevated)
            .shadow(color: Elevation.level2.color, radius: Elevation.level2.radius, x: 0, y: Elevation.level2.y)
            
            // Enhanced Content Area
            if isLoading {
                VStack(spacing: Spacing.lg) {
                    ProgressView()
                        .scaleEffect(1.5)
                        .tint(.appPrimary)
                    Text("add_items_loading".localized)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.appBackground)
            } else if filteredItems.isEmpty {
                VStack(spacing: Spacing.lg) {
                    ZStack {
                        Circle()
                            .fill(Color.appSurfaceSecondary)
                            .frame(width: 80, height: 80)
                        Image(systemName: searchText.isEmpty ? "tray" : "magnifyingglass")
                            .font(.system(size: 32))
                            .foregroundColor(.appTextTertiary)
                    }
                    
                    VStack(spacing: Spacing.xs) {
                        if !searchText.isEmpty {
                            Text(String(format: "add_items_no_results_format".localized, searchText))
                                .font(.sectionHeader)
                                .fontWeight(.semibold)
                                .foregroundColor(.appTextPrimary)
                            Text("add_items_no_results_suggestion".localized)
                                .font(.bodyMedium)
                                .foregroundColor(.appTextSecondary)
                                .multilineTextAlignment(.center)
                        } else if selectedCategoryId != nil {
                            Text("add_items_no_items_in_category".localized)
                                .font(.sectionHeader)
                                .fontWeight(.semibold)
                                .foregroundColor(.appTextPrimary)
                        } else {
                            Text("add_items_no_items_available".localized)
                                .font(.sectionHeader)
                                .fontWeight(.semibold)
                                .foregroundColor(.appTextPrimary)
                        }
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color.appBackground)
            } else {
                ScrollView {
                    LazyVStack(spacing: Spacing.sm) {
                        ForEach(0..<groupedItems.count, id: \.self) { idx in
                            let group = groupedItems[idx]
                            
                            // Category header with better styling
                            if let category = group.category, !searchText.isEmpty == false {
                                HStack {
                                    Text(category.displayName)
                                        .font(.bodyMedium)
                                        .fontWeight(.bold)
                                        .foregroundColor(.appTextPrimary)
                                    
                                    Text("(\(group.items.count))")
                                        .font(.captionRegular)
                                        .foregroundColor(.appTextSecondary)
                                    
                                    Spacer()
                                }
                                .padding(.horizontal)
                                .padding(.top, idx == 0 ? Spacing.sm : Spacing.md)
                                .padding(.bottom, Spacing.xs)
                            }
                            
                            // Items in this category
                            ForEach(group.items) { item in
                                MenuItemRowCompact(menuItem: item) {
                                    Task { await addItemToOrder(item) }
                                }
                                .disabled(isAddingItem)
                                .padding(.horizontal)
                            }
                        }
                    }
                    .padding(.bottom, Spacing.lg)
                }
                .background(Color.appBackground)
            }
        }
        .navigationTitle("add_items_title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadMenuData()
        }
        .alert("error".localized, isPresented: $showingErrorAlert) {
            Button("ok".localized) {}
        } message: {
            Text(errorMessage ?? "order_detail_generic_error_message".localized)
        }
    }
    
    // MARK: - Data Loading
    
    @MainActor
    private func loadMenuData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            guard supabaseManager.currentRestaurantId != nil else {
                errorMessage = "add_items_error_no_restaurant".localized
                showingErrorAlert = true
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
            errorMessage = "add_items_error_load_failed".localized
            showingErrorAlert = true
        }
        
        isLoading = false
    }
    
    // MARK: - Add Item Actions
    
    @MainActor
    private func addItemToOrder(_ item: MenuItem) async {
        guard !isAddingItem else { return }
        
        isAddingItem = true
        errorMessage = nil
        
        do {
            let defaultSizeId = item.availableSizes?.first?.id
            let price = item.price
            
            _ = try await orderManager.addItemToDraftOrder(
                orderId: order.id,
                menuItemId: item.id,
                quantity: 1,
                notes: nil,
                selectedSizeId: defaultSizeId,
                selectedToppingIds: nil,
                priceAtOrder: price
            )
            
            print("✅ Added item \(item.displayName) to order \(order.id)")
            
        } catch {
            errorMessage = "add_items_error_add_failed".localized
            showingErrorAlert = true
        }
        
        isAddingItem = false
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

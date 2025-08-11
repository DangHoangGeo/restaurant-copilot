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
    
    var body: some View {
        VStack(spacing: 0) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                Text("add_items_title".localized)
                    .font(.title2)
                    .fontWeight(.semibold)
                
                let tableName = order.table?.name ?? "orders_unknown_table".localized
                let orderNumber = order.order_number ?? 0
                Text(String(format: "add_items_subtitle_format".localized, tableName, orderNumber))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color.appSurface)
            
            // Search and Filter
            VStack(spacing: 12) {
                TextField("add_items_search_placeholder".localized, text: $searchText)
                    .textFieldStyle(AppTextFieldStyle())
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                
                // Category Filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.sm) {
                        // All Categories button
                        Button(action: { selectedCategoryId = nil }) {
                            Text("add_items_all_categories".localized)
                        }
                        .modifier(FilterChipStyle(isSelected: selectedCategoryId == nil, color: .appPrimary))

                        ForEach(categories) { category in
                            Button(action: {
                                selectedCategoryId = selectedCategoryId == category.id ? nil : category.id
                            }) {
                                Text(category.displayName)
                            }
                            .modifier(FilterChipStyle(isSelected: selectedCategoryId == category.id, color: .appPrimary))
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding()
            
            // Menu Items List
            if isLoading {
                VStack(spacing: Spacing.md) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("add_items_loading".localized)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredItems.isEmpty {
                VStack(spacing: Spacing.md) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 50))
                        .foregroundColor(.appTextSecondary)
                    
                    if !searchText.isEmpty {
                        Text(String(format: "add_items_no_results_format".localized, searchText))
                            .font(.sectionHeader)
                        Text("add_items_no_results_suggestion".localized)
                            .font(.bodyMedium)
                            .foregroundColor(.appTextSecondary)
                    } else if selectedCategoryId != nil {
                        Text("add_items_no_items_in_category".localized)
                            .font(.sectionHeader)
                    } else {
                        Text("add_items_no_items_available".localized)
                            .font(.sectionHeader)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(filteredItems) { item in
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.displayName)
                                    .font(.headline)
                                
                                if let description = item.displayDescription, !description.isEmpty {
                                    Text(description)
                                        .font(.bodyMedium)
                                        .foregroundColor(.appTextSecondary)
                                        .lineLimit(2)
                                }
                                
                                Text(String(format: "price_format".localized, item.price))
                                    .font(.bodyMedium)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.appPrimary)
                            }
                            
                            Spacer()
                            
                            Button {
                                Task { await addItemToOrder(item) }
                            } label: {
                                Image(systemName: "plus.circle.fill")
                            }
                            .buttonStyle(IconButtonStyle())
                            .disabled(isAddingItem)
                        }
                        .padding(.vertical, Spacing.sm)
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                }
                .listStyle(PlainListStyle())
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

import SwiftUI

struct MenuSelectionView: View {
    let orderId: String
    let table: Table
    let onOrderConfirmed: (() -> Void)?

    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var supabaseManager: SupabaseManager
    @Environment(\.horizontalSizeClass) var horizontalSizeClass

    @State private var menuItems: [MenuItem] = []
    @State private var categories: [Category] = []
    @State private var isLoading = false
    @State private var draftOrderItemsCount: Int = 0
    @State private var searchText = ""
    @State private var selectedCategoryId: String? = nil

    // For navigation
    @State private var selectedMenuItem: MenuItem? = nil
    @State private var showingDraftOrder = false
    @State private var showBottomSheet = false // For iPhone
    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert: Bool = false
    @State private var isAddingItem: Bool = false
    @State private var showCustomizeSheet: Bool = false
    @State private var itemToCustomize: MenuItem? = nil
    @State private var draftOrder: Order? = nil

    // Enhanced filtered items with multi-language search support
    private var filteredItems: [MenuItem] {
        var items = menuItems
        
        // Filter by category
        if let categoryId = selectedCategoryId {
            items = items.filter { $0.category_id == categoryId }
        }
        
        // Multi-language search across names, descriptions, and code
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
        GeometryReader { geometry in
            if horizontalSizeClass == .regular {
                // iPad: Two-column layout
                HStack(spacing: 0) {
                    menuListView
                        .frame(width: geometry.size.width * 0.6)
                        .background(Color.appSurface)
                    Divider()
                    VStack(spacing: 0) {
                        DraftOrderView(orderId: orderId, table: table, onOrderConfirmed: onOrderConfirmed)
                            .environmentObject(orderManager)
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                    }
                    .frame(width: geometry.size.width * 0.4)
                    .background(Color.appSurface)
                }
            } else {
                // iPhone: Menu with draggable cart
                ZStack(alignment: .bottom) {
                    menuListView
                    DraggableCartSheet(
                        isPresented: $showBottomSheet,
                        content: {
                            DraftOrderView(orderId: orderId, table: table, onOrderConfirmed: onOrderConfirmed)
                                .environmentObject(orderManager)
                        },
                        minHeight: 64,
                        maxHeight: geometry.size.height * 0.85
                    )
                    .accessibilityLabel("cart_panel_accessibility_label".localized)
                }
            }
        }
        .navigationTitle("table_title_prefix".localized + table.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    showBottomSheet = true
                }) {
                    HStack {
                        Image(systemName: "cart")
                        if draftOrderItemsCount > 0 {
                            Text("\(draftOrderItemsCount)")
                                .font(.caption2)
                                .padding(4)
                                .background(Color.appPrimary)
                                .clipShape(Circle())
                                .foregroundColor(.white)
                        }
                    }
                }
                .accessibilityLabel(draftOrderItemsCount > 0 ? "view_cart_items_accessibility_label".localized + "\(draftOrderItemsCount)" : "view_cart_empty_accessibility_label".localized)
            }
        }
        .task {
            await loadInitialData()
        }
        .sheet(item: $itemToCustomize) { menuItem in
            CustomizeMenuItemSheet(
                menuItem: menuItem,
                orderId: orderId,
                coordinator: AddToOrderCoordinator(),
                onComplete: {
                    itemToCustomize = nil
                    Task {
                        await updateDraftOrderSummary()
                    }
                }
            )
        }
        .alert("error_alert_title".localized, isPresented: $showingErrorAlert) {
            Button("ok_button_title".localized) {}
        } message: {
            Text(errorMessage ?? "error_alert_default_message".localized)
        }
        .onAppear {
            // No need to ensure draft order exists for new orders - it's created locally
            Task {
                await updateDraftOrderSummary()
            }
        }
    }

    // MARK: - Menu List View
    private var menuListView: some View {
        VStack(spacing: 0) {
            // Unified Search Header
            MenuSearchHeader(
                searchText: $searchText,
                selectedCategoryId: $selectedCategoryId,
                categories: categories,
                menuItems: menuItems,
                title: "pos_menu_title".localized,
                subtitle: "pos_menu_subtitle".localized
            )
            .padding()
            .background(Color.appBackground)
            
            // Unified Menu Items List
            if isLoading {
                VStack(spacing: Spacing.lg) {
                    ProgressView()
                        .scaleEffect(1.2)
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
                    isAddingItem: isAddingItem,
                    onItemTap: { item in
                        // For new orders, show customization if available
                        if hasCustomizationOptions(item) {
                            itemToCustomize = item
                        } else {
                            Task { await addItemQuick(item) }
                        }
                    },
                    onQuickAdd: { item in
                        Task { await addItemQuick(item) }
                    },
                    onCustomize: { item in
                        itemToCustomize = item
                    }
                )
            }
        }
        .background(Color.appSurface)
    }
    
    // Helper to check if item has customization options
    private func hasCustomizationOptions(_ item: MenuItem) -> Bool {
        return (item.availableSizes?.isEmpty == false) || (item.availableToppings?.isEmpty == false)
    }

    // MARK: - Add Item Quick
    private func addItemQuick(_ item: MenuItem) async {
        isAddingItem = true
        do {
            let defaultSizeId = item.availableSizes?.first?.id
            let defaultToppingIds: [ToppingId]? = nil
            let price = item.price
            
            // Check if this is a local draft order or existing database order
            if orderManager.localDraftOrders[orderId] != nil {
                // Local draft order - use local method
                _ = try await orderManager.addItemToLocalDraftOrder(
                    orderId: orderId,
                    menuItemId: item.id,
                    quantity: 1,
                    notes: nil,
                    selectedSizeId: defaultSizeId,
                    selectedToppingIds: defaultToppingIds,
                    priceAtOrder: price,
                    menuItem: item
                )
            } else {
                // Existing database order - use database method
                _ = try await orderManager.addItemToDraftOrder(
                    orderId: orderId,
                    menuItemId: item.id,
                    quantity: 1,
                    notes: nil,
                    selectedSizeId: defaultSizeId,
                    selectedToppingIds: defaultToppingIds,
                    priceAtOrder: price
                )
            }
            
            await updateDraftOrderSummary()
        } catch {
            errorMessage = error.localizedDescription
            showingErrorAlert = true
        }
        isAddingItem = false
    }

    @MainActor
    private func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        do {
            guard supabaseManager.currentRestaurantId != nil else {
                self.errorMessage = "Restaurant not identified."
                self.showingErrorAlert = true
                self.isLoading = false
                return
            }
            
            // Load both categories and all menu items
            async let categoriesTask = supabaseManager.fetchAllCategories()
            async let menuItemsTask = supabaseManager.fetchAllMenuItems()
            
            self.categories = try await categoriesTask
            self.menuItems = try await menuItemsTask
            
        } catch {
            print("Error loading menu data: \(error.localizedDescription)")
            self.errorMessage = "Failed to load menu: \(error.localizedDescription)"
            self.showingErrorAlert = true
        }

        await updateDraftOrderSummary()
        isLoading = false
    }


    @MainActor
    private func updateDraftOrderSummary() async {
        do {
            if let draftOrder = try await orderManager.getDraftOrder(orderId: self.orderId) {
                self.draftOrderItemsCount = draftOrder.order_items?.count ?? 0
            } else {
                self.draftOrderItemsCount = 0
            }
        } catch {
            print("Error fetching draft order summary: \(error.localizedDescription)")
            self.draftOrderItemsCount = 0
        }
    }
}

// MARK: - Supporting Views

struct MenuItemRowView: View {
    let item: MenuItem
    let onAdd: () -> Void
    let onCustomize: () -> Void

    var body: some View {
        HStack(spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(item.displayName)
                    .font(.cardTitle)
                if let description = item.displayDescription, !description.isEmpty {
                    Text(description)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                        .lineLimit(2)
                }
                Text(String(format: "%.0f円", item.price))
                    .font(.sectionHeader)
                    .foregroundColor(.appPrimary)
            }
            Spacer()
            Button(action: onAdd) {
                Image(systemName: "plus")
            }
            .buttonStyle(IconButtonStyle())
            .accessibilityLabel("add_item_to_order_accessibility_label".localized + item.displayName)
            Button(action: onCustomize) {
                Image(systemName: "slider.horizontal.3")
            }
            .buttonStyle(IconButtonStyle())
            .accessibilityLabel("customize_item_accessibility_label".localized + item.displayName)
        }
        .cardStyle()
    }
}

struct CategoryFilterButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
        }
        .filterChipStyle(isSelected: isSelected)
    }
}

// MARK: - DraggableCartSheet (iPhone only)
struct DraggableCartSheet<Content: View>: View {
    @Binding var isPresented: Bool
    let content: () -> Content
    let minHeight: CGFloat
    let maxHeight: CGFloat
    @GestureState private var dragOffset = CGSize.zero
    @State private var currentHeight: CGFloat = 0

    var body: some View {
        if isPresented {
            VStack {
                Spacer()
                VStack {
                    Capsule()
                        .frame(width: 40, height: 6)
                        .foregroundColor(.gray.opacity(0.3))
                        .padding(.top, 8)
                    content()
                        .frame(maxHeight: maxHeight)
                }
                .background(Color.appSurface)
                .cornerRadius(16)
                .shadow(radius: 8)
                .offset(y: dragOffset.height > 0 ? dragOffset.height : 0)
                .gesture(
                    DragGesture()
                        .updating($dragOffset) { value, state, _ in
                            state = value.translation
                        }
                        .onEnded { value in
                            if value.translation.height > 100 {
                                isPresented = false
                            }
                        }
                )
                .transition(.move(edge: .bottom))
                .animation(.spring(), value: isPresented)
            }
            .edgesIgnoringSafeArea(.bottom)
        }
    }
}


// MARK: - Preview

struct MenuSelectionView_Previews: PreviewProvider {
    static var previews: some View {
        let mockSupabaseManager = SupabaseManager.shared
        let mockTable = Table(
            id: "previewTable",
            restaurant_id: "previewResto",
            name: "A1",
            status: .available,
            capacity: 4,
            is_outdoor: false,
            is_accessible: true,
            notes: nil,
            qr_code: nil,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        let mockOrderId = "previewOrder"

        NavigationStack {
            MenuSelectionView(orderId: mockOrderId, table: mockTable, onOrderConfirmed: nil)
                .environmentObject(OrderManager.shared)
                .environmentObject(mockSupabaseManager)
        }
    }
}

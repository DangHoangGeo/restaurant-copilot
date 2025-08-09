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
            CustomizeMenuItemSheet(menuItemId: menuItem.id, orderId: orderId, table: table)
                .environmentObject(orderManager)
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
            // Search and Filter Bar
            VStack(spacing: 12) {
                TextField("Search by name or code...", text: $searchText)
                    .textFieldStyle(AppTextFieldStyle())
                    .autocapitalization(.none)
                    .disableAutocorrection(true)

                // Category Filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        // All Categories button
                        CategoryFilterButton(
                            title: "All",
                            isSelected: selectedCategoryId == nil
                        ) {
                            selectedCategoryId = nil
                        }
                        
                        ForEach(categories) { category in
                            CategoryFilterButton(
                                title: category.displayName,
                                isSelected: selectedCategoryId == category.id
                            ) {
                                selectedCategoryId = selectedCategoryId == category.id ? nil : category.id
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding()
            .background(Color.appBackground)
            
            // Menu Items List
            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("loading_menu_items_text".localized)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredItems.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 50))
                        .foregroundColor(Color.appPrimary.opacity(0.6))
                    
                    if !searchText.isEmpty {
                        Text("no_items_found_for_search_text".localized + "'\(searchText)'")
                            .font(.title3)
                            .fontWeight(.medium)
                        Text("try_different_search_term_text".localized)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else if selectedCategoryId != nil {
                        Text("no_items_in_category_text".localized)
                            .font(.title3)
                            .fontWeight(.medium)
                    } else {
                        Text("no_menu_items_available_text".localized)
                            .font(.title3)
                            .fontWeight(.medium)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    // Use LazyVStack for menu items list for performance and design system compliance
                    LazyVStack(spacing: 8) {
                        ForEach(filteredItems) { item in
                            MenuItemRowView(
                                item: item,
                                onAdd: { Task { await addItemQuick(item) } },
                                onCustomize: { itemToCustomize = item }
                            )
                            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                            .listRowSeparator(.hidden)
                            .listRowBackground(Color.clear)
                        }
                    }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
            }
        }
        .background(Color.appSurface)
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

// MARK: - New sheet view for customization
struct CustomizeMenuItemSheet: View {
    let menuItemId: String
    let orderId: String
    let table: Table
    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var supabaseManager: SupabaseManager
    @Environment(\.dismiss) var dismiss
    @State private var menuItem: MenuItem? = nil
    @State private var isLoading: Bool = true
    @State private var errorMessage: String? = nil
    @State private var selectedSize: MenuItemSize? = nil
    @State private var selectedToppings: Set<ToppingId> = Set()
    @State private var quantity: Int = 1
    @State private var notes: String = ""
    @State private var isAddingItem = false
    @State private var showingErrorAlert = false

    var priceForOneItemWithOptions: Double {
        guard let menuItem = menuItem else { return 0 }
        var currentItemPrice = menuItem.price
        if let size = selectedSize {
            currentItemPrice += size.price
        }
        for toppingId in selectedToppings {
            if let topping = menuItem.availableToppings?.first(where: { $0.id == toppingId }) {
                currentItemPrice += topping.price
            }
        }
        return currentItemPrice
    }

    var currentLineItemTotalPrice: Double {
        priceForOneItemWithOptions * Double(quantity)
    }

    var body: some View {
        NavigationView {
            if isLoading {
                ProgressView("loading_menu_item_details_text".localized)
            } else if let menuItem = menuItem {
                Form {
                    if let sizes = menuItem.availableSizes, !sizes.isEmpty {
                        Section(header: Text("size_section_title".localized)) {
                            Picker("size_picker_label".localized, selection: $selectedSize) {
                                ForEach(sizes) { size in
                                    Text(size.displayName).tag(Optional(size))
                                }
                            }
                            .pickerStyle(.segmented)
                        }
                    }
                    if let toppings = menuItem.availableToppings, !toppings.isEmpty {
                        Section(header: Text("toppings_section_title".localized)) {
                            ForEach(toppings) { topping in
                                Toggle(isOn: Binding(
                                    get: { selectedToppings.contains(topping.id) },
                                    set: { checked in
                                        if checked { selectedToppings.insert(topping.id) } else { selectedToppings.remove(topping.id) }
                                    }
                                )) {
                                    Text(topping.displayName)
                                }
                            }
                        }
                    }
                    Section(header: Text("quantity_section_title".localized)) {
                        Stepper(value: $quantity, in: 1...99) {
                            Text("quantity_label".localized + ": \(quantity)")
                        }
                    }
                    Section(header: Text("notes_section_title".localized)) {
                        TextField("notes_placeholder".localized, text: $notes)
                    }
                    Section(header: Text("total_price_section_title".localized)) {
                        Text(String(format: "%.0f円", currentLineItemTotalPrice))
                            .font(.title3)
                            .fontWeight(.bold)
                    }
                    Section {
                        Button(action: { Task { await addItemToOrder(menuItem) } }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("add_to_order_button_title".localized)
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(isAddingItem)
                        .accessibilityLabel("add_to_order_accessibility_label".localized)
                    }
                }
            } else {
                Text("error_loading_menu_item_details_text".localized)
            }
        }
        .onAppear {
            Task { await loadMenuItemDetails() }
        }
        .alert("error_alert_title".localized, isPresented: $showingErrorAlert) {
            Button("ok_button_title".localized) {}
        } message: {
            Text(errorMessage ?? "error_alert_default_message".localized)
        }
    }

    private func loadMenuItemDetails() async {
        isLoading = true
        do {
            menuItem = try await supabaseManager.fetchMenuItemDetails(menuItemId: menuItemId)
        } catch {
            errorMessage = error.localizedDescription
            showingErrorAlert = true
        }
        isLoading = false
    }

    private func addItemToOrder(_ menuItem: MenuItem) async {
        isAddingItem = true
        do {
            let sizeId = selectedSize?.id
            let toppingIds = Array(selectedToppings)
            let price = priceForOneItemWithOptions
            
            // Check if this is a local draft order or existing database order
            if orderManager.localDraftOrders[orderId] != nil {
                // Local draft order - use local method
                _ = try await orderManager.addItemToLocalDraftOrder(
                    orderId: orderId,
                    menuItemId: menuItem.id,
                    quantity: quantity,
                    notes: notes.isEmpty ? nil : notes,
                    selectedSizeId: sizeId,
                    selectedToppingIds: toppingIds.isEmpty ? nil : toppingIds,
                    priceAtOrder: price,
                    menuItem: menuItem
                )
            } else {
                // Existing database order - use database method
                _ = try await orderManager.addItemToDraftOrder(
                    orderId: orderId,
                    menuItemId: menuItem.id,
                    quantity: quantity,
                    notes: notes.isEmpty ? nil : notes,
                    selectedSizeId: sizeId,
                    selectedToppingIds: toppingIds.isEmpty ? nil : toppingIds,
                    priceAtOrder: price
                )
            }
            
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            showingErrorAlert = true
        }
        isAddingItem = false
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

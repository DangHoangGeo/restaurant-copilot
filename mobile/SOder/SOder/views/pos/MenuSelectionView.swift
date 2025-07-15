import SwiftUI

struct MenuSelectionView: View {
    let orderId: String
    let table: Table
    let onOrderConfirmed: (() -> Void)?

    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var supabaseManager: SupabaseManager

    @State private var menuItems: [MenuItem] = []
    @State private var categories: [Category] = []
    @State private var isLoading = false
    @State private var draftOrderItemsCount: Int = 0
    @State private var searchText = ""
    @State private var selectedCategoryId: String? = nil

    // For navigation
    @State private var selectedMenuItem: MenuItem? = nil
    @State private var showingDraftOrder = false

    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert: Bool = false

    // Filtered items based on search and category
    private var filteredItems: [MenuItem] {
        var items = menuItems
        
        // Filter by category if selected
        if let categoryId = selectedCategoryId {
            items = items.filter { $0.category_id == categoryId }
        }
        
        // Filter by search text
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
            // Search and Filter Bar
            VStack(spacing: 12) {
                // Search Bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    
                    TextField("Search by name or code...", text: $searchText)
                        .textFieldStyle(PlainTextFieldStyle())
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                    
                    if !searchText.isEmpty {
                        Button("Clear") {
                            searchText = ""
                        }
                        .foregroundColor(.blue)
                        .font(.caption)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color(.systemGray6))
                .cornerRadius(10)
                
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
            .background(Color(.systemGroupedBackground))
            
            // Menu Items List
            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("Loading menu items...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredItems.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 50))
                        .foregroundColor(.gray.opacity(0.6))
                    
                    if !searchText.isEmpty {
                        Text("No items found for '\(searchText)'")
                            .font(.title3)
                            .fontWeight(.medium)
                        Text("Try a different search term")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    } else if selectedCategoryId != nil {
                        Text("No items in this category")
                            .font(.title3)
                            .fontWeight(.medium)
                    } else {
                        Text("No menu items available")
                            .font(.title3)
                            .fontWeight(.medium)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(filteredItems) { item in
                        MenuItemRowView(item: item) {
                            selectedMenuItem = item
                        }
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
            }
        }
        .navigationTitle("Table \(table.name)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    showingDraftOrder = true
                }) {
                    HStack {
                        Image(systemName: "cart")
                        if draftOrderItemsCount > 0 {
                            Text("\(draftOrderItemsCount)")
                                .font(.caption2)
                                .padding(4)
                                .background(Color.red)
                                .clipShape(Circle())
                                .foregroundColor(.white)
                        }
                    }
                }
                .accessibilityLabel(draftOrderItemsCount > 0 ? "View cart, \(draftOrderItemsCount) items" : "View cart, empty")
            }
        }
        .task {
            await loadInitialData()
        }
        .navigationDestination(item: $selectedMenuItem) { menuItem in
            AddItemDetailView(menuItem: menuItem, orderId: orderId, table: table)
                .environmentObject(orderManager)
        }
        .sheet(isPresented: $showingDraftOrder) {
            NavigationStack {
                DraftOrderView(orderId: orderId, table: table, onOrderConfirmed: onOrderConfirmed)
                    .environmentObject(orderManager)
            }
        }
        .alert("Error", isPresented: $showingErrorAlert) {
            Button("OK") {}
        } message: {
            Text(errorMessage ?? "An unknown error occurred.")
        }
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
    let onTap: () -> Void
    
    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(item.displayName)
                        .font(.headline)
                        .fontWeight(.semibold)
                    
                    Spacer()
                    
                    if let code = item.code, !code.isEmpty {
                        Text("#\(code)")
                            .font(.caption)
                            .fontWeight(.medium)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(4)
                    }
                }
                
                if let description = item.displayDescription, !description.isEmpty {
                    Text(description)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                HStack {
                    Text("¥\(String(format: "%.0f", item.price))")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.primary)
                    
                    Spacer()
                    
                    // Category badge
                    let categoryName = item.categoryDisplayName
                    if !categoryName.isEmpty && categoryName != item.category_id {
                        Text(categoryName)
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color.orange.opacity(0.1))
                            .foregroundColor(.orange)
                            .cornerRadius(4)
                    }
                }
            }
            
            Button(action: onTap) {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundColor(.blue)
            }
            .buttonStyle(BorderlessButtonStyle())
            .accessibilityLabel("Add \(item.displayName) to order")
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
}

struct CategoryFilterButton: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline)
                .fontWeight(.medium)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(isSelected ? Color.blue : Color(.systemGray6))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(8)
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

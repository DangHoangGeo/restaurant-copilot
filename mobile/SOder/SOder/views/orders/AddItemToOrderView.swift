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
                Text("Add Items to Order")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("Table: \(order.table?.name ?? "Unknown") • Order #\(order.order_number ?? 0)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color.gray.opacity(0.1))
            
            // Search and Filter
            VStack(spacing: 12) {
                TextField("Search menu items...", text: $searchText)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                
                // Category Filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        // All Categories button
                        Button("All") {
                            selectedCategoryId = nil
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 6)
                        .background(selectedCategoryId == nil ? Color.blue : Color.gray.opacity(0.2))
                        .foregroundColor(selectedCategoryId == nil ? .white : .primary)
                        .cornerRadius(8)
                        
                        ForEach(categories) { category in
                            Button(category.displayName) {
                                selectedCategoryId = selectedCategoryId == category.id ? nil : category.id
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(selectedCategoryId == category.id ? Color.blue : Color.gray.opacity(0.2))
                            .foregroundColor(selectedCategoryId == category.id ? .white : .primary)
                            .cornerRadius(8)
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding()
            
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
                        .foregroundColor(.gray)
                    
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
                        HStack(spacing: 12) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.displayName)
                                    .font(.headline)
                                
                                if let description = item.displayDescription, !description.isEmpty {
                                    Text(description)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                        .lineLimit(2)
                                }
                                
                                Text(String(format: "%.0f円", item.price))
                                    .font(.subheadline)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.blue)
                            }
                            
                            Spacer()
                            
                            Button {
                                Task { await addItemToOrder(item) }
                            } label: {
                                Image(systemName: "plus")
                                    .font(.title3)
                            }
                            .buttonStyle(.borderedProminent)
                            .controlSize(.small)
                            .disabled(isAddingItem)
                        }
                        .padding(.vertical, 8)
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                    }
                }
                .listStyle(PlainListStyle())
            }
        }
        .navigationTitle("Add Items")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadMenuData()
        }
        .alert("Error", isPresented: $showingErrorAlert) {
            Button("OK") {}
        } message: {
            Text(errorMessage ?? "An error occurred")
        }
    }
    
    // MARK: - Data Loading
    
    @MainActor
    private func loadMenuData() async {
        isLoading = true
        errorMessage = nil
        
        do {
            guard supabaseManager.currentRestaurantId != nil else {
                errorMessage = "Restaurant not identified"
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
            errorMessage = "Failed to load menu: \(error.localizedDescription)"
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
            errorMessage = "Failed to add item: \(error.localizedDescription)"
            showingErrorAlert = true
        }
        
        isAddingItem = false
    }
}
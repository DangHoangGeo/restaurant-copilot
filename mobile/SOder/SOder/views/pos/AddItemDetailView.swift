import SwiftUI

// Local stubs for MenuItem, MenuItemSizeMock, ToppingMock, TableStub, CategoryStub removed.
// This view will now use canonical models from Models.swift.
// MenuItem passed in is expected to have availableSizes and availableToppings populated.

struct AddItemDetailView: View {
    let menuItem: MenuItem // Canonical MenuItem model
    let orderId: String
    let table: Table     // Canonical Table model

    @EnvironmentObject var orderManager: OrderManager
    @Environment(\.dismiss) var dismiss

    @State private var quantity: Int = 1
    @State private var selectedSize: MenuItemSize? = nil // Canonical MenuItemSize
    @State private var selectedToppings: Set<Topping.ID> = Set() // Set of canonical Topping IDs
    @State private var notes: String = ""

    @State private var isAddingItem = false
    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert = false

    // Calculate price for ONE item with selected options
    var priceForOneItemWithOptions: Double {
        var currentItemPrice = menuItem.price
        if let size = selectedSize {
            currentItemPrice += size.price_modifier // Canonical MenuItemSize has price_modifier
        }
        for toppingId in selectedToppings {
            if let topping = menuItem.availableToppings?.first(where: { $0.id == toppingId }) {
                currentItemPrice += topping.price // Canonical Topping has price
            }
        }
        return currentItemPrice
    }

    // Calculate total price for the line (item price with options * quantity)
    var currentLineItemTotalPrice: Double {
        return priceForOneItemWithOptions * Double(quantity)
    }

    var body: some View {
        NavigationView { // Or NavigationStack for iOS 16+
            Form {
                Section(header: Text("Item Details")) {
                    Text(menuItem.displayName)
                        .font(.title2)
                        .fontWeight(.bold)
                    if let description = menuItem.displayDescription, !description.isEmpty {
                        Text(description)
                            .font(.body)
                            .foregroundColor(.gray)
                    }
                    Text("Base Price: \(String(format: "%.0f", menuItem.price))円") // Adapt currency
                }

                Section(header: Text("Quantity")) {
                    Stepper("Quantity: \(quantity)", value: $quantity, in: 1...20)
                        .accessibilityLabel("Quantity")
                        .accessibilityValue("\(quantity)")
                }

                // Size Selection
                if let availableSizes = menuItem.availableSizes, !availableSizes.isEmpty {
                    Section(header: Text("Size")) {
                        Picker("Select Size", selection: $selectedSize) {
                            Text("Standard").tag(MenuItemSize?.none) // Represents no specific size or default
                            ForEach(availableSizes) { size in
                                HStack {
                                    Text(size.displayName) // Use displayName from canonical model
                                    Spacer()
                                    Text(String(format: "%+.0f円", size.price_modifier))
                                }.tag(MenuItemSize?.some(size))
                            }
                        }
                        .pickerStyle(.menu)
                        .onAppear {
                            if selectedSize == nil && !availableSizes.isEmpty {
                                // Default to the size with no price modification, or the first one.
                                selectedSize = availableSizes.first(where: { $0.price_modifier == 0 }) ?? availableSizes.first
                            }
                        }
                    }
                }

                // Topping Selection
                if let availableToppings = menuItem.availableToppings, !availableToppings.isEmpty {
                    Section(header: Text("Toppings (\(selectedToppings.count))")) {
                        List {
                            ForEach(availableToppings) { topping in
                                Button(action: {
                                    toggleToppingSelection(topping)
                                }) {
                                    HStack {
                                        Text(topping.displayName) // Use displayName from canonical model
                                        Spacer()
                                        Text(String(format: "+%.0f円", topping.price))
                                        if selectedToppings.contains(topping.id) {
                                            Image(systemName: "checkmark.circle.fill")
                                                .foregroundColor(.blue)
                                        } else {
                                            Image(systemName: "circle")
                                                .foregroundColor(.gray)
                                        }
                                    }
                                }
                                .foregroundColor(.primary)
                            }
                        }
                    }
                }

                Section(header: Text("Notes for Kitchen")) {
                    TextEditor(text: $notes)
                        .frame(height: 100)
                        .border(Color.gray.opacity(0.2), width: 1)
                        .accessibilityLabel("Notes for kitchen")
                }

                Section(header: Text("Total Price for This Item Line")) {
                    Text(String(format: "%.0f円", currentLineItemTotalPrice))
                        .font(.title3)
                        .fontWeight(.bold)
                }

                Section {
                    Button(action: addItemToOrder) {
                        HStack {
                            Spacer()
                            if isAddingItem {
                                ProgressView()
                                    .padding(.trailing, 4)
                                Text("Adding...")
                            } else {
                                Image(systemName: "cart.badge.plus")
                                Text("Add to Order")
                            }
                            Spacer()
                        }
                        .font(.headline)
                    }
                    .disabled(isAddingItem)
                    .padding(.vertical, 8)
                }
            }
            .navigationTitle("Customize Item")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { // Alternative to Add to Order button, or could be the same
                        addItemToOrder()
                    }
                    .disabled(isAddingItem)
                }
            }
            .alert("Error", isPresented: $showingErrorAlert) {
                Button("OK") {}
            } message: {
                Text(errorMessage ?? "An unknown error occurred while adding the item.")
            }
        }
    }

    private func toggleToppingSelection(_ topping: Topping) { // Parameter is now canonical Topping
        if selectedToppings.contains(topping.id) {
            selectedToppings.remove(topping.id)
        } else {
            selectedToppings.insert(topping.id)
        }
    }

    private func addItemToOrder() {
        guard !isAddingItem else { return }
        isAddingItem = true
        errorMessage = nil

        let singleItemPriceWithOptions = priceForOneItemWithOptions // Calculated price for one item with options

        Task {
            do {
                // OrderManager.addItemToDraftOrder will use this price directly.
                // It expects MenuItemSizeId (String?) and [ToppingId] ([String]?)
                let sizeId = selectedSize?.id
                let toppingIdsArray = Array(selectedToppings)

                _ = try await orderManager.addItemToDraftOrder(
                    orderId: orderId,
                    menuItemId: menuItem.id,
                    quantity: quantity,
                    notes: notes.isEmpty ? nil : notes,
                    selectedSizeId: sizeId, // Pass ID of canonical MenuItemSize
                    selectedToppingIds: toppingIdsArray, // Pass array of canonical Topping IDs
                    priceAtOrder: singleItemPriceWithOptions // Pass the calculated unit price
                )

                // Success
                await MainActor.run {
                    isAddingItem = false
                    dismiss() // Dismiss the view on success
                }
            } catch {
                // Error
                await MainActor.run {
                    print("Error adding item to order: \(error.localizedDescription)")
                    self.errorMessage = "Failed to add item: \(error.localizedDescription)"
                    self.showingErrorAlert = true
                    self.isAddingItem = false
                }
            }
        }
    }
}

struct AddItemDetailView_Previews: PreviewProvider {
    static var previews: some View {
        let mockOrderManager = OrderManager()
        let mockSupabaseManager = SupabaseManager.shared // For any implicit dependencies if models use it

        // Create a mock canonical Table for the preview
        let mockTable = Table(
            id: "tablePrev1", restaurant_id: "restoPrev", name: "Preview Table", status: .available,
            capacity: 4, is_outdoor: false, is_accessible: true, notes: nil, qr_code: nil,
            created_at: "", updated_at: ""
        )

        // Create mock canonical MenuItemSize and Topping instances for the preview
        let mockSizes: [MenuItemSize] = [
            MenuItemSize(id: "s_small", restaurant_id: "r1", menu_item_id: "mi1", size_key: "S", name_en: "Small", name_ja: nil, name_vi: nil, price_modifier: -50, position: 1, created_at: "", updated_at: ""),
            MenuItemSize(id: "s_medium", restaurant_id: "r1", menu_item_id: "mi1", size_key: "M", name_en: "Medium", name_ja: nil, name_vi: nil, price_modifier: 0, position: 2, created_at: "", updated_at: ""),
            MenuItemSize(id: "s_large", restaurant_id: "r1", menu_item_id: "mi1", size_key: "L", name_en: "Large", name_ja: nil, name_vi: nil, price_modifier: 100, position: 3, created_at: "", updated_at: "")
        ]
        let mockToppings: [Topping] = [
            Topping(id: "t_cheese", restaurant_id: "r1", name_en: "Extra Cheese", name_ja: nil, name_vi: nil, price: 100, position: 1, created_at: "", updated_at: ""),
            Topping(id: "t_avocado", restaurant_id: "r1", name_en: "Avocado", name_ja: nil, name_vi: nil, price: 150, position: 2, created_at: "", updated_at: "")
        ]

        // Create a mock canonical MenuItem with options for the preview
        let mockMenuItemWithOptions = MenuItem(
            id: "item_options_canonical", category_id: "cat1_canonical", name_en: "Customizable Pizza (Live)",
            name_ja: nil, name_vi: nil, code: nil,
            description_en: "Choose your size and toppings for this delicious live pizza.",
            description_ja: nil, description_vi: nil,
            price: 1200, tags: nil, image_url: nil, stock_level: nil, available: true, position: nil,
            created_at: "", updated_at: "", category: nil,
            availableSizes: mockSizes,
            availableToppings: mockToppings
        )

        let mockMenuItemPlain = MenuItem(
            id: "item_plain_canonical", category_id: "cat1_canonical", name_en: "Plain Burger (Live)",
            name_ja: nil, name_vi: nil, code: nil,
            description_en: "A simple live burger.",
            description_ja: nil, description_vi: nil,
            price: 800, tags: nil, image_url: nil, stock_level: nil, available: true, position: nil,
            created_at: "", updated_at: "", category: nil,
            availableSizes: [], // No sizes
            availableToppings: [] // No toppings
        )

        return Group {
            AddItemDetailView(
                menuItem: mockMenuItemWithOptions,
                orderId: "previewOrderWithOptionsLive",
                table: mockTable
            )
            .environmentObject(mockOrderManager)
            .environmentObject(mockSupabaseManager)
            .previewDisplayName("With Options (Live)")

            AddItemDetailView(
                menuItem: mockMenuItemPlain,
                orderId: "previewOrderPlainLive",
                table: mockTable
            )
            .environmentObject(mockOrderManager)
            .environmentObject(mockSupabaseManager)
            .previewDisplayName("Plain Item (Live)")
        }
    }
}

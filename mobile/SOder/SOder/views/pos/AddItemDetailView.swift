import SwiftUI

// --- Mock Data Structures ---
// These would ideally be in a shared Models location

// Re-defining MenuItem, Category, Table locally for self-contained AddItemDetailView development.
// In a real app, these would be passed from the previous views or fetched from a shared model source.

struct TableStub: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var status: String
}

struct CategoryStub: Identifiable, Codable, Hashable {
    let id: String
    var name_en: String
    var displayName: String { name_en }
}

struct MenuItemSizeMock: Identifiable, Hashable, Codable {
    let id: String
    let name: String // e.g., "Small", "Medium", "Large"
    let priceModifier: Double // e.g., 0 for default, +100 for large, -50 for small

    static let mockSizes: [MenuItemSizeMock] = [
        MenuItemSizeMock(id: "size_s", name: "Small", priceModifier: -50),
        MenuItemSizeMock(id: "size_m", name: "Medium", priceModifier: 0),
        MenuItemSizeMock(id: "size_l", name: "Large", priceModifier: 100)
    ]
}

struct ToppingMock: Identifiable, Hashable, Codable {
    let id: String
    let name: String // e.g., "Extra Cheese", "Avocado"
    let price: Double // Price for this topping

    static let mockToppings: [ToppingMock] = [
        ToppingMock(id: "top_cheese", name: "Extra Cheese", price: 100),
        ToppingMock(id: "top_avocado", name: "Avocado", price: 150),
        ToppingMock(id: "top_bacon", name: "Crispy Bacon", price: 120),
        ToppingMock(id: "top_chili", name: "Spicy Chili Flakes", price: 50)
    ]
}

struct MenuItemStub: Identifiable, Codable, Hashable {
    let id: String
    let category_id: String
    let name_en: String
    let description_en: String?
    let price: Double // Base price

    var availableSizes: [MenuItemSizeMock]?
    var availableToppings: [ToppingMock]?

    var displayName: String { name_en }
    var displayDescription: String? { description_en }

    static let mockItemPlain = MenuItemStub(
        id: "item_plain", category_id: "cat1", name_en: "Plain Burger",
        description_en: "A simple burger.", price: 800
    )

    static let mockItemWithOptions = MenuItemStub(
        id: "item_options", category_id: "cat1", name_en: "Customizable Pizza",
        description_en: "Choose your size and toppings for this delicious pizza.", price: 1200,
        availableSizes: MenuItemSizeMock.mockSizes,
        availableToppings: ToppingMock.mockToppings
    )
}

// --- AddItemDetailView ---

struct AddItemDetailView: View {
    let menuItem: MenuItemStub // Use the stub definition for now
    let orderId: String
    let table: TableStub // Use the stub definition for now

    @EnvironmentObject var orderManager: OrderManager
    @Environment(\.dismiss) var dismiss

    @State private var quantity: Int = 1
    @State private var selectedSize: MenuItemSizeMock? = nil
    @State private var selectedToppings: Set<ToppingMock.ID> = Set() // Store IDs for multi-selection
    @State private var notes: String = ""

    @State private var isAddingItem = false
    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert = false

    // Calculate total price based on selections
    var currentTotalPrice: Double {
        var total = menuItem.price
        if let size = selectedSize {
            total += size.priceModifier
        }
        for toppingId in selectedToppings {
            if let topping = menuItem.availableToppings?.first(where: { $0.id == toppingId }) {
                total += topping.price
            }
        }
        return total * Double(quantity)
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
                            Text("None").tag(MenuItemSizeMock?.none) // Optional selection
                            ForEach(availableSizes) { size in
                                HStack {
                                    Text(size.name)
                                    Spacer()
                                    Text(String(format: "%+.0f円", size.priceModifier))
                                }.tag(MenuItemSizeMock?.some(size))
                            }
                        }
                        .pickerStyle(.menu) // Or .inline for some contexts
                        .onAppear { // Set default size if not already set and sizes are available
                            if selectedSize == nil && !availableSizes.isEmpty {
                                selectedSize = availableSizes.first(where: {$0.priceModifier == 0}) ?? availableSizes.first
                            }
                        }
                    }
                }

                // Topping Selection
                if let availableToppings = menuItem.availableToppings, !availableToppings.isEmpty {
                    Section(header: Text("Toppings (\(selectedToppings.count))")) {
                        List { // Use List for multi-selection pattern
                            ForEach(availableToppings) { topping in
                                Button(action: {
                                    toggleToppingSelection(topping)
                                }) {
                                    HStack {
                                        Text(topping.name)
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
                                .foregroundColor(.primary) // Keep text color standard
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

                Section(header: Text("Total Price")) {
                    Text(String(format: "%.0f円", currentTotalPrice))
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

    private func toggleToppingSelection(_ topping: ToppingMock) {
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

        Task {
            do {
                // Map selectedSize and selectedToppings to what OrderManager expects (e.g., String IDs)
                let sizeId = selectedSize?.id
                let toppingIds = selectedToppings.map { $0 } // Assuming OrderManager expects array of Topping IDs (Strings)

                _ = try await orderManager.addItemToDraftOrder(
                    orderId: orderId,
                    menuItemId: menuItem.id,
                    quantity: quantity,
                    notes: notes.isEmpty ? nil : notes,
                    selectedSize: sizeId, // Pass ID
                    selectedToppings: toppingIds // Pass array of IDs
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
        let mockTable = TableStub(id: "tablePrev1", name: "Preview Table", status: "available")

        // Preview with an item that has options
        AddItemDetailView(
            menuItem: MenuItemStub.mockItemWithOptions,
            orderId: "previewOrderWithOptions",
            table: mockTable
        )
        .environmentObject(mockOrderManager)

        // Preview with a plain item (no sizes/toppings)
//        AddItemDetailView(
//            menuItem: MenuItemStub.mockItemPlain,
//            orderId: "previewOrderPlain",
//            table: mockTable
//        )
//        .environmentObject(mockOrderManager)
//        .previewDisplayName("Plain Item Preview")
    }
}

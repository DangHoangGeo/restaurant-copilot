import SwiftUI

struct AddItemDetailView: View {
    let menuItem: MenuItem
    let orderId: String
    let table: Table

    @EnvironmentObject var orderManager: OrderManager
    @Environment(\.dismiss) var dismiss

    @State private var quantity: Int = 1
    @State private var selectedSize: MenuItemSize? = nil
    @State private var selectedToppings: Set<Topping.ID> = Set()
    @State private var notes: String = ""
    @State private var isAddingItem = false
    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert = false

    var priceForOneItemWithOptions: Double {
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
        return priceForOneItemWithOptions * Double(quantity)
    }

    var body: some View {
        NavigationView {
            Form {
                itemDetailsSection
                quantitySection
                sizeSelectionSection
                toppingsSection
                notesSection
                totalPriceSection
                actionButtonsSection
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
                    Button("Done") {
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
    
    // MARK: - Body Sections
    
    private var itemDetailsSection: some View {
        Section(header: Text("Item Details")) {
            Text(menuItem.displayName)
                .font(.title2)
                .fontWeight(.bold)
            if let description = menuItem.displayDescription, !description.isEmpty {
                Text(description)
                    .font(.body)
                    .foregroundColor(.gray)
            }
            Text("Base Price: \(String(format: "%.0f", menuItem.price))円")
        }
    }
    
    private var quantitySection: some View {
        Section(header: Text("Quantity")) {
            Stepper("Quantity: \(quantity)", value: $quantity, in: 1...20)
                .accessibilityLabel("Quantity")
                .accessibilityValue("\(quantity)")
        }
    }
    
    @ViewBuilder
    private var sizeSelectionSection: some View {
        if let availableSizes = menuItem.availableSizes, !availableSizes.isEmpty {
            Section(header: Text("Size")) {
                Picker("Select Size", selection: $selectedSize) {
                    Text("Standard").tag(nil as MenuItemSize?)
                    ForEach(availableSizes) { size in
                        sizePickerRow(for: size)
                    }
                }
                .pickerStyle(.menu)
                .onAppear {
                    if selectedSize == nil && !availableSizes.isEmpty {
                        selectedSize = availableSizes.first { $0.price == 0 } ?? availableSizes.first
                    }
                }
            }
        }
    }
    
    @ViewBuilder
    private var toppingsSection: some View {
        if let availableToppings = menuItem.availableToppings, !availableToppings.isEmpty {
            Section(header: Text("Toppings (\(selectedToppings.count))")) {
                List {
                    ForEach(availableToppings) { topping in
                        toppingSelectionRow(for: topping)
                    }
                }
            }
        }
    }
    
    private var notesSection: some View {
        Section(header: Text("Notes for Kitchen")) {
            TextEditor(text: $notes)
                .frame(height: 100)
                .border(Color.gray.opacity(0.2), width: 1)
                .accessibilityLabel("Notes for kitchen")
        }
    }
    
    private var totalPriceSection: some View {
        Section(header: Text("Total Price for This Item Line")) {
            Text(String(format: "%.0f円", currentLineItemTotalPrice))
                .font(.title3)
                .fontWeight(.bold)
        }
    }
    
    private var actionButtonsSection: some View {
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

    // MARK: - Helper Functions
    
    private func toggleToppingSelection(_ topping: Topping) {
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

        let singleItemPriceWithOptions = priceForOneItemWithOptions

        Task {
            do {
                let sizeId = selectedSize?.id
                let toppingIdsArray = Array(selectedToppings)

                _ = try await orderManager.addItemToDraftOrder(
                    orderId: orderId,
                    menuItemId: menuItem.id,
                    quantity: quantity,
                    notes: notes.isEmpty ? nil : notes,
                    selectedSizeId: sizeId,
                    selectedToppingIds: toppingIdsArray,
                    priceAtOrder: singleItemPriceWithOptions
                )

                await MainActor.run {
                    isAddingItem = false
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    print("Error adding item to order: \(error.localizedDescription)")
                    self.errorMessage = "Failed to add item: \(error.localizedDescription)"
                    self.showingErrorAlert = true
                    self.isAddingItem = false
                }
            }
        }
    }
    
    // MARK: - Helper Views
    
    private func sizePickerRow(for size: MenuItemSize) -> some View {
        HStack {
            Text(size.displayName)
            Spacer()
            Text(String(format: "%+.0f円", size.price))
        }
        .tag(size as MenuItemSize?)
    }
    
    private func toppingSelectionRow(for topping: Topping) -> some View {
        Button(action: {
            toggleToppingSelection(topping)
        }) {
            HStack {
                Text(topping.displayName)
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

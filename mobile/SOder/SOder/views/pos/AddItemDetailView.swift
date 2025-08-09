import SwiftUI

struct AddItemDetailView: View {
    let menuItem: MenuItem
    let orderId: String
    let table: Table

    @EnvironmentObject var orderManager: OrderManager
    @Environment(\.dismiss) var dismiss

    @State private var quantity: Int = 1
    @State private var selectedSize: MenuItemSize? = nil
    @State private var selectedToppings: Set<ToppingId> = Set()
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
                // Only show size, toppings, quantity, notes
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
                    Button(action: { Task { await addItemToOrder() } }) {
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
            .navigationTitle("customize_item_title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("cancel_button_title".localized) {
                        dismiss()
                    }
                }
            }
            .alert("error_alert_title".localized, isPresented: $showingErrorAlert) {
                Button("ok_button_title".localized) {}
            } message: {
                Text(errorMessage ?? "error_alert_default_message".localized)
            }
        }
    }

    private func addItemToOrder() async {
        isAddingItem = true
        do {
            let sizeId = selectedSize?.id
            let toppingIds = Array(selectedToppings)
            let price = priceForOneItemWithOptions
            _ = try await orderManager.addItemToDraftOrder(
                orderId: orderId,
                menuItemId: menuItem.id,
                quantity: quantity,
                notes: notes.isEmpty ? nil : notes,
                selectedSizeId: sizeId,
                selectedToppingIds: toppingIds.isEmpty ? nil : toppingIds,
                priceAtOrder: price
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
            showingErrorAlert = true
        }
        isAddingItem = false
    }
}


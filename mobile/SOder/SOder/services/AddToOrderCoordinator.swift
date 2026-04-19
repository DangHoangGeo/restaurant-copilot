//
//  AddToOrderCoordinator.swift
//  SOder
//
//  Created by Claude Code on 2025/08/11.
//  Centralized coordinator for adding items to orders with price calculation and decision logic
//

import Foundation

@MainActor
class AddToOrderCoordinator: ObservableObject {
    private let orderManager: OrderManager
    private let supabaseManager: SupabaseManager
    
    @Published var isAddingItem = false
    @Published var errorMessage: String? = nil
    @Published var showingErrorAlert = false
    
    init(orderManager: OrderManager = .shared, supabaseManager: SupabaseManager = .shared) {
        self.orderManager = orderManager
        self.supabaseManager = supabaseManager
    }
    
    // MARK: - Add Item Decision Logic
    
    /// Determines whether to show customize sheet or quick add based on item options
    func shouldShowCustomizeSheet(for menuItem: MenuItem) -> Bool {
        let hasSizes = menuItem.availableSizes?.isEmpty == false
        let hasToppings = menuItem.availableToppings?.isEmpty == false
        return hasSizes || hasToppings
    }
    
    /// Handles the add item flow - either quick add or show customize sheet
    func handleAddItem(_ menuItem: MenuItem, to orderId: String, customizeAction: @escaping (MenuItem) -> Void) async {
        if shouldShowCustomizeSheet(for: menuItem) {
            customizeAction(menuItem)
        } else {
            await quickAddItem(menuItem, to: orderId)
        }
    }
    
    // MARK: - Price Calculation
    
    /// Calculates the unit price for a menu item with selected options.
    func calculateUnitPrice(
        for menuItem: MenuItem,
        selectedSizeId: String? = nil,
        selectedToppingIds: [String]? = nil
    ) -> Double {
        let normalizedToppingIds = normalizeToppingIds(selectedToppingIds)
        var basePrice = menuItem.price
        
        // Size prices are stored as the full base price for that size.
        if let sizeId = selectedSizeId,
           let size = menuItem.availableSizes?.first(where: { $0.id == sizeId }) {
            basePrice = size.price
        }
        
        if let toppingIds = normalizedToppingIds {
            for toppingId in toppingIds {
                if let topping = menuItem.availableToppings?.first(where: { $0.id == toppingId }) {
                    basePrice += topping.price
                }
            }
        }
        
        return basePrice
    }

    /// Calculates the total display price for a menu item with selected options and quantity.
    func calculatePrice(
        for menuItem: MenuItem,
        selectedSizeId: String? = nil,
        selectedToppingIds: [String]? = nil,
        quantity: Int = 1
    ) -> Double {
        calculateUnitPrice(
            for: menuItem,
            selectedSizeId: selectedSizeId,
            selectedToppingIds: selectedToppingIds
        ) * Double(quantity)
    }
    
    // MARK: - Quick Add Methods

    /// Quick add item with default options (no customization)
    func quickAddItem(_ menuItem: MenuItem, to orderId: String, quantity: Int = 1, notes: String? = nil) async {
        guard !isAddingItem else { return }

        isAddingItem = true
        errorMessage = nil

        do {
            let defaultSizeId = menuItem.availableSizes?.first?.id
            let price = calculateUnitPrice(for: menuItem, selectedSizeId: defaultSizeId)

            // Always use local draft for cart-like behavior
            _ = try await orderManager.addItemToLocalDraftOrder(
                orderId: orderId,
                menuItemId: menuItem.id,
                quantity: quantity,
                notes: notes,
                selectedSizeId: defaultSizeId,
                selectedToppingIds: nil,
                priceAtOrder: price,
                menuItem: menuItem
            )

            print("✅ Quick added item \(menuItem.displayName) to local cart for order \(orderId)")

        } catch {
            print("❌ Error quick adding item: \(error)")
            errorMessage = "pos_add_item_error".localized
            showingErrorAlert = true
        }

        isAddingItem = false
    }
    
    // MARK: - Custom Add Methods

    /// Add item with custom options (from customize sheet)
    func addItemWithOptions(
        _ menuItem: MenuItem,
        to orderId: String,
        quantity: Int = 1,
        notes: String? = nil,
        selectedSizeId: String? = nil,
        selectedToppingIds: [String]? = nil
    ) async {
        guard !isAddingItem else { return }

        isAddingItem = true
        errorMessage = nil

        do {
            let normalizedToppingIds = normalizeToppingIds(selectedToppingIds)
            let price = calculateUnitPrice(
                for: menuItem,
                selectedSizeId: selectedSizeId,
                selectedToppingIds: normalizedToppingIds
            )

            // Always use local draft for cart-like behavior
            _ = try await orderManager.addItemToLocalDraftOrder(
                orderId: orderId,
                menuItemId: menuItem.id,
                quantity: quantity,
                notes: notes,
                selectedSizeId: selectedSizeId,
                selectedToppingIds: normalizedToppingIds,
                priceAtOrder: price,
                menuItem: menuItem
            )

            print("✅ Added customized item \(menuItem.displayName) to local cart for order \(orderId)")

        } catch {
            print("❌ Error adding customized item: \(error)")
            errorMessage = "pos_add_item_error".localized
            showingErrorAlert = true
        }

        isAddingItem = false
    }

    /// Replaces an existing local draft item so staff can edit size, toppings, notes, and quantity.
    func replaceItemWithOptions(
        _ existingItem: OrderItem,
        menuItem: MenuItem,
        in orderId: String,
        quantity: Int,
        notes: String?,
        selectedSizeId: String?,
        selectedToppingIds: [String]?
    ) async {
        guard !isAddingItem else { return }

        isAddingItem = true
        errorMessage = nil

        do {
            let normalizedToppingIds = normalizeToppingIds(selectedToppingIds)
            let unitPrice = calculateUnitPrice(
                for: menuItem,
                selectedSizeId: selectedSizeId,
                selectedToppingIds: normalizedToppingIds
            )

            if var localOrder = orderManager.localDraftOrders[orderId],
               let itemIndex = localOrder.order_items?.firstIndex(where: { $0.id == existingItem.id }) {
                localOrder.order_items?[itemIndex].quantity = quantity
                localOrder.order_items?[itemIndex].notes = notes
                localOrder.order_items?[itemIndex].price_at_order = unitPrice
                localOrder.order_items?[itemIndex].status = .draft
                localOrder.order_items?[itemIndex].updated_at = ISO8601DateFormatter().string(from: Date())
                localOrder.order_items?[itemIndex].menu_item = menuItem

                let updatedItem = OrderItem(
                    id: existingItem.id,
                    restaurant_id: existingItem.restaurant_id,
                    order_id: existingItem.order_id,
                    menu_item_id: menuItem.id,
                    quantity: quantity,
                    notes: notes,
                    menu_item_size_id: selectedSizeId,
                    topping_ids: normalizedToppingIds,
                    price_at_order: unitPrice,
                    status: .draft,
                    created_at: existingItem.created_at,
                    updated_at: ISO8601DateFormatter().string(from: Date()),
                    menu_item: menuItem
                )

                localOrder.order_items?[itemIndex] = updatedItem
                localOrder.total_amount = localOrder.order_items?.reduce(0.0) { partialResult, item in
                    partialResult + (item.price_at_order * Double(item.quantity))
                } ?? 0.0
                localOrder.updated_at = ISO8601DateFormatter().string(from: Date())
                orderManager.localDraftOrders[orderId] = localOrder

                if orderManager.currentDraftOrder?.id == orderId {
                    orderManager.currentDraftOrder = localOrder
                }
            } else {
                _ = try await orderManager.addItemToLocalDraftOrder(
                    orderId: orderId,
                    menuItemId: menuItem.id,
                    quantity: quantity,
                    notes: notes,
                    selectedSizeId: selectedSizeId,
                    selectedToppingIds: normalizedToppingIds,
                    priceAtOrder: unitPrice,
                    menuItem: menuItem
                )
            }

            print("✅ Updated customized item \(menuItem.displayName) in local cart for order \(orderId)")
        } catch {
            print("❌ Error updating customized item: \(error)")
            errorMessage = "pos_add_item_error".localized
            showingErrorAlert = true
        }

        isAddingItem = false
    }
    
    // MARK: - Order Summary Helpers
    
    /// Get current order summary for display in summary bar
    func getOrderSummary(for orderId: String) async -> (itemsCount: Int, totalAmount: Double) {
        do {
            if let draftOrder = try await orderManager.getDraftOrder(orderId: orderId) {
                let itemsCount = draftOrder.order_items?.count ?? 0
                let totalAmount = draftOrder.total_amount ?? 0.0
                return (itemsCount: itemsCount, totalAmount: totalAmount)
            }
        } catch {
            print("❌ Error getting order summary: \(error)")
        }
        
        return (itemsCount: 0, totalAmount: 0.0)
    }
    
    // MARK: - Session Management for AddItemToOrderView
    
    /// Ensures we're adding to the current session, not creating new ones
    func validateSessionForExistingOrder(_ order: Order) -> Bool {
        // For existing orders from OrderDetailView, we should always add to the same session
        // No new session creation should happen
        return true
    }

    private func normalizeToppingIds(_ toppingIds: [String]?) -> [String]? {
        guard let toppingIds else {
            return nil
        }

        let normalized = toppingIds
            .filter { !$0.isEmpty }
            .sorted()

        return normalized.isEmpty ? nil : normalized
    }
}

// MARK: - Localization Keys for AddToOrderCoordinator
extension String {
    static let posAddItemError = "pos_add_item_error"
    static let posItemAdded = "pos_item_added"
    static let posItemCustomized = "pos_item_customized"
}

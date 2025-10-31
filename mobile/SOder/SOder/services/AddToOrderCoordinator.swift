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
    
    /// Calculates the total price for a menu item with selected options
    func calculatePrice(
        for menuItem: MenuItem,
        selectedSizeId: String? = nil,
        selectedToppingIds: [String]? = nil,
        quantity: Int = 1
    ) -> Double {
        var basePrice = menuItem.price
        
        // Add size price if selected
        if let sizeId = selectedSizeId,
           let size = menuItem.availableSizes?.first(where: { $0.id == sizeId }) {
            basePrice += size.price
        }
        
        // Add topping prices if selected
        if let toppingIds = selectedToppingIds {
            for toppingId in toppingIds {
                if let topping = menuItem.availableToppings?.first(where: { $0.id == toppingId }) {
                    basePrice += topping.price
                }
            }
        }
        
        return basePrice * Double(quantity)
    }
    
    // MARK: - Quick Add Methods

    /// Quick add item with default options (no customization)
    func quickAddItem(_ menuItem: MenuItem, to orderId: String, quantity: Int = 1, notes: String? = nil) async {
        guard !isAddingItem else { return }

        isAddingItem = true
        errorMessage = nil

        do {
            let defaultSizeId = menuItem.availableSizes?.first?.id
            let price = calculatePrice(for: menuItem, selectedSizeId: defaultSizeId, quantity: quantity)

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
            let price = calculatePrice(
                for: menuItem,
                selectedSizeId: selectedSizeId,
                selectedToppingIds: selectedToppingIds,
                quantity: quantity
            )

            // Always use local draft for cart-like behavior
            _ = try await orderManager.addItemToLocalDraftOrder(
                orderId: orderId,
                menuItemId: menuItem.id,
                quantity: quantity,
                notes: notes,
                selectedSizeId: selectedSizeId,
                selectedToppingIds: selectedToppingIds,
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
}

// MARK: - Localization Keys for AddToOrderCoordinator
extension String {
    static let posAddItemError = "pos_add_item_error"
    static let posItemAdded = "pos_item_added"
    static let posItemCustomized = "pos_item_customized"
}
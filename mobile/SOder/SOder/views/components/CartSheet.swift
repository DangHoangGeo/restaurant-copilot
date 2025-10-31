//
//  CartSheet.swift
//  SOder
//
//  Displays cart items with ability to edit quantity, add notes, and confirm order
//

import SwiftUI

struct CartSheet: View {
    let order: Order
    let onDismiss: () -> Void
    let onConfirm: () -> Void
    let onEditItem: (OrderItem) -> Void

    @EnvironmentObject var orderManager: OrderManager
    @Environment(\.dismiss) var dismiss

    private var orderItems: [OrderItem] {
        order.order_items ?? []
    }

    private var totalItems: Int {
        orderItems.reduce(0) { $0 + $1.quantity }
    }

    private var totalAmount: Double {
        order.total_amount ?? 0.0
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Cart Items List
                if orderItems.isEmpty {
                    EmptyCartView()
                } else {
                    ScrollView {
                        VStack(spacing: Spacing.md) {
                            ForEach(Array(orderItems.enumerated()), id: \.element.id) { index, item in
                                CartItemRow(
                                    item: item,
                                    onTap: { onEditItem(item) },
                                    onQuantityChange: { newQuantity in
                                        Task {
                                            if newQuantity <= 0 {
                                                try? await orderManager.removeDraftOrderItem(orderItemId: item.id)
                                            } else {
                                                try? await orderManager.updateDraftOrderItemQuantity(
                                                    orderItemId: item.id,
                                                    newQuantity: newQuantity
                                                )
                                            }
                                        }
                                    },
                                    onRemove: {
                                        Task {
                                            try? await orderManager.removeDraftOrderItem(orderItemId: item.id)
                                        }
                                    }
                                )
                            }
                        }
                        .padding()
                    }
                }

                Spacer()

                // Footer with total and confirm button
                VStack(spacing: 0) {
                    Divider()

                    VStack(spacing: Spacing.md) {
                        HStack {
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Text("pos_total_items".localized)
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                                Text(String(format: "pos_items_count_format".localized, totalItems))
                                    .font(.bodyMedium)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.appTextPrimary)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: Spacing.xs) {
                                Text("total".localized)
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                                Text(String(format: "price_format".localized, totalAmount))
                                    .font(.cardTitle)
                                    .fontWeight(.bold)
                                    .foregroundColor(.appPrimary)
                            }
                        }

                        Button(action: {
                            onConfirm()
                        }) {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.subheadline)
                                Text("pos_confirm_order".localized)
                                    .font(.buttonLarge)
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(orderItems.isEmpty ? Color.appDisabled : Color.appPrimary)
                            .foregroundColor(.white)
                            .cornerRadius(CornerRadius.md)
                        }
                        .disabled(orderItems.isEmpty)
                    }
                    .padding()
                    .background(Color.appSurfaceElevated)
                }
            }
            .navigationTitle("cart_title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button(action: {
                        onDismiss()
                        dismiss()
                    }) {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "chevron.left")
                            Text("pos_continue_adding".localized)
                        }
                        .font(.bodyMedium)
                        .foregroundColor(.appPrimary)
                    }
                }
            }
        }
    }
}

struct CartItemRow: View {
    let item: OrderItem
    let onTap: () -> Void
    let onQuantityChange: (Int) -> Void
    let onRemove: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text(item.menu_item?.displayName ?? "Unknown Item")
                            .font(.bodyMedium)
                            .fontWeight(.semibold)
                            .foregroundColor(.appTextPrimary)
                            .multilineTextAlignment(.leading)

                        // Show size if selected
                        if let sizeId = item.menu_item_size_id,
                           let size = item.menu_item?.availableSizes?.first(where: { $0.id == sizeId }) {
                            Text("Size: \(size.displayName)")
                                .font(.captionRegular)
                                .foregroundColor(.appTextSecondary)
                        }

                        // Show toppings if selected
                        if let toppingIds = item.topping_ids, !toppingIds.isEmpty,
                           let allToppings = item.menu_item?.availableToppings {
                            let selectedToppings = allToppings.filter { toppingIds.contains($0.id) }
                            if !selectedToppings.isEmpty {
                                Text("Toppings: \(selectedToppings.map { $0.displayName }.joined(separator: ", "))")
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                            }
                        }

                        // Show notes if exists
                        if let notes = item.notes, !notes.isEmpty {
                            Text("Note: \(notes)")
                                .font(.captionRegular)
                                .foregroundColor(.appTextSecondary)
                                .italic()
                        }
                    }

                    Spacer()

                    Button(action: onRemove) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundColor(.appTextSecondary)
                    }
                    .buttonStyle(.plain)
                }

                HStack {
                    // Quantity controls
                    HStack(spacing: Spacing.sm) {
                        Button(action: {
                            onQuantityChange(item.quantity - 1)
                        }) {
                            Image(systemName: "minus.circle.fill")
                                .font(.title3)
                                .foregroundColor(item.quantity > 1 ? .appPrimary : .appDisabled)
                        }
                        .buttonStyle(.plain)
                        .disabled(item.quantity <= 1)

                        Text("\(item.quantity)")
                            .font(.bodyMedium)
                            .fontWeight(.semibold)
                            .foregroundColor(.appTextPrimary)
                            .frame(minWidth: 30)

                        Button(action: {
                            onQuantityChange(item.quantity + 1)
                        }) {
                            Image(systemName: "plus.circle.fill")
                                .font(.title3)
                                .foregroundColor(.appPrimary)
                        }
                        .buttonStyle(.plain)
                    }

                    Spacer()

                    // Price
                    Text(String(format: "price_format".localized, item.price_at_order * Double(item.quantity)))
                        .font(.bodyMedium)
                        .fontWeight(.bold)
                        .foregroundColor(.appTextPrimary)
                }
            }
            .padding()
            .background(Color.appSurfaceElevated)
            .cornerRadius(CornerRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(Color.appBorderLight, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct EmptyCartView: View {
    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "cart")
                .font(.system(size: 60))
                .foregroundColor(.appTextTertiary)

            Text("cart_empty_title".localized)
                .font(.cardTitle)
                .fontWeight(.semibold)
                .foregroundColor(.appTextPrimary)

            Text("cart_empty_subtitle".localized)
                .font(.bodyMedium)
                .foregroundColor(.appTextSecondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    let mockMenuItem = MenuItem(
        id: "1", restaurant_id: "1", category_id: "1",
        name_en: "Coffee", name_ja: "コーヒー", name_vi: "Cà phê",
        code: "COF", description_en: "Hot coffee", description_ja: nil, description_vi: nil,
        price: 5.0, tags: nil, image_url: nil, stock_level: nil, available: true,
        position: 1, created_at: "", updated_at: "",
        category: nil, availableSizes: [], availableToppings: []
    )

    let mockOrderItem = OrderItem(
        id: "1", restaurant_id: "1", order_id: "1", menu_item_id: "1",
        quantity: 2, notes: "Extra hot", menu_item_size_id: nil, topping_ids: [],
        price_at_order: 5.0, status: .new, created_at: "", updated_at: "",
        menu_item: mockMenuItem
    )

    let mockOrder = Order(
        id: "1", restaurant_id: "1", table_id: "1", session_id: "1",
        guest_count: 2, status: .draft, total_amount: 10.0, order_number: 1,
        created_at: "", updated_at: "", table: nil,
        order_items: [mockOrderItem], payment_method: nil,
        discount_amount: nil, tax_amount: nil, tip_amount: nil
    )

    CartSheet(
        order: mockOrder,
        onDismiss: {},
        onConfirm: {},
        onEditItem: { _ in }
    )
    .environmentObject(OrderManager.shared)
}

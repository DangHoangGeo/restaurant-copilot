//
//  CartSheet.swift
//  SOder
//
//  Displays shared cart items for both new-order and add-to-existing-order flows.
//

import SwiftUI

struct CartSheet: View {
    let order: Order
    let title: String
    let subtitle: String?
    let confirmLabel: String
    let confirmIcon: String
    let onDismiss: () -> Void
    let onConfirm: () -> Void
    let onEditItem: (OrderItem) -> Void

    @EnvironmentObject var orderManager: OrderManager
    @Environment(\.dismiss) var dismiss

    init(
        order: Order,
        title: String = "cart_title".localized,
        subtitle: String? = nil,
        confirmLabel: String = "pos_confirm_order".localized,
        confirmIcon: String = "checkmark.circle.fill",
        onDismiss: @escaping () -> Void,
        onConfirm: @escaping () -> Void,
        onEditItem: @escaping (OrderItem) -> Void
    ) {
        self.order = order
        self.title = title
        self.subtitle = subtitle
        self.confirmLabel = confirmLabel
        self.confirmIcon = confirmIcon
        self.onDismiss = onDismiss
        self.onConfirm = onConfirm
        self.onEditItem = onEditItem
    }

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
        NavigationStack {
            ZStack(alignment: .bottom) {
                Color.appBackground
                    .ignoresSafeArea()

                if orderItems.isEmpty {
                    EmptyCartView()
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            if let subtitle, !subtitle.isEmpty {
                                Text(subtitle)
                                    .font(.bodyMedium)
                                    .foregroundColor(.appTextSecondary)
                                    .padding(.horizontal, Spacing.md)
                            }

                            ForEach(orderItems) { item in
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
                                .padding(.horizontal, Spacing.md)
                            }
                        }
                        .padding(.top, Spacing.md)
                        .padding(.bottom, 120)
                    }
                }

                footer
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        onDismiss()
                        dismiss()
                    } label: {
                        Label("pos_continue_adding".localized, systemImage: "chevron.left")
                    }
                    .foregroundColor(.appTextSecondary)
                }
            }
        }
    }

    private var footer: some View {
        VStack(spacing: Spacing.md) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("pos_total_items".localized)
                        .font(.captionBold)
                        .foregroundColor(.appTextSecondary)
                    Text(String(format: "pos_items_count_format".localized, totalItems))
                        .font(.bodyMedium)
                        .foregroundColor(.appTextPrimary)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: Spacing.xs) {
                    Text("total".localized)
                        .font(.captionBold)
                        .foregroundColor(.appTextSecondary)
                    Text(AppCurrencyFormatter.format(totalAmount))
                        .font(.sectionHeader)
                        .foregroundColor(.appPrimary)
                }
            }

            Button(action: onConfirm) {
                Label(confirmLabel, systemImage: confirmIcon)
            }
            .buttonStyle(PrimaryButtonStyle(isEnabled: !orderItems.isEmpty))
            .disabled(orderItems.isEmpty)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.md)
        .padding(.bottom, Spacing.lg)
        .background(
            LinearGradient(
                colors: [Color.appBackground.opacity(0), Color.appBackground.opacity(0.92), Color.appBackground],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea(edges: .bottom)
        )
    }
}

struct CartItemRow: View {
    let item: OrderItem
    let onTap: () -> Void
    let onQuantityChange: (Int) -> Void
    let onRemove: () -> Void

    private var menuItem: MenuItem? {
        item.menu_item
    }

    private var sizeDisplay: String? {
        guard let sizeId = item.menu_item_size_id,
              let size = menuItem?.availableSizes?.first(where: { $0.id == sizeId }) else {
            return nil
        }

        return size.staffSecondaryName.map { "\(size.displayName) / \($0)" } ?? size.displayName
    }

    private var toppingDisplay: String? {
        guard let toppingIds = item.topping_ids,
              !toppingIds.isEmpty,
              let allToppings = menuItem?.availableToppings else {
            return nil
        }

        let selectedToppings = allToppings.filter { toppingIds.contains($0.id) }
        guard !selectedToppings.isEmpty else { return nil }

        return selectedToppings.map { topping in
            topping.staffSecondaryName.map { "\(topping.displayName) / \($0)" } ?? topping.displayName
        }.joined(separator: ", ")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    if let code = menuItem?.code, !code.isEmpty {
                        Text(code)
                            .font(.captionBold)
                            .foregroundColor(.appPrimary)
                    }

                    Text(menuItem?.displayName ?? "orders_unknown_item".localized)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextPrimary)
                        .multilineTextAlignment(.leading)

                    if let secondaryName = menuItem?.staffSecondaryName {
                        Text(secondaryName)
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                            .multilineTextAlignment(.leading)
                    }
                }

                Spacer()

                Button(action: onRemove) {
                    Image(systemName: "xmark")
                }
                .buttonStyle(IconButtonStyle())
                .accessibilityLabel("pos_remove_item_button".localized)
            }

            VStack(alignment: .leading, spacing: Spacing.xs) {
                if let sizeDisplay, !sizeDisplay.isEmpty {
                    detailLine(label: "pos_size_section_title".localized, value: sizeDisplay)
                }

                if let toppingDisplay, !toppingDisplay.isEmpty {
                    detailLine(label: "pos_toppings_section_title".localized, value: toppingDisplay)
                }

                if let notes = item.notes, !notes.isEmpty {
                    detailLine(label: "pos_notes_section_title".localized, value: notes)
                }
            }

            HStack {
                HStack(spacing: Spacing.md) {
                    Button {
                        onQuantityChange(item.quantity - 1)
                    } label: {
                        Image(systemName: "minus")
                    }
                    .buttonStyle(IconButtonStyle())
                    .disabled(item.quantity <= 1)

                    Text("\(item.quantity)")
                        .font(.sectionHeader)
                        .foregroundColor(.appTextPrimary)
                        .frame(minWidth: 28)

                    Button {
                        onQuantityChange(item.quantity + 1)
                    } label: {
                        Image(systemName: "plus")
                    }
                    .buttonStyle(IconButtonStyle())
                }

                Spacer()

                VStack(alignment: .trailing, spacing: Spacing.xs) {
                    Text("pos_edit_item_button".localized)
                        .font(.captionBold)
                        .foregroundColor(.appTextSecondary)
                    Text(AppCurrencyFormatter.format(item.price_at_order * Double(item.quantity)))
                        .font(.sectionHeader)
                        .foregroundColor(.appPrimary)
                }
            }
        }
        .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.lg)
        .contentShape(Rectangle())
        .onTapGesture(perform: onTap)
    }

    private func detailLine(label: String, value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Spacing.sm) {
            Text(label.uppercased())
                .font(.captionBold)
                .foregroundColor(.appTextSecondary)
            Text(value)
                .font(.captionRegular)
                .foregroundColor(.appTextSecondary)
                .multilineTextAlignment(.leading)
        }
    }
}

struct EmptyCartView: View {
    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "cart")
                .font(.system(size: 56))
                .foregroundColor(.appTextTertiary)

            Text("cart_empty_title".localized)
                .font(.cardTitle)
                .foregroundColor(.appTextPrimary)

            Text("cart_empty_subtitle".localized)
                .font(.bodyMedium)
                .foregroundColor(.appTextSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(Spacing.xl)
    }
}

#Preview {
    let mockMenuItem = MenuItem(
        id: "1", restaurant_id: "1", category_id: "1",
        name_en: "Coffee", name_ja: "コーヒー", name_vi: "Ca phe",
        code: "COF", description_en: "Hot coffee", description_ja: nil, description_vi: nil,
        price: 500.0, tags: nil, image_url: nil, stock_level: nil, available: true,
        position: 1, created_at: "", updated_at: "",
        category: nil, availableSizes: [], availableToppings: []
    )

    let mockOrderItem = OrderItem(
        id: "1", restaurant_id: "1", order_id: "1", menu_item_id: "1",
        quantity: 2, notes: "Extra hot", menu_item_size_id: nil, topping_ids: [],
        price_at_order: 500.0, status: .draft, created_at: "", updated_at: "",
        menu_item: mockMenuItem
    )

    let mockOrder = Order(
        id: "1", restaurant_id: "1", table_id: "1", session_id: "1",
        guest_count: 2, status: .draft, total_amount: 1000.0, order_number: 1,
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

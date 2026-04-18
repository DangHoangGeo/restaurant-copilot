//
//  CustomizeMenuItemSheet.swift
//  SOder
//
//  Created by Claude Code on 2025/08/11.
//  Shared customization sheet for both new-order and add-to-existing-order flows.
//

import SwiftUI

struct CustomizeMenuItemSheet: View {
    let menuItem: MenuItem
    let orderId: String
    let coordinator: AddToOrderCoordinator
    let onComplete: () -> Void
    let editingItem: OrderItem?

    @Environment(\.dismiss) var dismiss
    @State private var selectedSize: MenuItemSize? = nil
    @State private var selectedToppings: Set<String> = []
    @State private var quantity: Int = 1
    @State private var notes: String = ""

    init(
        menuItem: MenuItem,
        orderId: String,
        coordinator: AddToOrderCoordinator,
        onComplete: @escaping () -> Void,
        editingItem: OrderItem? = nil
    ) {
        self.menuItem = menuItem
        self.orderId = orderId
        self.coordinator = coordinator
        self.onComplete = onComplete
        self.editingItem = editingItem
    }

    private var isEditing: Bool {
        editingItem != nil
    }

    private var unitPrice: Double {
        coordinator.calculateUnitPrice(
            for: menuItem,
            selectedSizeId: selectedSize?.id,
            selectedToppingIds: Array(selectedToppings)
        )
    }

    private var totalPrice: Double {
        unitPrice * Double(quantity)
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                Color.appBackground
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: Spacing.lg) {
                        headerCard

                        if let sizes = menuItem.availableSizes, !sizes.isEmpty {
                            optionSection(title: "pos_size_section_title".localized) {
                                VStack(spacing: Spacing.sm) {
                                    ForEach(sizes) { size in
                                        selectionRow(
                                            title: size.displayName,
                                            subtitle: size.staffSecondaryName,
                                            trailingText: size.price > 0
                                                ? String(format: "pos_additional_price_format".localized, size.price)
                                                : "pos_included_price".localized,
                                            isSelected: selectedSize?.id == size.id
                                        ) {
                                            selectedSize = selectedSize?.id == size.id ? nil : size
                                        }
                                    }
                                }
                            }
                        }

                        if let toppings = menuItem.availableToppings, !toppings.isEmpty {
                            optionSection(title: "pos_toppings_section_title".localized) {
                                VStack(spacing: Spacing.sm) {
                                    ForEach(toppings) { topping in
                                        selectionRow(
                                            title: topping.displayName,
                                            subtitle: topping.staffSecondaryName,
                                            trailingText: topping.price > 0
                                                ? String(format: "pos_additional_price_format".localized, topping.price)
                                                : "pos_included_price".localized,
                                            isSelected: selectedToppings.contains(topping.id)
                                        ) {
                                            if selectedToppings.contains(topping.id) {
                                                selectedToppings.remove(topping.id)
                                            } else {
                                                selectedToppings.insert(topping.id)
                                            }
                                        }
                                    }
                                }
                            }
                        }

                        optionSection(title: "pos_quantity_section_title".localized) {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                HStack(spacing: Spacing.sm) {
                                    ForEach([1, 2, 3, 4], id: \.self) { quickQuantity in
                                        Button {
                                            quantity = quickQuantity
                                        } label: {
                                            Text("\(quickQuantity)")
                                                .frame(maxWidth: .infinity)
                                        }
                                        .buttonStyle(SmallButtonStyle(isEnabled: true))
                                        .opacity(quantity == quickQuantity ? 1 : 0.78)
                                    }
                                }

                                HStack {
                                    Text("pos_quantity_label".localized)
                                        .font(.bodyMedium)
                                        .foregroundColor(.appTextSecondary)

                                    Spacer()

                                    HStack(spacing: Spacing.md) {
                                        Button {
                                            quantity = max(1, quantity - 1)
                                        } label: {
                                            Image(systemName: "minus")
                                        }
                                        .buttonStyle(IconButtonStyle())
                                        .disabled(quantity <= 1)

                                        Text("\(quantity)")
                                            .font(.sectionHeader)
                                            .foregroundColor(.appTextPrimary)
                                            .frame(minWidth: 32)

                                        Button {
                                            quantity = min(99, quantity + 1)
                                        } label: {
                                            Image(systemName: "plus")
                                        }
                                        .buttonStyle(IconButtonStyle())
                                        .disabled(quantity >= 99)
                                    }
                                }
                            }
                        }

                        optionSection(title: "pos_notes_section_title".localized) {
                            TextField("pos_notes_placeholder".localized, text: $notes, axis: .vertical)
                                .lineLimit(4, reservesSpace: true)
                                .font(.bodyMedium)
                                .foregroundColor(.appTextPrimary)
                                .padding(Spacing.md)
                                .background(
                                    RoundedRectangle(cornerRadius: CornerRadius.md)
                                        .fill(Color.appSurfaceSecondary)
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: CornerRadius.md)
                                        .stroke(Color.appBorderLight, lineWidth: 1)
                                )
                        }

                        summaryCard
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.top, Spacing.md)
                    .padding(.bottom, 108)
                }

                bottomBar
            }
            .navigationTitle(isEditing ? "pos_update_item_title".localized : "pos_customize_title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("cancel".localized) {
                        dismiss()
                    }
                    .foregroundColor(.appTextSecondary)
                }
            }
        }
        .onAppear(perform: configureInitialState)
    }

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    if let code = menuItem.code, !code.isEmpty {
                        Text(code)
                            .font(.captionBold)
                            .foregroundColor(.appPrimary)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 4)
                            .background(Color.appPrimary.opacity(0.12))
                            .clipShape(Capsule())
                    }

                    Text(menuItem.displayName)
                        .font(.cardTitle)
                        .foregroundColor(.appTextPrimary)

                    if let secondaryName = menuItem.staffSecondaryName {
                        Text(secondaryName)
                            .font(.bodyMedium)
                            .foregroundColor(.appTextSecondary)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: Spacing.xs) {
                    Text("pos_unit_price_label".localized)
                        .font(.captionBold)
                        .foregroundColor(.appTextSecondary)
                    Text(String(format: "price_format".localized, unitPrice))
                        .font(.sectionHeader)
                        .foregroundColor(.appPrimary)
                }
            }

            if let description = menuItem.displayDescription, !description.isEmpty {
                Text(description)
                    .font(.bodyMedium)
                    .foregroundColor(.appTextSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.lg)
    }

    private func optionSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(title)
                .font(.captionBold)
                .foregroundColor(.appTextSecondary)
                .tracking(1.0)

            content()
        }
    }

    private func selectionRow(
        title: String,
        subtitle: String?,
        trailingText: String,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: Spacing.md) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.bodyMedium)
                    .foregroundColor(isSelected ? .appPrimary : .appTextTertiary)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(title)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextPrimary)

                    if let subtitle, !subtitle.isEmpty {
                        Text(subtitle)
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                    }
                }

                Spacer()

                Text(trailingText)
                    .font(.buttonSmall)
                    .foregroundColor(isSelected ? .appPrimary : .appTextSecondary)
            }
            .padding(Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(isSelected ? Color.appSurfaceElevated : Color.appSurface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(isSelected ? Color.appPrimary.opacity(0.35) : Color.appBorderLight, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private var summaryCard: some View {
        VStack(spacing: Spacing.md) {
            HStack {
                Text("pos_unit_price_label".localized)
                    .font(.bodyMedium)
                    .foregroundColor(.appTextSecondary)
                Spacer()
                Text(String(format: "price_format".localized, unitPrice))
                    .font(.bodyMedium)
                    .foregroundColor(.appTextPrimary)
            }

            HStack {
                Text("pos_total_price_label".localized)
                    .font(.bodyMedium)
                    .foregroundColor(.appTextSecondary)
                Spacer()
                Text(String(format: "price_format".localized, totalPrice))
                    .font(.sectionHeader)
                    .foregroundColor(.appPrimary)
            }
        }
        .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.lg)
    }

    private var bottomBar: some View {
        VStack(spacing: Spacing.sm) {
            Button {
                Task {
                    await performSave()
                }
            } label: {
                Label(
                    isEditing ? "pos_update_item_button".localized : "pos_add_to_order_button".localized,
                    systemImage: isEditing ? "checkmark.circle.fill" : "plus.circle.fill"
                )
            }
            .buttonStyle(PrimaryButtonStyle(isEnabled: !coordinator.isAddingItem))
            .disabled(coordinator.isAddingItem)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.sm)
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

    private func configureInitialState() {
        if let editingItem {
            selectedSize = menuItem.availableSizes?.first(where: { $0.id == editingItem.menu_item_size_id })
            selectedToppings = Set(editingItem.topping_ids ?? [])
            quantity = max(1, editingItem.quantity)
            notes = editingItem.notes ?? ""
            return
        }

        if selectedSize == nil, let defaultSize = menuItem.availableSizes?.first {
            selectedSize = defaultSize
        }
    }

    private func performSave() async {
        if let editingItem {
            await coordinator.replaceItemWithOptions(
                editingItem,
                menuItem: menuItem,
                in: orderId,
                quantity: quantity,
                notes: notes.isEmpty ? nil : notes,
                selectedSizeId: selectedSize?.id,
                selectedToppingIds: Array(selectedToppings)
            )
        } else {
            await coordinator.addItemWithOptions(
                menuItem,
                to: orderId,
                quantity: quantity,
                notes: notes.isEmpty ? nil : notes,
                selectedSizeId: selectedSize?.id,
                selectedToppingIds: Array(selectedToppings)
            )
        }

        guard coordinator.errorMessage == nil else { return }

        onComplete()
        dismiss()
    }
}

#Preview {
    let sampleMenuItem = MenuItem(
        id: "sample-id",
        restaurant_id: "restaurant-id",
        category_id: "category-id",
        name_en: "Custom Pizza",
        name_ja: "カスタムピザ",
        name_vi: "Pizza tuy chinh",
        code: "PIZ001",
        description_en: "Build your own pizza",
        description_ja: "お好みのピザを作ろう",
        description_vi: "Tu tao pizza cua ban",
        price: 1500.0,
        tags: nil,
        image_url: nil,
        stock_level: nil,
        available: true,
        position: nil,
        created_at: "2025-08-11T12:00:00Z",
        updated_at: "2025-08-11T12:00:00Z",
        category: nil,
        availableSizes: [
            MenuItemSize(
                id: "size-1", restaurant_id: "restaurant-id", menu_item_id: "sample-id",
                size_key: "M", name_en: "Medium", name_ja: "ミディアム", name_vi: "Vua",
                price: 0.0, position: 1, created_at: "", updated_at: ""
            ),
            MenuItemSize(
                id: "size-2", restaurant_id: "restaurant-id", menu_item_id: "sample-id",
                size_key: "L", name_en: "Large", name_ja: "ラージ", name_vi: "Lon",
                price: 300.0, position: 2, created_at: "", updated_at: ""
            )
        ],
        availableToppings: [
            Topping(
                id: "topping-1", restaurant_id: "restaurant-id",
                name_en: "Extra Cheese", name_ja: "チーズ追加", name_vi: "Them pho mai",
                price: 200.0, position: 1, created_at: "", updated_at: ""
            )
        ]
    )

    CustomizeMenuItemSheet(
        menuItem: sampleMenuItem,
        orderId: "order-123",
        coordinator: AddToOrderCoordinator(),
        onComplete: {}
    )
}

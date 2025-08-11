//
//  CustomizeMenuItemSheet.swift
//  SOder
//
//  Created by Claude Code on 2025/08/11.
//  Unified customization sheet for menu items with sizes and toppings
//

import SwiftUI

struct CustomizeMenuItemSheet: View {
    let menuItem: MenuItem
    let orderId: String
    let coordinator: AddToOrderCoordinator
    let onComplete: () -> Void
    
    @Environment(\.dismiss) var dismiss
    @State private var selectedSize: MenuItemSize? = nil
    @State private var selectedToppings: Set<String> = Set()
    @State private var quantity: Int = 1
    @State private var notes: String = ""
    
    // Calculate price with selected options
    private var totalPrice: Double {
        coordinator.calculatePrice(
            for: menuItem,
            selectedSizeId: selectedSize?.id,
            selectedToppingIds: Array(selectedToppings),
            quantity: quantity
        )
    }
    
    var body: some View {
        NavigationView {
            Form {
                // Menu item info section
                Section {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text(menuItem.displayName)
                            .font(.cardTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.appTextPrimary)
                        
                        if let description = menuItem.displayDescription, !description.isEmpty {
                            Text(description)
                                .font(.bodyMedium)
                                .foregroundColor(.appTextSecondary)
                        }
                        
                        Text(String(format: "price_format".localized, menuItem.price))
                            .font(.bodyMedium)
                            .fontWeight(.semibold)
                            .foregroundColor(.appPrimary)
                    }
                    .padding(.vertical, Spacing.xs)
                }
                
                // Size selection
                if let sizes = menuItem.availableSizes, !sizes.isEmpty {
                    Section("pos_size_section_title".localized) {
                        ForEach(sizes) { size in
                            HStack {
                                Button(action: {
                                    selectedSize = selectedSize?.id == size.id ? nil : size
                                }) {
                                    HStack {
                                        Image(systemName: selectedSize?.id == size.id ? "checkmark.circle.fill" : "circle")
                                            .foregroundColor(selectedSize?.id == size.id ? .appPrimary : .appTextSecondary)
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xs) {
                                            Text(size.displayName)
                                                .font(.bodyMedium)
                                                .foregroundColor(.appTextPrimary)
                                            
                                            if size.price > 0 {
                                                Text(String(format: "pos_additional_price_format".localized, size.price))
                                                    .font(.captionRegular)
                                                    .foregroundColor(.appTextSecondary)
                                            }
                                        }
                                        
                                        Spacer()
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                
                // Topping selection
                if let toppings = menuItem.availableToppings, !toppings.isEmpty {
                    Section("pos_toppings_section_title".localized) {
                        ForEach(toppings) { topping in
                            HStack {
                                Button(action: {
                                    if selectedToppings.contains(topping.id) {
                                        selectedToppings.remove(topping.id)
                                    } else {
                                        selectedToppings.insert(topping.id)
                                    }
                                }) {
                                    HStack {
                                        Image(systemName: selectedToppings.contains(topping.id) ? "checkmark.square.fill" : "square")
                                            .foregroundColor(selectedToppings.contains(topping.id) ? .appPrimary : .appTextSecondary)
                                        
                                        VStack(alignment: .leading, spacing: Spacing.xs) {
                                            Text(topping.displayName)
                                                .font(.bodyMedium)
                                                .foregroundColor(.appTextPrimary)
                                            
                                            if topping.price > 0 {
                                                Text(String(format: "pos_additional_price_format".localized, topping.price))
                                                    .font(.captionRegular)
                                                    .foregroundColor(.appTextSecondary)
                                            }
                                        }
                                        
                                        Spacer()
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                
                // Quantity selection
                Section("pos_quantity_section_title".localized) {
                    HStack {
                        Text("pos_quantity_label".localized)
                            .font(.bodyMedium)
                            .foregroundColor(.appTextPrimary)
                        
                        Spacer()
                        
                        HStack(spacing: Spacing.md) {
                            Button(action: {
                                if quantity > 1 {
                                    quantity -= 1
                                }
                            }) {
                                Image(systemName: "minus.circle.fill")
                                    .font(.title2)
                                    .foregroundColor(quantity > 1 ? .appPrimary : .appDisabled)
                            }
                            .disabled(quantity <= 1)
                            
                            Text("\(quantity)")
                                .font(.bodyMedium)
                                .fontWeight(.semibold)
                                .foregroundColor(.appTextPrimary)
                                .frame(minWidth: 30)
                            
                            Button(action: {
                                if quantity < 99 {
                                    quantity += 1
                                }
                            }) {
                                Image(systemName: "plus.circle.fill")
                                    .font(.title2)
                                    .foregroundColor(quantity < 99 ? .appPrimary : .appDisabled)
                            }
                            .disabled(quantity >= 99)
                        }
                    }
                }
                
                // Notes section
                Section("pos_notes_section_title".localized) {
                    TextField("pos_notes_placeholder".localized, text: $notes, axis: .vertical)
                        .lineLimit(3)
                        .font(.bodyMedium)
                }
                
                // Total price and add button
                Section {
                    VStack(spacing: Spacing.md) {
                        HStack {
                            Text("pos_total_price_label".localized)
                                .font(.bodyMedium)
                                .fontWeight(.semibold)
                                .foregroundColor(.appTextPrimary)
                            
                            Spacer()
                            
                            Text(String(format: "price_format".localized, totalPrice))
                                .font(.cardTitle)
                                .fontWeight(.bold)
                                .foregroundColor(.appPrimary)
                        }
                        
                        Button(action: {
                            Task {
                                await coordinator.addItemWithOptions(
                                    menuItem,
                                    to: orderId,
                                    quantity: quantity,
                                    notes: notes.isEmpty ? nil : notes,
                                    selectedSizeId: selectedSize?.id,
                                    selectedToppingIds: Array(selectedToppings)
                                )
                                onComplete()
                                dismiss()
                            }
                        }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                    .font(.subheadline)
                                Text("pos_add_to_order_button".localized)
                                    .font(.buttonLarge)
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(Color.appPrimary)
                            .foregroundColor(.white)
                            .cornerRadius(CornerRadius.md)
                        }
                        .disabled(coordinator.isAddingItem)
                        .opacity(coordinator.isAddingItem ? 0.6 : 1.0)
                    }
                }
            }
            .navigationTitle("pos_customize_title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("cancel".localized) {
                        dismiss()
                    }
                }
            }
        }
        .onAppear {
            // Set default size if available
            if selectedSize == nil, let defaultSize = menuItem.availableSizes?.first {
                selectedSize = defaultSize
            }
        }
    }
}

#Preview {
    let sampleMenuItem = MenuItem(
        id: "sample-id",
        restaurant_id: "restaurant-id",
        category_id: "category-id",
        name_en: "Custom Pizza",
        name_ja: "カスタムピザ",
        name_vi: "Pizza tùy chỉnh",
        code: "PIZ001",
        description_en: "Build your own pizza",
        description_ja: "お好みのピザを作ろう",
        description_vi: "Tự tạo pizza của bạn",
        price: 15.0,
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
                size_key: "M", name_en: "Medium", name_ja: "ミディアム", name_vi: "Vừa",
                price: 0.0, position: 1, created_at: "", updated_at: ""
            ),
            MenuItemSize(
                id: "size-2", restaurant_id: "restaurant-id", menu_item_id: "sample-id",
                size_key: "L", name_en: "Large", name_ja: "ラージ", name_vi: "Lớn",
                price: 3.0, position: 2, created_at: "", updated_at: ""
            )
        ],
        availableToppings: [
            Topping(
                id: "topping-1", restaurant_id: "restaurant-id",
                name_en: "Extra Cheese", name_ja: "チーズ追加", name_vi: "Phô mai thêm",
                price: 2.0, position: 1, created_at: "", updated_at: ""
            ),
            Topping(
                id: "topping-2", restaurant_id: "restaurant-id",
                name_en: "Pepperoni", name_ja: "ペパロニ", name_vi: "Xúc xích pepperoni",
                price: 3.0, position: 2, created_at: "", updated_at: ""
            )
        ]
    )
    
    CustomizeMenuItemSheet(
        menuItem: sampleMenuItem,
        orderId: "order-123",
        coordinator: AddToOrderCoordinator(),
        onComplete: { print("Customization complete") }
    )
}
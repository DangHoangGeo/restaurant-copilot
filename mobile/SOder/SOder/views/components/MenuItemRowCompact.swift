//
//  MenuItemRowCompact.swift
//  SOder
//
//  Created by Claude Code on 2025/08/11.
//  Legacy compact menu item row - use MenuItemRowCompactUnified for new implementations
//

import SwiftUI

struct MenuItemRowCompact: View {
    let menuItem: MenuItem
    let onTap: () -> Void
    
    @State private var isPressed = false
    
    var body: some View {
        HStack(spacing: Spacing.md) {
            // Enhanced thumbnail with better placeholder
            if let urlString = menuItem.image_url, let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .empty:
                        ZStack {
                            RoundedRectangle(cornerRadius: CornerRadius.sm)
                                .fill(Color.appSurfaceSecondary)
                            ProgressView()
                                .scaleEffect(0.7)
                                .tint(.appTextSecondary)
                        }
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                    case .failure:
                        ZStack {
                            RoundedRectangle(cornerRadius: CornerRadius.sm)
                                .fill(Color.appSurfaceSecondary)
                            Image(systemName: "fork.knife")
                                .foregroundColor(.appTextTertiary)
                                .font(.title3)
                        }
                    @unknown default:
                        EmptyView()
                    }
                }
                .frame(width: 52, height: 52)
                .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .stroke(Color.appBorderLight, lineWidth: 1)
                )
            } else {
                // Default placeholder when no image
                ZStack {
                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .fill(Color.appSurfaceSecondary)
                    Image(systemName: "fork.knife")
                        .foregroundColor(.appTextTertiary)
                        .font(.title3)
                }
                .frame(width: 52, height: 52)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.sm)
                        .stroke(Color.appBorderLight, lineWidth: 1)
                )
            }
            
            // Enhanced item info section
            VStack(alignment: .leading, spacing: Spacing.xs) {
                // Item name with better typography
                Text(menuItem.displayName)
                    .font(.bodyMedium)
                    .fontWeight(.semibold)
                    .foregroundColor(.appTextPrimary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                
                // Code and description in a more organized layout
                HStack(spacing: Spacing.xs) {
                    if let code = menuItem.code, !code.isEmpty {
                        Text(code)
                            .font(.captionBold)
                            .foregroundColor(.appPrimary)
                            .padding(.horizontal, Spacing.xs)
                            .padding(.vertical, 2)
                            .background(Color.appPrimary.opacity(0.1))
                            .cornerRadius(4)
                    }
                    
                    // Show price here on left side for better balance
                    Text(AppCurrencyFormatter.format(menuItem.price))
                        .font(.captionBold)
                        .foregroundColor(.appTextSecondary)
                    
                    Spacer()
                }
                
                // Description if available
                if let description = menuItem.displayDescription, !description.isEmpty {
                    Text(description)
                        .font(.captionRegular)
                        .foregroundColor(.appTextTertiary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            // Enhanced add button with better visual feedback
            Button(action: onTap) {
                ZStack {
                    Circle()
                        .fill(isPressed ? Color.appPrimary.opacity(0.8) : Color.appPrimary)
                        .frame(width: 36, height: 36)
                        .shadow(
                            color: Color.appPrimary.opacity(0.3), 
                            radius: isPressed ? 2 : 4, 
                            y: isPressed ? 1 : 2
                        )
                    
                    Image(systemName: "plus")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(.white)
                }
            }
            .scaleEffect(isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: isPressed)
            .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
                isPressed = pressing
            }, perform: {})
            .accessibilityLabel("add_item_to_order".localized(with: menuItem.displayName))
        }
        .padding(.vertical, Spacing.md)
        .padding(.horizontal, Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .shadow(
            color: Elevation.level1.color, 
            radius: Elevation.level1.radius, 
            y: Elevation.level1.y
        )
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(Color.appBorderLight, lineWidth: 0.5)
        )
        .contentShape(Rectangle())
        .onTapGesture(perform: onTap)
    }
}

#Preview {
    let sampleMenuItem = MenuItem(
        id: "sample-id",
        restaurant_id: "restaurant-id",
        category_id: "category-id",
        name_en: "Sample Item",
        name_ja: "サンプル商品",
        name_vi: "Mẫu sản phẩm",
        code: "SI01",
        description_en: "A sample menu item",
        description_ja: nil,
        description_vi: nil,
        price: 12.50,
        tags: nil,
        image_url: nil,
        stock_level: nil,
        available: true,
        position: nil,
        created_at: "2025-08-11T12:00:00Z",
        updated_at: "2025-08-11T12:00:00Z"
    )
    
    VStack(spacing: Spacing.sm) {
        MenuItemRowCompact(menuItem: sampleMenuItem) {
            print("Add item tapped")
        }
        
        MenuItemRowCompact(menuItem: MenuItem(
            id: "sample-id-2",
            restaurant_id: "restaurant-id",
            category_id: "category-id",
            name_en: "Very Long Menu Item Name That Should Wrap",
            name_ja: "とても長いメニューアイテム名前",
            name_vi: "Tên mục menu rất dài",
            code: nil,
            description_en: nil,
            description_ja: nil,
            description_vi: nil,
            price: 25.00,
            tags: nil,
            image_url: nil,
            stock_level: nil,
            available: true,
            position: nil,
            created_at: "2025-08-11T12:00:00Z",
            updated_at: "2025-08-11T12:00:00Z"
        )) {
            print("Add long item tapped")
        }
    }
    .padding()
    .background(Color.appBackground)
}

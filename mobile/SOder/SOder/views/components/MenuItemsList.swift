//
//  MenuItemsList.swift
//  SOder
//
//  Created by Claude Code on 2025/08/11.
//  Unified menu items list for POS interfaces
//

import SwiftUI

struct MenuItemsList: View {
    let menuItems: [MenuItem]
    let categories: [Category]
    let searchText: String
    let showCategoryHeaders: Bool
    let onItemTap: (MenuItem) -> Void
    let onQuickAdd: ((MenuItem) -> Void)?
    let onCustomize: ((MenuItem) -> Void)?
    let isAddingItem: Bool
    
    init(
        menuItems: [MenuItem],
        categories: [Category] = [],
        searchText: String = "",
        showCategoryHeaders: Bool = true,
        isAddingItem: Bool = false,
        onItemTap: @escaping (MenuItem) -> Void,
        onQuickAdd: ((MenuItem) -> Void)? = nil,
        onCustomize: ((MenuItem) -> Void)? = nil
    ) {
        self.menuItems = menuItems
        self.categories = categories
        self.searchText = searchText
        self.showCategoryHeaders = showCategoryHeaders
        self.onItemTap = onItemTap
        self.onQuickAdd = onQuickAdd
        self.onCustomize = onCustomize
        self.isAddingItem = isAddingItem
    }
    
    // Group items by category for headers
    private var groupedItems: [(category: Category?, items: [MenuItem])] {
        if !showCategoryHeaders || !searchText.isEmpty {
            // When searching or headers disabled, show flat list
            return [(category: nil, items: menuItems.sorted { $0.displayName < $1.displayName })]
        }
        
        let itemsByCategory = Dictionary(grouping: menuItems, by: { item in
            categories.first(where: { $0.id == item.category_id })
        })
        
        // Sort categories by their position if available, else by name
        let sortedKeys = itemsByCategory.keys.sorted { lhs, rhs in
            switch (lhs?.position, rhs?.position) {
            case let (l?, r?): return l < r
            case (_?, nil): return true
            case (nil, _?): return false
            default:
                let lName = lhs?.displayName ?? ""
                let rName = rhs?.displayName ?? ""
                return lName.localizedCompare(rName) == .orderedAscending
            }
        }
        
        return sortedKeys.map { key in
            let items = itemsByCategory[key] ?? []
            return (category: key, items: items.sorted { $0.displayName < $1.displayName })
        }
    }
    
    var body: some View {
        if menuItems.isEmpty {
            emptyStateView
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(0..<groupedItems.count, id: \.self) { groupIndex in
                        let group = groupedItems[groupIndex]
                        
                        // Category header
                        if let category = group.category, showCategoryHeaders && searchText.isEmpty {
                            categoryHeader(category: category, itemCount: group.items.count, isFirst: groupIndex == 0)
                        }
                        
                        // Menu items in this category
                        ForEach(group.items) { item in
                            MenuItemRowCompactUnified(
                                menuItem: item,
                                showQuickAdd: onQuickAdd != nil,
                                showCustomize: onCustomize != nil,
                                isAddingItem: isAddingItem,
                                onTap: { onItemTap(item) },
                                onQuickAdd: onQuickAdd != nil ? { onQuickAdd!(item) } : nil,
                                onCustomize: onCustomize != nil ? { onCustomize!(item) } : nil
                            )
                        }
                    }
                }
                .padding(.bottom, Spacing.lg)
            }
            .background(Color.appBackground)
        }
    }
    
    @ViewBuilder
    private var emptyStateView: some View {
        VStack(spacing: Spacing.lg) {
            ZStack {
                Circle()
                    .fill(Color.appSurfaceSecondary)
                    .frame(width: 80, height: 80)
                Image(systemName: searchText.isEmpty ? "tray" : "magnifyingglass")
                    .font(.system(size: 32))
                    .foregroundColor(.appTextTertiary)
            }
            
            VStack(spacing: Spacing.xs) {
                if !searchText.isEmpty {
                    Text(String(format: "pos_empty_search_format".localized, searchText))
                        .font(.sectionHeader)
                        .fontWeight(.semibold)
                        .foregroundColor(.appTextPrimary)
                    Text("pos_empty_try_different".localized)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                        .multilineTextAlignment(.center)
                } else {
                    Text("pos_empty_all".localized)
                        .font(.sectionHeader)
                        .fontWeight(.semibold)
                        .foregroundColor(.appTextPrimary)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.appBackground)
    }
    
    @ViewBuilder
    private func categoryHeader(category: Category, itemCount: Int, isFirst: Bool) -> some View {
        HStack {
            Text(category.displayName)
                .font(.bodyMedium)
                .fontWeight(.bold)
                .foregroundColor(.appTextPrimary)
            
            Text("(\(itemCount))")
                .font(.captionRegular)
                .foregroundColor(.appTextSecondary)
            
            Spacer()
        }
        .padding(.horizontal)
        .padding(.top, isFirst ? Spacing.sm : Spacing.md)
        .padding(.bottom, Spacing.xs)
    }
}

// Enhanced compact row for unified usage
struct MenuItemRowCompactUnified: View {
    let menuItem: MenuItem
    let showQuickAdd: Bool
    let showCustomize: Bool
    let isAddingItem: Bool
    let onTap: () -> Void
    let onQuickAdd: (() -> Void)?
    let onCustomize: (() -> Void)?
    
    @State private var isPressed = false
    
    // Determine if item has customization options
    private var hasCustomizationOptions: Bool {
        return (menuItem.availableSizes?.isEmpty == false) || (menuItem.availableToppings?.isEmpty == false)
    }

    private var optionSummary: String? {
        let sizeCount = menuItem.availableSizes?.count ?? 0
        let toppingCount = menuItem.availableToppings?.count ?? 0
        var parts: [String] = []

        if sizeCount > 0 {
            parts.append("\(sizeCount) \("pos_size_section_title".localized.lowercased())")
        }

        if toppingCount > 0 {
            parts.append("\(toppingCount) \("pos_toppings_section_title".localized.lowercased())")
        }

        return parts.isEmpty ? nil : parts.joined(separator: " • ")
    }
    
    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .center, spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: Spacing.xs) {
                        if let code = menuItem.code, !code.isEmpty {
                            Text(code)
                                .font(.monoCaption)
                                .foregroundColor(.appTextSecondary)
                        }

                        Text(menuItem.displayName)
                            .font(.bodyMedium.weight(.semibold))
                            .foregroundColor(.appTextPrimary)
                            .lineLimit(1)
                    }

                    HStack(spacing: Spacing.xs) {
                        if let secondary = menuItem.staffSecondaryName {
                            Text(secondary)
                                .font(.captionRegular)
                                .foregroundColor(.appTextSecondary)
                                .lineLimit(1)
                        }

                        if let optionSummary {
                            Text(optionSummary)
                                .font(.captionRegular)
                                .foregroundColor(.appPrimary)
                                .lineLimit(1)
                        }
                    }

                    if let stockLevel = menuItem.stock_level, stockLevel <= 0 {
                        Text("pos_out_of_stock".localized)
                            .font(.captionBold)
                            .foregroundColor(.appError)
                    }
                }

                Spacer(minLength: Spacing.sm)

                Text(AppCurrencyFormatter.format(menuItem.price))
                    .font(.bodyMedium)
                    .fontWeight(.bold)
                    .foregroundColor(.appPrimary)

                if showQuickAdd {
                    Button(action: primaryAction) {
                        Image(systemName: hasCustomizationOptions ? "slider.horizontal.3" : "plus")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.appOnHighlight)
                            .frame(width: 44, height: 40)
                            .background(Color.appPrimary)
                            .cornerRadius(CornerRadius.sm)
                    }
                    .buttonStyle(.plain)
                    .disabled(isAddingItem)
                    .opacity(isAddingItem ? 0.6 : 1.0)
                    .accessibilityLabel(hasCustomizationOptions ? "pos_customize_item".localized : "pos_quick_add".localized)
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, 10)
            .contentShape(Rectangle())
            .onTapGesture(perform: primaryAction)

            Divider()
                .padding(.leading, Spacing.md)
        }
        .background(Color.appSurface)
    }

    private func primaryAction() {
        if hasCustomizationOptions {
            onCustomize?()
        } else if showQuickAdd {
            onQuickAdd?()
        } else {
            onTap()
        }
    }
}

#Preview {
    let sampleCategories = [
        Category(id: "1", name_en: "Drinks", name_ja: "飲み物", name_vi: "Đồ uống", position: 1),
        Category(id: "2", name_en: "Food", name_ja: "食べ物", name_vi: "Thức ăn", position: 2)
    ]
    
    let sampleItems = [
        MenuItem(
            id: "1", restaurant_id: "1", category_id: "1",
            name_en: "Coffee", name_ja: "コーヒー", name_vi: "Cà phê",
            code: "COF", description_en: "Hot coffee", description_ja: nil, description_vi: nil,
            price: 5.0, tags: nil, image_url: nil, stock_level: 10, available: true,
            position: nil, created_at: "", updated_at: ""
        ),
        MenuItem(
            id: "2", restaurant_id: "1", category_id: "2",
            name_en: "Burger", name_ja: "バーガー", name_vi: "Bánh mì kẹp",
            code: "BUR", description_en: "Beef burger", description_ja: nil, description_vi: nil,
            price: 12.0, tags: nil, image_url: nil, stock_level: 0, available: false,
            position: nil, created_at: "", updated_at: ""
        )
    ]
    
    MenuItemsList(
        menuItems: sampleItems,
        categories: sampleCategories,
        searchText: "",
        showCategoryHeaders: true,
        isAddingItem: false,
        onItemTap: { item in print("Tapped \(item.displayName)") },
        onQuickAdd: { item in print("Quick add \(item.displayName)") },
        onCustomize: { item in print("Customize \(item.displayName)") }
    )
    .background(Color.appBackground)
}

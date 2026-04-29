import SwiftUI

private struct KitchenItemVisualStyle {
    let accent: Color
    let softAccent: Color
    let border: Color
    let surface: Color
    let secondarySurface: Color
    let secondaryText: Color
}

private extension KitchenItemVisualStyle {
    static var neutral: KitchenItemVisualStyle {
        KitchenItemVisualStyle(
            accent: .appTextSecondary,
            softAccent: Color.appTextSecondary.opacity(0.12),
            border: Color.appBorderLight,
            surface: .appSurface,
            secondarySurface: .appSurfaceSecondary,
            secondaryText: .appTextSecondary
        )
    }

    static var newItem: KitchenItemVisualStyle {
        return KitchenItemVisualStyle(
            accent: .appAccent,
            softAccent: Color.appAccent.opacity(0.10),
            border: Color.appAccent.opacity(0.16),
            surface: .appSurface,
            secondarySurface: .appSurfaceSecondary,
            secondaryText: .appTextSecondary
        )
    }

    static var preparing: KitchenItemVisualStyle {
        return KitchenItemVisualStyle(
            accent: .appWarning,
            softAccent: Color.appWarning.opacity(0.10),
            border: Color.appWarning.opacity(0.16),
            surface: .appSurface,
            secondarySurface: .appSurfaceSecondary,
            secondaryText: .appTextSecondary
        )
    }

    static var urgent: KitchenItemVisualStyle {
        return KitchenItemVisualStyle(
            accent: .appError,
            softAccent: Color.appError.opacity(0.10),
            border: Color.appError.opacity(0.24),
            surface: .appSurface,
            secondarySurface: .appSurfaceSecondary,
            secondaryText: .appTextSecondary
        )
    }
}

struct CategoryFilterChip: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.xs) {
                Text(title)
                    .font(.captionBold)
                    .fontWeight(.medium)

                if count > 0 {
                    Text("\(count)")
                        .font(.captionBold)
                        .foregroundColor(isSelected ? .appOnHighlight : color)
                        .padding(.horizontal, Spacing.xs)
                        .padding(.vertical, 3)
                        .background(isSelected ? Color.white.opacity(0.16) : color.opacity(0.12))
                        .cornerRadius(CornerRadius.sm)
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, 8)
            .background(isSelected ? color : Color.appSurface)
            .foregroundColor(isSelected ? .appOnHighlight : .appTextPrimary)
            .cornerRadius(CornerRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(isSelected ? color.opacity(0.18) : Color.appBorderLight, lineWidth: 1)
            )
        }
        .accessibilityLabel(title)
        .accessibilityValue(count > 0 ? String(format: "kitchen_category_count_format".localized, count) : "kitchen_category_no_items".localized)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityHint("kitchen_category_filter_hint".localized)
    }
}

struct StatusColumnsView: View {
    let items: [GroupedItem]
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void

    private var newItems: [GroupedItem] {
        items.filter { $0.status == .new }
    }

    private var preparingItems: [GroupedItem] {
        items.filter { $0.status == .preparing }
    }

    var body: some View {
        HStack(spacing: Spacing.md) {
            StatusColumn(
                title: "kitchen_status_new".localized,
                count: newItems.count,
                color: KitchenItemVisualStyle.newItem.accent,
                items: newItems,
                onItemStatusTap: onItemStatusTap,
                onItemDetailTap: onItemDetailTap
            )

            StatusColumn(
                title: "kitchen_status_preparing".localized,
                count: preparingItems.count,
                color: KitchenItemVisualStyle.preparing.accent,
                items: preparingItems,
                onItemStatusTap: onItemStatusTap,
                onItemDetailTap: onItemDetailTap
            )
        }
        .padding(.horizontal, Spacing.md)
        .padding(.bottom, Spacing.md)
    }
}

private struct StatusColumn: View {
    let title: String
    let count: Int
    let color: Color
    let items: [GroupedItem]
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            StatusColumnHeader(title: title, count: count, color: color)

            ScrollView {
                LazyVStack(spacing: Spacing.md) {
                    ForEach(items) { item in
                        CompactKitchenItemCard(
                            item: item,
                            onStatusTap: { onItemStatusTap(item) },
                            onDetailTap: { onItemDetailTap(item) }
                        )
                    }
                }
                .padding(.horizontal, Spacing.sm)
                .padding(.bottom, Spacing.md)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(color.opacity(0.05))
        .cornerRadius(CornerRadius.md)
    }
}

struct StatusColumnHeader: View {
    let title: String
    let count: Int
    let color: Color

    var body: some View {
        HStack {
            Text(title)
                .font(.sectionHeader)
                .foregroundColor(color)

            Spacer()

            Text("\(count)")
                .font(.captionBold)
                .foregroundColor(.appSurface)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs)
                .background(color)
                .cornerRadius(CornerRadius.lg)
        }
        .padding(.horizontal)
        .padding(.top)
    }
}

struct CompactKitchenItemCard: View {
    let item: GroupedItem
    let onStatusTap: () -> Void
    let onDetailTap: () -> Void

    var body: some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(emphasisColor)
                .frame(width: item.priority >= KitchenBoardConfig.urgentThreshold ? 5 : 4)

            VStack(alignment: .leading, spacing: Spacing.md) {
                HStack(alignment: .top, spacing: Spacing.sm) {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        HStack(spacing: Spacing.xs) {
                            KitchenMetaPill(
                                title: item.status.displayName.uppercased(),
                                tint: emphasisColor,
                                backgroundColor: visualStyle.softAccent
                            )
                            KitchenMetaPill(
                                title: timeAgoText,
                                tint: timeColor,
                                backgroundColor: timeColor.opacity(0.12)
                            )

                            if item.priority >= KitchenBoardConfig.urgentThreshold {
                                KitchenMetaPill(
                                    title: "kitchen_urgent".localized,
                                    tint: .appError,
                                    backgroundColor: Color.appError.opacity(0.12)
                                )
                            }
                        }

                        if !item.tableNames.isEmpty {
                            KitchenTableChipRow(tables: item.tableNames)
                        }

                        Text(item.itemName)
                            .font(.compactPageTitle)
                            .foregroundColor(.appTextPrimary)
                            .multilineTextAlignment(.leading)
                            .lineLimit(3)
                            .fixedSize(horizontal: false, vertical: true)

                        if let size = item.size {
                            itemMetaBlock(
                                label: "pos_size_section_title".localized,
                                text: size,
                                textColor: .appTextPrimary,
                                isModifier: true
                            )
                        }
                    }

                    Spacer(minLength: 0)

                    VStack(alignment: .trailing, spacing: 4) {
                        Text("QTY")
                            .font(.monoCaption)
                            .foregroundColor(.appTextSecondary)

                        Text("\(item.quantity)")
                            .font(.title2.weight(.bold))
                            .foregroundColor(emphasisColor)
                            .monospacedDigit()
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                            .background(visualStyle.softAccent)
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                    .stroke(visualStyle.border, lineWidth: 1)
                            )
                            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.md))
                    }
                }

                if !item.toppings.isEmpty {
                    itemMetaBlock(
                        label: "pos_toppings_section_title".localized,
                        text: item.toppings.prefix(3).joined(separator: " • "),
                        textColor: .appTextPrimary,
                        isModifier: true
                    )
                }

                if !item.displayNotes.isEmpty {
                    itemMetaBlock(
                        label: "item_detail_notes_label".localized,
                        text: item.displayNotes,
                        textColor: visualStyle.secondaryText
                    )
                }

                Button(action: onStatusTap) {
                    HStack(spacing: Spacing.sm) {
                        Circle()
                            .fill(emphasisColor)
                            .frame(width: 8, height: 8)

                        Text(nextActionText)
                            .font(.buttonSmall)

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                    }
                    .foregroundColor(.appTextPrimary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.sm)
                    .background(Color.appSurfaceSecondary.opacity(0.92))
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.sm)
                            .stroke(Color.appBorderLight, lineWidth: 1)
                    )
                    .cornerRadius(CornerRadius.sm)
                    .frame(minHeight: 36)
                }
                .buttonStyle(.plain)
            }
            .padding(Spacing.md)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(cardBackgroundColor)
        .cornerRadius(CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(priorityBorderColor, lineWidth: 1)
        )
        .contentShape(Rectangle())
        .onTapGesture(perform: onDetailTap)
    }

    private var timeAgoText: String {
        let interval = Date().timeIntervalSince(item.orderTime)
        let minutes = Int(interval / 60)

        if minutes < 1 {
            return "kitchen_just_now".localized
        }

        if minutes < 60 {
            return "\(minutes)m"
        }

        return "\(minutes / 60)h"
    }

    private var timeColor: Color {
        let interval = Date().timeIntervalSince(item.orderTime)
        let minutes = Int(interval / 60)

        if minutes < 10 {
            return .appSuccess
        }

        if minutes < 20 {
            return .appWarning
        }

        return .appError
    }

    private var statusColor: Color {
        switch item.status {
        case .draft:
            return .appTextSecondary
        case .new:
            return KitchenItemVisualStyle.newItem.accent
        case .preparing:
            return KitchenItemVisualStyle.preparing.accent
        case .ready:
            return .appSuccess
        case .served:
            return .appTextSecondary
        case .canceled:
            return .appError
        }
    }

    private var nextActionText: String {
        switch item.status {
        case .draft:
            return "kitchen_action_start".localized
        case .new:
            return "kitchen_action_start_preparing".localized
        case .preparing:
            return "kitchen_action_mark_ready".localized
        case .ready:
            return "kitchen_action_mark_served".localized
        case .served:
            return "kitchen_action_completed".localized
        case .canceled:
            return "kitchen_action_cancel_order".localized
        }
    }

    private var cardBackgroundColor: Color {
        visualStyle.surface
    }

    private var priorityBorderColor: Color {
        item.priority >= KitchenBoardConfig.urgentThreshold ? Color.appError.opacity(0.24) : visualStyle.border
    }

    private var visualStyle: KitchenItemVisualStyle {
        switch item.status {
        case .new:
            return .newItem
        case .preparing:
            return .preparing
        default:
            return .neutral
        }
    }

    private var emphasisColor: Color {
        statusColor
    }

    @ViewBuilder
    private func itemMetaBlock(label: String, text: String, textColor: Color, isModifier: Bool = false) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Spacing.xs) {
            Text(label.uppercased())
                .font(.monoCaption)
                .foregroundColor(.appTextSecondary)
                .frame(width: 72, alignment: .leading)

            Text(text)
                .font(isModifier ? .bodyMedium.weight(.semibold) : .captionRegular)
                .foregroundColor(textColor)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct KitchenMetaPill: View {
    let title: String
    let tint: Color
    let backgroundColor: Color

    var body: some View {
        Text(title)
            .font(.monoCaption)
            .foregroundColor(tint)
            .padding(.horizontal, Spacing.xs)
            .padding(.vertical, Spacing.xxs)
            .background(backgroundColor)
            .cornerRadius(CornerRadius.xs)
    }
}

private struct KitchenTableChipRow: View {
    let tables: [String]

    private var visibleTables: [String] {
        Array(tables.prefix(KitchenBoardConfig.maxDisplayedTables))
    }

    private var remainingTablesCount: Int {
        max(tables.count - visibleTables.count, 0)
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.xs) {
                ForEach(visibleTables, id: \.self) { table in
                    Text(table)
                        .font(.bodyMedium.weight(.semibold))
                        .foregroundColor(.appTextPrimary)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, 3)
                        .background(Color.appPrimary.opacity(0.12))
                        .cornerRadius(CornerRadius.sm)
                }

                if remainingTablesCount > 0 {
                    Text("+\(remainingTablesCount)")
                        .font(.bodyMedium.weight(.semibold))
                        .foregroundColor(.appTextSecondary)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, 3)
                        .background(Color.appBackground)
                        .cornerRadius(CornerRadius.sm)
                }
            }
        }
    }
}

struct KitchenEmptyStateView: View {
    let orderCount: Int
    let selectedCategory: String

    var body: some View {
        VStack(spacing: Spacing.lg) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.appSuccess)

            VStack(spacing: Spacing.sm) {
                Text("kitchen_empty_all_caught_up".localized)
                    .font(.cardTitle)

                Text("kitchen_empty_no_items".localized)
                    .font(.bodyMedium)
                    .foregroundColor(.appTextSecondary)
            }

            if orderCount > 0 {
                Text(String(format: "kitchen_empty_total_orders_format".localized, orderCount))
                    .font(.captionRegular)
                    .foregroundColor(.appTextSecondary)
            } else {
                Text("kitchen_empty_no_orders".localized)
                    .font(.captionRegular)
                    .foregroundColor(.appTextSecondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

struct CategoryGridView: View {
    let categoryGroups: [CategoryGroup]
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void

    var body: some View {
        ScrollView {
            LazyVStack(spacing: Spacing.lg) {
                ForEach(categoryGroups) { categoryGroup in
                    ImprovedCategoryGroupView(
                        categoryGroup: categoryGroup,
                        onItemStatusTap: onItemStatusTap,
                        onItemDetailTap: onItemDetailTap
                    )
                }
            }
            .padding()
        }
    }
}

struct ImprovedCategoryGroupView: View {
    let categoryGroup: CategoryGroup
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void

    private var columns: [GridItem] {
        [GridItem(.adaptive(minimum: KitchenBoardConfig.regularGridMinimumCardWidth, maximum: 420), spacing: Spacing.md)]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text(categoryGroup.categoryName)
                    .font(.cardTitle)

                Spacer()

                Text(String(format: "kitchen_items_count_format".localized, categoryGroup.items.count))
                    .font(.bodyMedium)
                    .fontWeight(.medium)
                    .foregroundColor(.appTextSecondary)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.xs)
                    .background(Color.appSurface)
                    .cornerRadius(CornerRadius.lg)
            }

            LazyVGrid(columns: columns, spacing: Spacing.md) {
                ForEach(categoryGroup.items) { item in
                    CompactKitchenItemCard(
                        item: item,
                        onStatusTap: { onItemStatusTap(item) },
                        onDetailTap: { onItemDetailTap(item) }
                    )
                }
            }
        }
        .padding(Spacing.lg)
        .background(Color.appBackground)
        .cornerRadius(CornerRadius.lg)
        .shadow(color: Elevation.level1.color, radius: Elevation.level1.radius, y: Elevation.level1.y)
    }
}

struct KitchenMobileGridView: View {
    let items: [GroupedItem]
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void

    private var newItems: [GroupedItem] {
        items.filter { $0.status == .new }
    }

    private var preparingItems: [GroupedItem] {
        items.filter { $0.status == .preparing }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                KitchenQueueSectionView(
                    title: "kitchen_status_new".localized,
                    color: KitchenItemVisualStyle.newItem.accent,
                    items: newItems,
                    onItemStatusTap: onItemStatusTap,
                    onItemDetailTap: onItemDetailTap
                )

                KitchenQueueSectionView(
                    title: "kitchen_status_preparing".localized,
                    color: KitchenItemVisualStyle.preparing.accent,
                    items: preparingItems,
                    onItemStatusTap: onItemStatusTap,
                    onItemDetailTap: onItemDetailTap
                )
            }
            .padding(.horizontal, Spacing.md)
            .padding(.bottom, Spacing.lg)
        }
    }
}

private struct KitchenQueueSectionView: View {
    let title: String
    let color: Color
    let items: [GroupedItem]
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void

    private var columns: [GridItem] {
        [GridItem(.adaptive(minimum: KitchenBoardConfig.mobileGridMinimumCardWidth), spacing: Spacing.md)]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text(title)
                    .font(.sectionHeader)
                    .foregroundColor(color)

                Spacer()

                Text("\(items.count)")
                    .font(.captionBold)
                    .foregroundColor(.appSurface)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(color)
                    .cornerRadius(CornerRadius.lg)
            }

            if items.isEmpty {
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(Color.appSurface)
                    .frame(height: 72)
                    .overlay(
                        Text("kitchen_empty_no_items".localized)
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                    )
            } else {
                LazyVGrid(columns: columns, spacing: Spacing.md) {
                    ForEach(items) { item in
                        CompactKitchenItemCard(
                            item: item,
                            onStatusTap: { onItemStatusTap(item) },
                            onDetailTap: { onItemDetailTap(item) }
                        )
                    }
                }
            }
        }
    }
}

#if DEBUG
#Preview("CompactKitchenItemCard") {
    let mockCategory = Category(id: "1", name_en: "Main", name_ja: "メイン", name_vi: "Món chính", position: 1)
    let mockMenuItem = MenuItem(id: "1", restaurant_id: "1", category_id: "1", name_en: "Spicy Seafood Fried Rice", name_ja: "海鮮チャーハン", name_vi: "Cơm chiên hải sản", code: "R01", description_en: nil, description_ja: nil, description_vi: nil, price: 12, tags: [], image_url: nil, stock_level: nil, available: true, position: 1, created_at: "", updated_at: "", category: mockCategory, availableSizes: [], availableToppings: [])
    let mockOrderItem = OrderItem(id: "1", restaurant_id: "1", order_id: "1", menu_item_id: "1", quantity: 3, notes: "No onion", menu_item_size_id: nil, topping_ids: [], price_at_order: 12, status: .new, created_at: Date().addingTimeInterval(-600).ISO8601Format(), updated_at: Date().ISO8601Format(), menu_item: mockMenuItem)
    let groupedItem = GroupedItem(itemId: "1", itemName: mockMenuItem.displayName, quantity: 3, tables: ["A1", "B2"], orderItems: [mockOrderItem], categoryName: "Main", notes: "No onion", orderTime: Date().addingTimeInterval(-600), priority: 4, status: .new)

    return CompactKitchenItemCard(item: groupedItem, onStatusTap: {}, onDetailTap: {})
}
#endif

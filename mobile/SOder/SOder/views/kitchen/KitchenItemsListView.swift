import SwiftUI

struct KitchenItemsListView: View {
    let groupedByCategory: [CategoryGroup]
    let selectedCategoryFilter: String
    let orderCount: Int
    let viewMode: KitchenViewMode
    let isCompactLayout: Bool
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void
    @EnvironmentObject private var localizationManager: LocalizationManager
    
    var body: some View {
        Group {
            if allItems.isEmpty {
                KitchenEmptyStateView(
                    orderCount: orderCount,
                    selectedCategory: selectedCategoryFilter
                )
            } else if isCompactLayout {
                KitchenMobileGridView(
                    items: allItems,
                    onItemStatusTap: onItemStatusTap,
                    onItemDetailTap: onItemDetailTap
                )
            } else {
                switch viewMode {
                case .statusColumns:
                    StatusColumnsView(
                        items: allItems,
                        onItemStatusTap: onItemStatusTap,
                        onItemDetailTap: onItemDetailTap
                    )
                case .categoryGrid:
                    CategoryGridView(
                        categoryGroups: filteredCategoryGroups,
                        onItemStatusTap: onItemStatusTap,
                        onItemDetailTap: onItemDetailTap
                    )
                }
            }
        }
    }
    
    private var filteredItems: [GroupedItem] {
        if selectedCategoryFilter == "kitchen_all".localized {
            return groupedByCategory.flatMap(\.items)
        }

        return groupedByCategory
            .filter { $0.categoryName == selectedCategoryFilter }
            .flatMap(\.items)
    }

    private var allItems: [GroupedItem] {
        filteredItems.sorted(by: KitchenGroupingEngine.sortItems)
    }
    
    private var filteredCategoryGroups: [CategoryGroup] {
        let filtered = selectedCategoryFilter == "kitchen_all".localized
            ? groupedByCategory
            : groupedByCategory.filter { $0.categoryName == selectedCategoryFilter }

        return filtered
            .map { group in
                CategoryGroup(
                    categoryName: group.categoryName,
                    items: group.items.sorted(by: KitchenGroupingEngine.sortItems)
                )
            }
            .sorted { lhs, rhs in
                let lhsFirst = lhs.items.first
                let rhsFirst = rhs.items.first

                switch (lhsFirst, rhsFirst) {
                case let (lhsItem?, rhsItem?):
                    return KitchenGroupingEngine.sortItems(lhsItem, rhsItem)
                case (.some, .none):
                    return true
                case (.none, .some):
                    return false
                case (.none, .none):
                    return lhs.categoryName.localizedStandardCompare(rhs.categoryName) == .orderedAscending
                }
            }
    }
}

// MARK: - Kitchen Header View

struct KitchenHeaderView: View {
    let totalItemsCount: Int
    let urgentItemsCount: Int
    let selectedCategoryFilter: String
    let categories: [String]
    let categoryCounts: [String: Int]
    let viewMode: KitchenViewMode
    let isCompactLayout: Bool
    let showsLayoutSwitcher: Bool
    let onCategoryFilterChange: (String) -> Void
    let onViewModeChange: (KitchenViewMode) -> Void
    let onRefresh: () -> Void
    let onPrintSummary: () -> Void
    let onSignOut: () -> Void
    
    @EnvironmentObject var orderManager: OrderManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            AppOperationsHeader(
                eyebrow: "kitchen_live_label".localized,
                title: "kitchen".localized,
                compactTitle: "kitchen".localized,
                subtitle: urgentItemsCount > 0
                    ? String(format: "kitchen_header_urgent_subtitle".localized, urgentItemsCount)
                    : String(format: "kitchen_header_subtitle".localized, totalItemsCount),
                isCompact: isCompactLayout
            ) {
                headerActionsContent
            }

            HStack(spacing: Spacing.sm) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.sm) {
                        let allLabel = "kitchen_all".localized
                        CategoryFilterChip(
                            title: allLabel,
                            count: totalItemsCount,
                            isSelected: selectedCategoryFilter == allLabel,
                            color: .appPrimary
                        ) {
                            onCategoryFilterChange(allLabel)
                        }

                        ForEach(categories.sorted(), id: \.self) { category in
                            CategoryFilterChip(
                                title: category,
                                count: categoryCounts[category] ?? 0,
                                isSelected: selectedCategoryFilter == category,
                                color: KitchenBoardConfig.colorForCategory(category)
                            ) {
                                onCategoryFilterChange(category)
                            }
                        }
                    }
                    .padding(.vertical, 2)
                }

                if showsLayoutSwitcher {
                    viewModeSwitcher
                }
            }
            .padding(.horizontal, Spacing.md)
        }
        .padding(.bottom, Spacing.sm)
        .background(Color.clear)
    }

    private var headerActionsContent: some View {
        HStack(spacing: Spacing.xs) {
            if orderManager.autoPrintingEnabled {
                if isCompactLayout {
                    Text("AUTO")
                        .font(.monoCaption)
                        .foregroundColor(.appTextSecondary)
                } else {
                    AppHeaderPill("AUTO")
                }
            }

            Text("\(urgentItemsCount > 0 ? urgentItemsCount : totalItemsCount)")
                .font(.bodyMedium.weight(.semibold))
                .foregroundColor(urgentItemsCount > 0 ? .appWarning : .appTextSecondary)

            headerActions
        }
    }

    private var headerActions: some View {
        HStack(spacing: Spacing.xs) {
            Button(action: onRefresh) {
                Image(systemName: "arrow.clockwise")
                    .font(.title3)
                    .foregroundColor(.appTextPrimary)
                    .frame(width: 36, height: 36)
            }
            .accessibilityLabel("kitchen_refresh".localized)

            Menu {
                Button {
                    onPrintSummary()
                } label: {
                    Label("kitchen_print_summary".localized, systemImage: "printer.fill")
                }

                Divider()

                Section("kitchen_auto_printing".localized) {
                    Button(action: {
                        orderManager.setAutoPrintingEnabled(!orderManager.autoPrintingEnabled)
                    }) {
                        Label(
                            "kitchen_auto_print_new_orders".localized,
                            systemImage: orderManager.autoPrintingEnabled ? "checkmark.circle.fill" : "circle"
                        )
                    }

                    Button("kitchen_clear_print_history".localized) {
                        orderManager.clearPrintHistory()
                    }
                    .disabled(!orderManager.autoPrintingEnabled)
                }

                Divider()

                Button("kitchen_sign_out".localized, role: .destructive) {
                    onSignOut()
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.title2)
                    .foregroundColor(.appTextPrimary)
            }
            .accessibilityLabel("kitchen_more_actions".localized)
        }
    }

    private var viewModeSwitcher: some View {
        HStack(spacing: 2) {
            ForEach(KitchenViewMode.allCases, id: \.self) { mode in
                Button {
                    onViewModeChange(mode)
                } label: {
                    Image(systemName: mode.icon)
                        .font(.body.weight(viewMode == mode ? .semibold : .regular))
                        .foregroundColor(viewMode == mode ? .appHighlight : .appTextSecondary)
                        .frame(width: 32, height: 32)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.sm)
                                .fill(viewMode == mode ? Color.appHighlight.opacity(0.12) : Color.clear)
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel(mode.displayName)
                .accessibilityAddTraits(viewMode == mode ? .isSelected : [])
            }
        }
        .padding(Spacing.xs)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(Color.appBorderLight, lineWidth: 1)
        )
    }
}

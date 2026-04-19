import SwiftUI

struct KitchenItemsListView: View {
    let groupedByCategory: [CategoryGroup]
    let selectedCategoryFilter: String
    let orderCount: Int
    let viewMode: KitchenViewMode
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
                case .list:
                    KitchenListView(
                        items: allItems,
                        onItemStatusTap: onItemStatusTap,
                        onItemDetailTap: onItemDetailTap
                    )
                }
            }
        }
    }
    
    // MARK: - Computed Properties
    
    private var allItems: [GroupedItem] {
        let filtered = selectedCategoryFilter == "kitchen_all".localized 
            ? groupedByCategory.flatMap { $0.items }
            : groupedByCategory.filter { $0.categoryName == selectedCategoryFilter }.flatMap { $0.items }
        
        return filtered.sorted { lhs, rhs in
            // Sort by priority first (urgent items at top)
            if lhs.priority != rhs.priority {
                return lhs.priority > rhs.priority
            }
            
            // Then by status
            let statusOrder: [OrderItemStatus] = [.new, .preparing, .ready, .served, .canceled]
            let lhsIndex = statusOrder.firstIndex(of: lhs.status) ?? 0
            let rhsIndex = statusOrder.firstIndex(of: rhs.status) ?? 0
            if lhsIndex != rhsIndex {
                return lhsIndex < rhsIndex
            }
            
            // Finally by order time
            return lhs.orderTime < rhs.orderTime
        }
    }
    
    private var filteredCategoryGroups: [CategoryGroup] {
        let filtered = selectedCategoryFilter == "kitchen_all".localized 
            ? groupedByCategory 
            : groupedByCategory.filter { $0.categoryName == selectedCategoryFilter }
        
        return filtered.sorted { lhs, rhs in
            // Sort by priority first (urgent items at top)
            let lhsUrgent = lhs.items.contains { $0.priority >= KitchenBoardConfig.urgentThreshold }
            let rhsUrgent = rhs.items.contains { $0.priority >= KitchenBoardConfig.urgentThreshold }
            
            if lhsUrgent != rhsUrgent {
                return lhsUrgent
            }
            
            // Then by category order (Drinks, Appetizers, Mains, Desserts)
            return KitchenBoardConfig.categoryPriority(lhs.categoryName) < KitchenBoardConfig.categoryPriority(rhs.categoryName)
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
    let onCategoryFilterChange: (String) -> Void
    let onViewModeChange: (KitchenViewMode) -> Void
    let onRefresh: () -> Void
    let onPrintSummary: () -> Void
    let onSignOut: () -> Void
    
    // Access orderManager via EnvironmentObject as per app rules
    @EnvironmentObject var orderManager: OrderManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Row 1: Title + quick-access actions
            HStack(alignment: .top, spacing: Spacing.sm) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    AppSectionEyebrow("kitchen_live_label".localized)

                    Text("kitchen".localized)
                        .font(.heroTitle)
                        .foregroundColor(.appTextPrimary)

                    Text(
                        urgentItemsCount > 0
                            ? String(format: "kitchen_header_urgent_subtitle".localized, urgentItemsCount)
                            : String(format: "kitchen_header_subtitle".localized, totalItemsCount)
                    )
                    .font(.bodyMedium)
                    .foregroundColor(.appTextSecondary)
                }

                Spacer()

                HStack(spacing: Spacing.xs) {
                    if orderManager.autoPrintingEnabled {
                        AppHeaderPill("AUTO")
                    }

                    if urgentItemsCount > 0 {
                        AppHeaderPill(
                            "\(urgentItemsCount)",
                            tint: .appWarning,
                            fill: Color.appWarning.opacity(0.1)
                        )
                    }

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

            // Row 2: Category filters + compact view mode switcher
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
                                count: countForCategory(category),
                                isSelected: selectedCategoryFilter == category,
                                color: KitchenBoardConfig.colorForCategory(category)
                            ) {
                                onCategoryFilterChange(category)
                            }
                        }
                    }
                    .padding(.vertical, 2)
                }

                viewModeSwitcher
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.md)
        .padding(.bottom, Spacing.sm)
        .background(Color.clear)
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

    private func countForCategory(_ category: String) -> Int {
        return categoryCounts[category] ?? 0
    }
}

#if DEBUG
#Preview {
    // Mock Environment Objects
    let orderManager = OrderManager.shared
    let printerManager = PrinterManager.shared
    let localizationManager = LocalizationManager.shared

    // Populate with mock data for preview
    let mockCategory = Category(id: "1", name_en: "Drinks", name_ja: "飲み物", name_vi: "Đồ uống", position: 1)
    let mockMenuItem = MenuItem(id: "1", restaurant_id: "1", category_id: "1", name_en: "Coffee", name_ja: "コーヒー", name_vi: "Cà phê", code: "COF", description_en: "Hot coffee", description_ja: "ホットコーヒー", description_vi: "Cà phê nóng", price: 5.0, tags: [], image_url: nil, stock_level: nil, available: true, position: 1, created_at: "", updated_at: "", category: mockCategory, availableSizes: [], availableToppings: [])
    let mockOrderItem = OrderItem(id: "1", restaurant_id: "1", order_id: "1", menu_item_id: "1", quantity: 2, notes: "Extra hot", menu_item_size_id: nil, topping_ids: [], price_at_order: 5.0, status: .new, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", menu_item: mockMenuItem)
    let mockGroupedItem = GroupedItem(itemId: "1", itemName: "Coffee", quantity: 2, tables: ["Table 1"], orderItems: [mockOrderItem], categoryName: "Drinks", notes: "Extra hot", orderTime: Date(), priority: 1, status: .new)
    let mockCategoryGroup = CategoryGroup(categoryName: "Drinks", items: [mockGroupedItem])

    return KitchenItemsListView(groupedByCategory: [mockCategoryGroup], selectedCategoryFilter: "kitchen_all".localized, orderCount: 1, viewMode: .list, onItemStatusTap: { _ in }, onItemDetailTap: { _ in })
        .environmentObject(orderManager)
        .environmentObject(printerManager)
        .environmentObject(localizationManager)
        .environmentObject(SupabaseManager.shared)
}
#endif

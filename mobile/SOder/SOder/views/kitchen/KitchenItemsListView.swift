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
        let filtered = selectedCategoryFilter == "All" 
            ? groupedByCategory.flatMap { $0.items }
            : groupedByCategory.filter { $0.categoryName == selectedCategoryFilter }.flatMap { $0.items }
        
        return filtered.sorted { lhs, rhs in
            // Sort by priority first (urgent items at top)
            if lhs.priority != rhs.priority {
                return lhs.priority > rhs.priority
            }
            
            // Then by status
            let statusOrder: [OrderItemStatus] = [.ordered, .preparing, .ready, .served, .cancelled]
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
        let filtered = selectedCategoryFilter == "All" 
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
    let viewMode: KitchenViewMode
    let onCategoryFilterChange: (String) -> Void
    let onViewModeChange: (KitchenViewMode) -> Void
    let onRefresh: () -> Void
    let onPrintSummary: () -> Void
    let onSignOut: () -> Void
    
    // Add orderManager to access auto-printing controls
    @ObservedObject var orderManager: OrderManager
    
    var body: some View {
        VStack(spacing: 8) {
            // Compact header with essential info only
            HStack {
                // Simplified title with urgent indicator
                HStack(spacing: 8) {
                    Text("kitchen".localized)
                        .font(.title2)
                        .fontWeight(.semibold)
                    
                    if urgentItemsCount > 0 {
                        HStack(spacing: 4) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text("\(urgentItemsCount)")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundColor(.red)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                    }
                }
                
                Spacer()
                
                // Compact menu with essential actions
                Menu {
                    ForEach(KitchenViewMode.allCases, id: \.self) { mode in
                        Button {
                            onViewModeChange(mode)
                        } label: {
                            HStack {
                                Image(systemName: mode.icon)
                                Text(mode.displayName)
                                if viewMode == mode {
                                    Spacer()
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.blue)
                                }
                            }
                        }
                    }
                    
                    Divider()
                    
                    Button("kitchen_refresh".localized) {
                        onRefresh()
                    }
                    
                    Button("kitchen_print_summary".localized) {
                        onPrintSummary()
                    }
                    
                    Divider()
                    
                    // Auto-printing controls
                    Section("kitchen_auto_printing".localized) {
                        Button(action: {
                            orderManager.setAutoPrintingEnabled(!orderManager.autoPrintingEnabled)
                        }) {
                            HStack {
                                Text("kitchen_auto_print_new_orders".localized)
                                Spacer()
                                if orderManager.autoPrintingEnabled {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.green)
                                }
                            }
                        }
                        
                        Button("kitchen_clear_print_history".localized) {
                            orderManager.clearPrintHistory()
                        }
                        .disabled(!orderManager.autoPrintingEnabled)
                    }
                    
                    Divider()
                    
                    Button("kitchen_sign_out".localized) {
                        onSignOut()
                    }
                } label: {
                    HStack {
                        Image(systemName: "ellipsis.circle")
                            .font(.title2)
                            .foregroundColor(.primary)
                        
                        // Show auto-print indicator
                        if orderManager.autoPrintingEnabled {
                            Image(systemName: "printer.fill")
                                .foregroundColor(.green)
                                .font(.caption)
                        }
                    }
                }
            }
            
            // Category Filter Pills - the most important for chefs
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    CategoryFilterChip(
                        title: "kitchen_all".localized,
                        count: totalItemsCount,
                        isSelected: selectedCategoryFilter == "All",
                        color: .blue
                    ) {
                        onCategoryFilterChange("All")
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
                .padding(.horizontal)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemGray6))
    }
    
    private func countForCategory(_ category: String) -> Int {
        // This would be passed from parent or computed here
        return 0 // Placeholder - should be computed from groupedByCategory
    }
}

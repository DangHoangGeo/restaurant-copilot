import SwiftUI

struct KitchenItemsListView: View {
    let groupedByCategory: [CategoryGroup]
    let selectedCategoryFilter: String
    let orderCount: Int
    let viewMode: KitchenViewMode
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void
    
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
            let statusOrder: [OrderItemStatus] = [.ordered, .preparing, .ready, .served]
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
    let orderCount: Int
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
    
    var body: some View {
        VStack(spacing: 12) {
            // Title and menu
            HStack {
                Text("Kitchen Board")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                Spacer()
                
                // View Mode Toggle
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
                    
                    Button("Refresh Kitchen") {
                        onRefresh()
                    }
                    
                    Button("Print Summary") {
                        onPrintSummary()
                    }
                    
                    Divider()
                    
                    Button("Sign Out") {
                        onSignOut()
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: viewMode.icon)
                        Image(systemName: "ellipsis.circle")
                    }
                    .font(.title2)
                }
            }
            
            // Kitchen Stats
            HStack(spacing: 16) {
                KitchenStatCard(value: "\(orderCount)", label: "Orders", color: .blue)
                KitchenStatCard(value: "\(totalItemsCount)", label: "Items", color: .orange)
                KitchenStatCard(value: "\(urgentItemsCount)", label: "Urgent", color: .red)
            }
            
            // Category Filter Pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    CategoryFilterChip(
                        title: "All",
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
        .padding()
        .background(Color(.systemGray6))
    }
    
    private func countForCategory(_ category: String) -> Int {
        // This would be passed from parent or computed here
        return 0 // Placeholder - should be computed from groupedByCategory
    }
}

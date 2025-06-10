import SwiftUI

struct KitchenItemsListView: View {
    let groupedByCategory: [CategoryGroup]
    let selectedCategoryFilter: String
    let orderCount: Int
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void
    
    var body: some View {
        Group {
            if filteredCategoryGroups.isEmpty {
                KitchenEmptyStateView(
                    orderCount: orderCount,
                    selectedCategory: selectedCategoryFilter
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: 20) {
                        ForEach(filteredCategoryGroups) { categoryGroup in
                            CategoryGroupView(
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
    }
    
    // MARK: - Computed Properties
    
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
    let onCategoryFilterChange: (String) -> Void
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
                
                Menu {
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
                    Image(systemName: "ellipsis.circle")
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

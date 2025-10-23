import SwiftUI

// MARK: - Filter Chip Component

struct CategoryFilterChip: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let color: Color
    let action: () -> Void
    @EnvironmentObject private var localizationManager: LocalizationManager

    var body: some View {
        Button(action: action) {
            HStack {            Text(title)
                .font(.captionBold)
                .fontWeight(.medium)

                if count > 0 {
                    Text("\(count)")
                        .font(.captionBold)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(Spacing.xxs)
                        .background(color)
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, 6)
            .background(isSelected ? color.opacity(0.8) : Color.appSurface)
            .foregroundColor(isSelected ? .white : .appTextPrimary)
            .cornerRadius(CornerRadius.md)
        }
        .accessibilityLabel(accessibilityLabelText)
        .accessibilityValue(accessibilityValueText)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
        .accessibilityHint("kitchen_category_filter_hint".localized)
    }

    private var accessibilityLabelText: String {
        return title
    }

    private var accessibilityValueText: String {
        if count > 0 {
            return String(format: "kitchen_category_count_format".localized, count)
        } else {
            return "kitchen_category_no_items".localized
        }
    }
}

// MARK: - Kitchen Stats Card

struct KitchenStatCard: View {
    let value: String
    let label: String
    let color: Color
    @EnvironmentObject private var localizationManager: LocalizationManager
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.cardTitle)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text(label)
                .font(.captionRegular)
                .foregroundColor(.appTextSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, Spacing.sm)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.sm)
    }
}

// MARK: - Kitchen Item Card (for main list)

struct KitchenItemCard: View {
    let item: GroupedItem
    let onStatusTap: () -> Void
    let onDetailTap: () -> Void
    @EnvironmentObject private var localizationManager: LocalizationManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Header with priority and time
            HStack {
                if item.priority >= KitchenBoardConfig.urgentThreshold {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text("kitchen_urgent".localized)
                            .font(.captionBold)
                    }
                    .foregroundColor(.appError)
                    .padding(Spacing.xs)
                    .background(Color.appError.opacity(0.1))
                    .cornerRadius(CornerRadius.sm)
                }
                
                Spacer()
                
                Text(timeAgoText)
                    .font(.captionRegular)
                    .foregroundColor(.appTextSecondary)
            }
            
            // Item name and prominent quantity
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(item.itemName)
                        .font(.cardTitle)
                        .lineLimit(2)
                    
                    // Size if available
                    if let size = item.size {
                        Text("kitchen_size".localized + " \(size)")
                            .font(.bodyMedium)
                            .foregroundColor(.appTextSecondary)
                    }
                }
                
                Spacer()
                
                Text("×\(item.quantity)")
                    .font(.displayTitle)
                    .foregroundColor(.appWarning)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(Color.appWarning.opacity(0.1))
                    .cornerRadius(CornerRadius.md)
            }
            
            // Toppings/modifications
            if !item.toppings.isEmpty {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("kitchen_modifications".localized)
                        .font(.bodyMedium)
                        .fontWeight(.semibold)
                        .foregroundColor(.appTextSecondary)
                    
                    ForEach(item.toppings.prefix(3), id: \.self) { topping in
                        Text("• \(topping)")
                            .font(.bodyMedium)
                            .foregroundColor(.appInfo)
                    }
                    
                    if item.toppings.count > 3 {
                        Text("+ \(item.toppings.count - 3) more...")
                            .font(.bodyMedium)
                            .foregroundColor(.appTextSecondary)
                            .italic()
                    }
                }
                .padding(Spacing.md)
                .background(Color.appInfo.opacity(0.1))
                .cornerRadius(CornerRadius.sm)
            }
            
            // Notes
            if !item.displayNotes.isEmpty {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "note.text")
                        .foregroundColor(.appInfo)
                    Text(item.displayNotes)
                        .font(.bodyMedium)
                        .foregroundColor(.appInfo)
                        .lineLimit(2)
                }
                .padding(Spacing.md)
                .background(Color.appInfo.opacity(0.1))
                .cornerRadius(CornerRadius.sm)
            }
            
            // Tables with enhanced display
            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("kitchen_tables".localized)
                    .font(.sectionHeader)
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.sm) {
                        ForEach(Array(item.tables.sorted()), id: \.self) { table in
                            Text(table)
                                .font(.bodyMedium)
                                .fontWeight(.bold)
                                .padding(.horizontal, Spacing.sm)
                                .padding(.vertical, Spacing.xs)
                                .background(Color.appPrimary.opacity(0.1))
                                .foregroundColor(.appPrimary)
                                .cornerRadius(CornerRadius.sm)
                        }
                    }
                }
            }
            
            // Status and action button with clear instruction
            Button(action: onStatusTap) {
                HStack(spacing: Spacing.md) {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 16, height: 16)
                    
                    VStack(alignment: .leading, spacing: Spacing.xs) {
                        Text("kitchen_status".localized + " \(currentStatusText)")
                            .font(.bodyMedium)
                            .fontWeight(.semibold)
                        
                        Text("kitchen_tap_to".localized + " \(nextActionText)")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                }
                .padding(Spacing.md)
                .background(Color.appSurface)
                .cornerRadius(CornerRadius.md)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(Spacing.lg)
        .background(priorityBackgroundColor)
        .cornerRadius(CornerRadius.lg)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(priorityBorderColor, lineWidth: item.priority >= KitchenBoardConfig.urgentThreshold ? 2 : 1)
        )
        .scaleEffect(item.priority >= KitchenBoardConfig.urgentThreshold ? 1.02 : 1.0)
        .animation(.easeInOut(duration: 0.2), value: item.priority)
        .onTapGesture {
            onDetailTap()
        }
    }
    
    // MARK: - Computed Properties
    
    private var timeAgoText: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: item.orderTime, relativeTo: Date())
    }
    
    private var currentStatusText: String {
        return item.status.displayName
    }
    
    private var nextActionText: String {
        switch item.status {
        case .draft: return "kitchen_action_start".localized
        case .new: return "kitchen_action_start_preparing".localized
        case .preparing: return "kitchen_action_mark_ready".localized
        case .ready: return "kitchen_action_mark_served".localized
        case .served: return "kitchen_action_completed".localized
        case .cancelled: return "kitchen_action_cancel_order".localized
        }
    }
    
    private var statusColor: Color {
        switch item.status {
        case .draft: return .appTextSecondary
        case .new: return .appInfo
        case .preparing: return .appWarning
        case .ready: return .appSuccess
        case .served: return .appTextSecondary
        case .cancelled: return .appError
        }
    }
    
    private var priorityBackgroundColor: Color {
        if item.priority >= KitchenBoardConfig.urgentThreshold {
            return Color.appError.opacity(0.1)
        } else {
            return Color.appSurface
        }
    }
    
    private var priorityBorderColor: Color {
        if item.priority >= KitchenBoardConfig.urgentThreshold {
            return .appError
        }
        return statusColor.opacity(0.5)
    }
}

// MARK: - Status Columns View (New vs Preparing)

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
            // New Orders Column
            VStack(alignment: .leading, spacing: Spacing.md) {
                StatusColumnHeader(title: "kitchen_status_new".localized, count: newItems.count, color: .appInfo)
                
                ScrollView {
                    LazyVStack(spacing: Spacing.md) {
                        ForEach(newItems) { item in
                            CompactKitchenItemCard(
                                item: item,
                                onStatusTap: { onItemStatusTap(item) },
                                onDetailTap: { onItemDetailTap(item) }
                            )
                        }
                    }
                    .padding(.horizontal, Spacing.sm)
                }
            }
            .frame(maxWidth: .infinity)
            .background(Color.appInfo.opacity(0.05))
            .cornerRadius(CornerRadius.md)
            
            // Preparing Orders Column
            VStack(alignment: .leading, spacing: Spacing.md) {
                StatusColumnHeader(title: "kitchen_status_preparing".localized, count: preparingItems.count, color: .appWarning)
                
                ScrollView {
                    LazyVStack(spacing: Spacing.md) {
                        ForEach(preparingItems) { item in
                            CompactKitchenItemCard(
                                item: item,
                                onStatusTap: { onItemStatusTap(item) },
                                onDetailTap: { onItemDetailTap(item) }
                            )
                        }
                    }
                    .padding(.horizontal, Spacing.sm)
                }
            }
            .frame(maxWidth: .infinity)
            .background(Color.appWarning.opacity(0.05))
            .cornerRadius(CornerRadius.md)
        }
        .padding()
    }
}

// MARK: - Status Column Header

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

// MARK: - Compact Kitchen Item Card (Fixed Size)

struct CompactKitchenItemCard: View {
    let item: GroupedItem
    let onStatusTap: () -> Void
    let onDetailTap: () -> Void
    @EnvironmentObject private var localizationManager: LocalizationManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            // Item name - always visible
            
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
					HStack {
						Text(timeAgoText)
							.font(.captionRegular)
							.foregroundColor(timeColor)
							.padding(.vertical, Spacing.xxs)
							.padding(.horizontal, Spacing.xs)
							.background(timeColor.opacity(0.1))
							.cornerRadius(CornerRadius.xs)

						Text(item.itemName)
							.font(.sectionHeader)
							.lineLimit(2)
							.multilineTextAlignment(.leading)
							.fixedSize(horizontal: false, vertical: true)
					}
                    // Size if available
                    if let size = item.size {
                        Text("kitchen_size".localized + " \(size)")
                            .font(.bodyMedium)
                            .foregroundColor(.appTextSecondary)
                    }
                }
                
                Spacer()
                
                Text("×\(item.quantity)")
                    .font(.sectionHeader)
                    .foregroundColor(.appWarning)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(Color.appWarning.opacity(0.1))
                    .cornerRadius(CornerRadius.md)
            }
            
            // Tables - compact display
            if !item.tables.isEmpty {
                HStack {
                    Text("kitchen_tables".localized)
                        .font(.captionRegular)
                        .foregroundColor(.appTextSecondary)
                    
                    Text(Array(item.tables.sorted()).joined(separator: ", "))
                        .font(.bodyMedium)
                        .fontWeight(.semibold)
                        .foregroundColor(.appPrimary)
                        .lineLimit(1)
                }
            }
            
            // Notes - if any
            if !item.displayNotes.isEmpty {
                Text(item.displayNotes)
                    .font(.captionRegular)
                    .foregroundColor(.appInfo)
                    .lineLimit(1)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(Color.appInfo.opacity(0.1))
                    .cornerRadius(CornerRadius.xs)
            }
            
            Spacer(minLength: 0)
            
            // Status action button - always visible
            Button(action: onStatusTap) {
                HStack {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 8, height: 8)
                    
                    Text(nextActionText)
                        .font(.captionBold)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.captionRegular)
                }
                .foregroundColor(statusColor)
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.sm)
                .background(statusColor.opacity(0.1))
                .cornerRadius(CornerRadius.sm)
            }
        }
        .padding(Spacing.md)
        .frame(minHeight: 160)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(priorityBorderColor, lineWidth: item.priority >= KitchenBoardConfig.urgentThreshold ? 2 : 0.5)
        )
        .onTapGesture {
            onDetailTap()
        }
    }
    
    // MARK: - Computed Properties
    
    private var timeAgoText: String {
        let interval = Date().timeIntervalSince(item.orderTime)
        let minutes = Int(interval / 60)
        
        if minutes < 1 {
            return "kitchen_just_now".localized
        } else if minutes < 60 {
            return "\(minutes)m"
        } else {
            let hours = minutes / 60
            return "\(hours)h"
        }
    }
    
    private var timeColor: Color {
        let interval = Date().timeIntervalSince(item.orderTime)
        let minutes = Int(interval / 60)
        
        if minutes < 10 {
            return .appSuccess
        } else if minutes < 20 {
            return .appWarning
        } else {
            return .appError
        }
    }
    
    private var statusColor: Color {
        switch item.status {
        case .draft: return .appTextSecondary
        case .new: return .appInfo
        case .preparing: return .appWarning
        case .ready: return .appSuccess
        case .served: return .appTextSecondary
        case .cancelled: return .appError
        }
    }
    
    private var nextActionText: String {
        switch item.status {
        case .draft: return "kitchen_action_start".localized
        case .new: return "kitchen_action_start_preparing".localized
        case .preparing: return "kitchen_action_mark_ready".localized
        case .ready: return "kitchen_action_mark_served".localized
        case .served: return "kitchen_action_completed".localized
        case .cancelled: return "kitchen_action_cancel_order".localized
        }
    }
    
    private var priorityBorderColor: Color {
        if item.priority >= KitchenBoardConfig.urgentThreshold {
            return .appError
        } else {
            return statusColor.opacity(0.3)
        }
    }
}

#if DEBUG
#Preview("KitchenItemCard") {
    let mockCategory = Category(id: "1", name_en: "Main", name_ja: "メイン", name_vi: "Món chính", position: 1)
    let mockMenuItem = MenuItem(id: "1", restaurant_id: "1", category_id: "1", name_en: "Steak", name_ja: "ステーキ", name_vi: "Bò bít tết", code: "STK", description_en: "A juicy steak", description_ja: "ジューシーなステーキ", description_vi: "Bò bít tết ngon ngọt", price: 25.0, tags: [], image_url: nil, stock_level: nil, available: true, position: 1, created_at: "", updated_at: "", category: mockCategory, availableSizes: [], availableToppings: [])
    let mockOrderItem = OrderItem(id: "1", restaurant_id: "1", order_id: "1", menu_item_id: "1", quantity: 1, notes: "Medium rare", menu_item_size_id: nil, topping_ids: [], price_at_order: 25.0, status: .preparing, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", menu_item: mockMenuItem)
    let mockGroupedItem = GroupedItem(itemId: "1", itemName: "Steak", quantity: 1, tables: ["Table 1"], orderItems: [mockOrderItem], categoryName: "Main", notes: "Medium rare", orderTime: Date().addingTimeInterval(-300), priority: 5, status: .preparing)

    return KitchenItemCard(item: mockGroupedItem, onStatusTap: {}, onDetailTap: {})
        .environmentObject(LocalizationManager.shared)
}

#Preview("CompactKitchenItemCard") {
    let mockCategory = Category(id: "1", name_en: "Main", name_ja: "メイン", name_vi: "Món chính", position: 1)
    let mockMenuItem = MenuItem(id: "1", restaurant_id: "1", category_id: "1", name_en: "Steak", name_ja: "ステーキ", name_vi: "Bò bít tết", code: "STK", description_en: "A juicy steak", description_ja: "ジューシーなステーキ", description_vi: "Bò bít tết ngon ngọt", price: 25.0, tags: [], image_url: nil, stock_level: nil, available: true, position: 1, created_at: "", updated_at: "", category: mockCategory, availableSizes: [], availableToppings: [])
    let mockOrderItem = OrderItem(id: "1", restaurant_id: "1", order_id: "1", menu_item_id: "1", quantity: 1, notes: "Medium rare", menu_item_size_id: nil, topping_ids: [], price_at_order: 25.0, status: .new, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", menu_item: mockMenuItem)
    let mockGroupedItem = GroupedItem(itemId: "1", itemName: "Steak", quantity: 1, tables: ["Table 1"], orderItems: [mockOrderItem], categoryName: "Main", notes: "Medium rare", orderTime: Date(), priority: 1, status: .new)

    return CompactKitchenItemCard(item: mockGroupedItem, onStatusTap: {}, onDetailTap: {})
        .environmentObject(LocalizationManager.shared)
}
#endif

// MARK: - Category Group View

struct CategoryGroupView: View {
    let categoryGroup: CategoryGroup
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void
    @EnvironmentObject private var localizationManager: LocalizationManager
    
    private var columns: [GridItem] {
        [
            GridItem(.adaptive(minimum: 280, maximum: 400), spacing: 16)
        ]
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Category Header
            HStack {
                Text(categoryGroup.categoryName)
                    .font(.cardTitle)
                
                Spacer()
                
                Text(String(format: "kitchen_items_count_format".localized, categoryGroup.items.count))
                    .font(.captionBold)
                    .foregroundColor(.appTextPrimary)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(Color.appSurface)
                    .cornerRadius(CornerRadius.lg)
            }
            
            // Items Grid
            LazyVGrid(columns: columns, spacing: Spacing.md) {
                ForEach(categoryGroup.items) { item in
                    KitchenItemCard(
                        item: item,
                        onStatusTap: { onItemStatusTap(item) },
                        onDetailTap: { onItemDetailTap(item) }
                    )
                }
            }
        }
        .padding()
        .background(Color.appBackground)
        .cornerRadius(CornerRadius.lg)
        .shadow(color: Elevation.level1.color, radius: Elevation.level1.radius, y: Elevation.level1.y)
    }
}

// MARK: - Empty State View

struct KitchenEmptyStateView: View {
    let orderCount: Int
    let selectedCategory: String
    @EnvironmentObject private var localizationManager: LocalizationManager
    
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

// MARK: - Category Grid View (Improved)

struct CategoryGridView: View {
    let categoryGroups: [CategoryGroup]
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 20) {
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

// MARK: - Improved Category Group View

struct ImprovedCategoryGroupView: View {
    let categoryGroup: CategoryGroup
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void
    @EnvironmentObject private var localizationManager: LocalizationManager
    
    private var columns: [GridItem] {
        [
            GridItem(.adaptive(minimum: 300, maximum: 400), spacing: 16)
        ]
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Category Header
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
            
            // Items Grid with proper spacing and padding
            LazyVGrid(columns: columns, spacing: Spacing.md) {
                ForEach(categoryGroup.items) { item in
                    CompactKitchenItemCard(
                        item: item,
                        onStatusTap: { onItemStatusTap(item) },
                        onDetailTap: { onItemDetailTap(item) }
                    )
                }
            }
            .padding(.horizontal, Spacing.xs) // Additional padding for grid items
        }
        .padding(Spacing.lg)
        .background(Color.appBackground)
        .cornerRadius(CornerRadius.lg)
        .shadow(color: Elevation.level1.color, radius: Elevation.level1.radius, y: Elevation.level1.y)
    }
}

// MARK: - Kitchen List View (Mobile Horizontal Cards)

struct KitchenListView: View {
    let items: [GroupedItem]
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: 8) {
                ForEach(items) { item in
                    HorizontalKitchenItemCard(
                        item: item,
                        onStatusTap: { onItemStatusTap(item) },
                        onDetailTap: { onItemDetailTap(item) }
                    )
                }
            }
            .padding()
        }
    }
}

// MARK: - Horizontal Kitchen Item Card

struct HorizontalKitchenItemCard: View {
    let item: GroupedItem
    let onStatusTap: () -> Void
    let onDetailTap: () -> Void
    @EnvironmentObject private var localizationManager: LocalizationManager
    
    var body: some View {
        HStack(spacing: Spacing.md) {
            // Status indicator
            VStack(spacing: Spacing.xs) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 16, height: 16)
                
                Text(timeAgoText)
                    .font(.captionRegular)
                    .foregroundColor(timeColor)
                    .padding(.horizontal, Spacing.xs)
                    .padding(.vertical, Spacing.xxs)
                    .background(timeColor.opacity(0.1))
                    .cornerRadius(CornerRadius.xs)
            }
            
            // Main content
            VStack(alignment: .leading, spacing: Spacing.sm) {
                // Title with quantity next to it
                HStack {
                    Text(item.itemName)
                        .font(.sectionHeader)
                        .lineLimit(1)
                    
                    Text("x\(item.quantity)")
                        .font(.cardTitle)
                        .foregroundColor(.appWarning)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(Color.appWarning.opacity(0.1))
                        .cornerRadius(CornerRadius.sm)
                    
                    Spacer()
                }
                
                // Tables with enhanced visibility
                if !item.tables.isEmpty {
                    HStack {
                        Text("kitchen_tables".localized)
                            .font(.bodyMedium)
                            .fontWeight(.semibold)
                            .foregroundColor(.appTextPrimary)
                        
                        Text(Array(item.tables.sorted()).joined(separator: ", "))
                            .font(.bodyMedium)
                            .fontWeight(.bold)
                            .foregroundColor(.appPrimary)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.xs)
                            .background(Color.appPrimary.opacity(0.1))
                            .cornerRadius(CornerRadius.sm)
                    }
                }
                
                // Notes if any
                if !item.displayNotes.isEmpty {
                    Text(item.displayNotes)
                        .font(.captionRegular)
                        .foregroundColor(.appInfo)
                        .lineLimit(2)
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.xs)
                        .background(Color.appInfo.opacity(0.1))
                        .cornerRadius(CornerRadius.sm)
                }
            }
            
            // Action button with clear instruction
            Button(action: onStatusTap) {
                VStack(spacing: Spacing.xs) {
                    Image(systemName: actionIcon)
                        .font(.cardTitle)
                    Text("kitchen_tap_to".localized)
                        .font(.captionRegular)
                        .foregroundColor(.appSurface.opacity(0.8))
                    Text(actionText)
                        .font(.captionBold)
                }
                .foregroundColor(.appSurface)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .background(statusColor)
                .cornerRadius(CornerRadius.md)
            }
        }
        .padding(Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(priorityBorderColor, lineWidth: item.priority >= KitchenBoardConfig.urgentThreshold ? 2 : 0.5)
        )
        .onTapGesture {
            onDetailTap()
        }
    }
    
    // MARK: - Computed Properties
    
    private var timeAgoText: String {
        let interval = Date().timeIntervalSince(item.orderTime)
        let minutes = Int(interval / 60)
        
        if minutes < 1 {
            return "kitchen_now".localized
        } else if minutes < 60 {
            return "\(minutes)m"
        } else {
            let hours = minutes / 60
            return "\(hours)h"
        }
    }
    
    private var timeColor: Color {
        let interval = Date().timeIntervalSince(item.orderTime)
        let minutes = Int(interval / 60)

        if minutes < 10 {
            return .appSuccess
        } else if minutes < 20 {
            return .appWarning
        } else {
            return .appError
        }
    }

    private var statusColor: Color {
        switch item.status {
        case .draft: return .appTextSecondary
        case .new: return .appInfo
        case .preparing: return .appWarning
        case .ready: return .appSuccess
        case .served: return .appTextSecondary
		case .cancelled: return .appError
        }
    }
    
    private var actionText: String {
        switch item.status {
        case .draft: return "kitchen_action_start".localized
        case .new: return "kitchen_action_start".localized
        case .preparing: return "kitchen_action_ready".localized
        case .ready: return "kitchen_action_serve".localized
        case .served: return "kitchen_action_done".localized
		case .cancelled: return "kitchen_action_reorder".localized
        }
    }
    
    private var actionIcon: String {
        switch item.status {
        case .draft: return "doc.plaintext"
        case .new: return "play.fill"
        case .preparing: return "checkmark.circle.fill"
        case .ready: return "hand.raised.fill"
        case .served: return "checkmark.circle.fill"
		case .cancelled: return "arrow.clockwise"
        }
    }
    
    private var priorityBorderColor: Color {
        if item.priority >= KitchenBoardConfig.urgentThreshold {
            return .appError
        } else {
            return statusColor.opacity(0.3)
        }
    }
}

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
        VStack(alignment: .leading, spacing: 16) {
            // Header with priority and time
            HStack {
                if item.priority >= KitchenBoardConfig.urgentThreshold {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text("kitchen_urgent".localized)
                            .font(.caption)
                            .fontWeight(.bold)
                    }
                    .foregroundColor(.appError)
                    .padding(Spacing.xs)
                    .background(Color.appError.opacity(0.2))
                    .cornerRadius(CornerRadius.sm)
                }
                
                Spacer()
                
                Text(timeAgoText)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.appTextSecondary)
            }
            
            // Item name and prominent quantity
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    Text(item.itemName)
                        .font(.title2)
                        .fontWeight(.bold)
                        .lineLimit(2)
                    
                    // Size if available
                    if let size = item.size {
                        Text("kitchen_size".localized + " \(size)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.appTextSecondary)
                    }
                }
                
                Spacer()
                
                Text("×\(item.quantity)")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.orange)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.orange.opacity(0.2))
                    .cornerRadius(16)
            }
            
            // Toppings/modifications
            if !item.toppings.isEmpty {
                VStack(alignment: .leading, spacing: 6) {
                    Text("kitchen_modifications".localized)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.appTextSecondary)
                    
                    ForEach(item.toppings.prefix(3), id: \.self) { topping in
                        Text("• \(topping)")
                            .font(.subheadline)
                            .foregroundColor(.blue)
                    }
                    
                    if item.toppings.count > 3 {
                        Text("+ \(item.toppings.count - 3) more...")
                            .font(.subheadline)
                            .foregroundColor(.appTextSecondary)
                            .italic()
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
            }
            
            // Notes
            if !item.displayNotes.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "note.text")
                        .foregroundColor(.blue)
                    Text(item.displayNotes)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.blue)
                        .lineLimit(2)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(12)
            }
            
            // Tables with enhanced display
            VStack(alignment: .leading, spacing: 8) {
                Text("kitchen_tables".localized)
                    .font(.headline)
                    .fontWeight(.semibold)
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(Array(item.tables.sorted()), id: \.self) { table in
                            Text(table)
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Color.blue.opacity(0.2))
                                .foregroundColor(.blue)
                                .cornerRadius(12)
                        }
                    }
                }
            }
            
            // Status and action button with clear instruction
            Button(action: onStatusTap) {
                HStack(spacing: 12) {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 16, height: 16)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("kitchen_status".localized + " \(currentStatusText)")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                        
                        Text("kitchen_tap_to".localized + " \(nextActionText)")
                            .font(.caption)
                            .foregroundColor(.appTextSecondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.subheadline)
                        .foregroundColor(.appTextSecondary)
                }
                .padding(16)
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(20)
        .background(priorityBackgroundColor)
        .cornerRadius(16)
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
        case .draft: return .gray
        case .new: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
		case .cancelled: return .red
        }
    }
    
    private var priorityBackgroundColor: Color {
        if item.priority >= KitchenBoardConfig.urgentThreshold {
            return Color.red.opacity(0.1)
        } else {
            switch item.status {
            case .draft: return Color.gray.opacity(0.03)
            case .new: return Color.blue.opacity(0.03)
            case .preparing: return Color.orange.opacity(0.03)
            case .ready: return Color.green.opacity(0.03)
            case .served: return Color.gray.opacity(0.03)
			case .cancelled: return Color.red.opacity(0.03)
            }
        }
    }
    
    private var priorityBorderColor: Color {
        switch item.status {
        case .draft: return .gray
        case .new: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
		case .cancelled: return .red
        }
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
        HStack(spacing: 16) {
            // New Orders Column
            VStack(alignment: .leading, spacing: 12) {
                StatusColumnHeader(title: "kitchen_status_new_orders".localized, count: newItems.count, color: .blue)
                
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(newItems) { item in
                            CompactKitchenItemCard(
                                item: item,
                                onStatusTap: { onItemStatusTap(item) },
                                onDetailTap: { onItemDetailTap(item) }
                            )
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .frame(maxWidth: .infinity)
            .background(Color.blue.opacity(0.05))
            .cornerRadius(12)
            
            // Preparing Orders Column
            VStack(alignment: .leading, spacing: 12) {
                StatusColumnHeader(title: "kitchen_status_preparing".localized, count: preparingItems.count, color: .orange)
                
                ScrollView {
                    LazyVStack(spacing: 12) {
                        ForEach(preparingItems) { item in
                            CompactKitchenItemCard(
                                item: item,
                                onStatusTap: { onItemStatusTap(item) },
                                onDetailTap: { onItemDetailTap(item) }
                            )
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .frame(maxWidth: .infinity)
            .background(Color.orange.opacity(0.05))
            .cornerRadius(12)
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
                .font(.headline)
                .fontWeight(.semibold)
                .foregroundColor(color)
            
            Spacer()
            
            Text("\(count)")
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(color)
                .cornerRadius(12)
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
        VStack(alignment: .leading, spacing: 4) {
            // Item name - always visible
            
            HStack {
                VStack(alignment: .leading, spacing: 3) {
					HStack {
						Text(timeAgoText)
							.font(.caption)
							.fontWeight(.medium)
							.foregroundColor(timeColor)
							.padding(.vertical, 2)
							.padding(.horizontal, 2)
							.background(timeColor.opacity(0.15))
							.cornerRadius(6)

						Text(item.itemName)
							.font(.headline)                            .fontWeight(.bold)
							.lineLimit(2)
							.multilineTextAlignment(.leading)
							.fixedSize(horizontal: false, vertical: true)
					}
                    // Size if available
                    if let size = item.size {
                        Text("kitchen_size".localized + " \(size)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.appTextSecondary)
                    }
                }
                
                Spacer()
                
                Text("×\(item.quantity)")
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundColor(.orange)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color.orange.opacity(0.2))
                    .cornerRadius(16)
            }
            
            // Tables - compact display
            if !item.tables.isEmpty {
                HStack {
                    Text("kitchen_tables".localized)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.appTextSecondary)
                    
                    Text(Array(item.tables.sorted()).joined(separator: ", "))
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.blue)
                        .lineLimit(1)
                }
            }
            
            // Notes - if any
            if !item.displayNotes.isEmpty {
                Text(item.displayNotes)
                    .font(.caption)
                    .foregroundColor(.blue)
                    .lineLimit(1)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(6)
            }
            
            Spacer(minLength: 0)
            
            // Status action button - always visible
            Button(action: onStatusTap) {
                HStack {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 8, height: 8)
                    
                    Text(nextActionText)
                        .font(.caption)
                        .fontWeight(.semibold)
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                }
                .foregroundColor(statusColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 12)
                .background(statusColor.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding(12)
        .frame(minHeight: 160)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))
        .cornerRadius(12)
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
            return .green
        } else if minutes < 20 {
            return .orange
        } else {
            return .red
        }
    }
    
    private var statusColor: Color {
        switch item.status {
        case .draft: return .gray
        case .new: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
		case .cancelled: return .red
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
            return .red
        } else {
            return statusColor.opacity(0.3)
        }
    }
}

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
        VStack(alignment: .leading, spacing: 12) {
            // Category Header
            HStack {
                Text(categoryGroup.categoryName)
                    .font(.title2)
                    .fontWeight(.bold)
                
                Spacer()
                
                Text("kitchen_items_count".localized.replacingOccurrences(of: "{count}", with: "\(categoryGroup.items.count)"))
                    .font(.caption)
                    .foregroundColor(.appTextSecondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(.systemGray5))
                    .cornerRadius(12)
            }
            
            // Items Grid
            LazyVGrid(columns: columns, spacing: 16) {
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
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
    }
}

// MARK: - Empty State View

struct KitchenEmptyStateView: View {
    let orderCount: Int
    let selectedCategory: String
    @EnvironmentObject private var localizationManager: LocalizationManager
    
    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)
            
            VStack(spacing: 8) {
                Text("kitchen_empty_all_caught_up".localized)
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("kitchen_empty_no_items".localized)
                    .font(.subheadline)
                    .foregroundColor(.appTextSecondary)
            }
            
            if orderCount > 0 {
                Text("kitchen_empty_total_orders".localized.replacingOccurrences(of: "{count}", with: "\(orderCount)"))
                    .font(.caption)
                    .foregroundColor(.appTextSecondary)
            } else {
                Text("kitchen_empty_no_orders".localized)
                    .font(.caption)
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
        VStack(alignment: .leading, spacing: 16) {
            // Category Header
            HStack {
                Text(categoryGroup.categoryName)
                    .font(.title2)
                    .fontWeight(.bold)
                
                Spacer()
                
                Text("kitchen_items_count".localized.replacingOccurrences(of: "{count}", with: "\(categoryGroup.items.count)"))
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(.appTextSecondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color(.systemGray5))
                    .cornerRadius(12)
            }
            
            // Items Grid with proper spacing and padding
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(categoryGroup.items) { item in
                    CompactKitchenItemCard(
                        item: item,
                        onStatusTap: { onItemStatusTap(item) },
                        onDetailTap: { onItemDetailTap(item) }
                    )
                }
            }
            .padding(.horizontal, 4) // Additional padding for grid items
        }
        .padding(20)
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 8, x: 0, y: 4)
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
        HStack(spacing: 16) {
            // Status indicator
            VStack(spacing: 4) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 16, height: 16)
                
                Text(timeAgoText)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(timeColor)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(timeColor.opacity(0.15))
                    .cornerRadius(6)
            }
            
            // Main content
            VStack(alignment: .leading, spacing: 8) {
                // Title with quantity next to it
                HStack {
                    Text(item.itemName)
                        .font(.headline)
                        .fontWeight(.bold)
                        .lineLimit(1)
                    
                    Text("x\(item.quantity)")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.orange.opacity(0.2))
                        .cornerRadius(8)
                    
                    Spacer()
                }
                
                // Tables with enhanced visibility
                if !item.tables.isEmpty {
                    HStack {
                        Text("kitchen_tables".localized)
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        Text(Array(item.tables.sorted()).joined(separator: ", "))
                            .font(.subheadline)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.1))
                            .cornerRadius(8)
                    }
                }
                
                // Notes if any
                if !item.displayNotes.isEmpty {
                    Text(item.displayNotes)
                        .font(.caption)
                        .foregroundColor(.blue)
                        .lineLimit(2)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.blue.opacity(0.1))
                        .cornerRadius(8)
                }
            }
            
            // Action button with clear instruction
            Button(action: onStatusTap) {
                VStack(spacing: 6) {
                    Image(systemName: actionIcon)
                        .font(.title2)
                    Text("kitchen_tap_to".localized)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(actionText)
                        .font(.caption)
                        .fontWeight(.bold)
                }
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .background(statusColor)
                .cornerRadius(12)
            }
        }
        .padding(16)
        .background(Color(.systemBackground))
        .cornerRadius(12)
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
            return .green
        } else if minutes < 20 {
            return .orange
        } else {
            return .red
        }
    }
    
    private var statusColor: Color {
        switch item.status {
        case .draft: return .gray
        case .new: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
		case .cancelled: return .red
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
            return .red
        } else {
            return statusColor.opacity(0.3)
        }
    }
}

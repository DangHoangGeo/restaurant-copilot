import SwiftUI

// MARK: - Filter Chip Component

struct CategoryFilterChip: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let color: Color
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                Text(title)
                    .font(.caption)
                    .fontWeight(.medium)
                
                if count > 0 {
                    Text("\(count)")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(4)
                        .background(color)
                        .clipShape(Circle())
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? color.opacity(0.8) : Color(.systemGray5))
            .foregroundColor(isSelected ? .white : .primary)
            .cornerRadius(16)
        }
    }
}

// MARK: - Kitchen Stats Card

struct KitchenStatCard: View {
    let value: String
    let label: String
    let color: Color
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(color)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
        .cornerRadius(8)
    }
}

// MARK: - Kitchen Item Card (for main list)

struct KitchenItemCard: View {
    let item: GroupedItem
    let onStatusTap: () -> Void
    let onDetailTap: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with priority and time
            HStack {
                if item.priority >= KitchenBoardConfig.urgentThreshold {
                    HStack(spacing: 4) {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text("URGENT")
                            .font(.caption)
                            .fontWeight(.bold)
                    }
                    .foregroundColor(.red)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color.red.opacity(0.2))
                    .cornerRadius(8)
                }
                
                Spacer()
                
                Text(timeAgoText)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Item name and quantity
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.itemName)
                        .font(.headline)
                        .fontWeight(.bold)
                        .lineLimit(2)
                    
                    // Size if available
                    if let size = item.size {
                        Text("Size: \(size)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                Text("×\(item.quantity)")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.orange)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.orange.opacity(0.2))
                    .cornerRadius(12)
            }
            
            // Toppings/modifications
            if !item.toppings.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Modifications:")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)
                    
                    ForEach(item.toppings.prefix(3), id: \.self) { topping in
                        Text("• \(topping)")
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                    
                    if item.toppings.count > 3 {
                        Text("+ \(item.toppings.count - 3) more...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .italic()
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            }
            
            // Notes
            if !item.displayNotes.isEmpty {
                HStack(spacing: 4) {
                    Image(systemName: "note.text")
                        .foregroundColor(.blue)
                    Text(item.displayNotes)
                        .font(.subheadline)
                        .foregroundColor(.blue)
                        .fontWeight(.medium)
                        .lineLimit(2)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            }
            
            // Tables
            HStack {
                Text("Tables:")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(Array(item.tables.sorted()), id: \.self) { table in
                            Text(table)
                                .font(.caption)
                                .fontWeight(.medium)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.blue.opacity(0.2))
                                .foregroundColor(.blue)
                                .cornerRadius(12)
                        }
                    }
                }
            }
            
            // Status and action button
            Button(action: onStatusTap) {
                HStack(spacing: 8) {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 12, height: 12)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Status: \(currentStatusText)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        Text("Tap to \(nextActionText)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding()
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
        case .ordered: return "start preparing"
        case .preparing: return "mark ready"
        case .ready: return "mark served"
        case .served: return "completed"
        }
    }
    
    private var statusColor: Color {
        switch item.status {
        case .ordered: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
        }
    }
    
    private var priorityBackgroundColor: Color {
        if item.priority >= KitchenBoardConfig.urgentThreshold {
            return Color.red.opacity(0.1)
        } else {
            switch item.status {
            case .ordered: return Color.blue.opacity(0.03)
            case .preparing: return Color.orange.opacity(0.03)
            case .ready: return Color.green.opacity(0.03)
            case .served: return Color.gray.opacity(0.03)
            }
        }
    }
    
    private var priorityBorderColor: Color {
        switch item.status {
        case .ordered: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
        }
    }
}

// MARK: - Category Group View

struct CategoryGroupView: View {
    let categoryGroup: CategoryGroup
    let onItemStatusTap: (GroupedItem) -> Void
    let onItemDetailTap: (GroupedItem) -> Void
    
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
                
                Text("\(categoryGroup.items.count) items")
                    .font(.caption)
                    .foregroundColor(.secondary)
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
    
    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 60))
                .foregroundColor(.green)
            
            VStack(spacing: 8) {
                Text("All Caught Up!")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Text("No items need preparation")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            if orderCount > 0 {
                Text("There are \(orderCount) total orders")
                    .font(.caption)
                    .foregroundColor(.secondary)
            } else {
                Text("Looks like there are no orders yet.")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }
}

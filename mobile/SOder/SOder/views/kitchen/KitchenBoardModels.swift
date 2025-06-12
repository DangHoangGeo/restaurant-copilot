import SwiftUI
import Foundation

// MARK: - Data Models

// MARK: - Kitchen View Layout Modes
enum KitchenViewMode: String, CaseIterable {
    case statusColumns = "status_columns"
    case categoryGrid = "category_grid"
    case list = "list"
    
    var displayName: String {
        switch self {
        case .statusColumns: return "Status Columns"
        case .categoryGrid: return "Category Grid"
        case .list: return "List View"
        }
    }
    
    var icon: String {
        switch self {
        case .statusColumns: return "rectangle.split.2x1"
        case .categoryGrid: return "square.grid.2x2"
        case .list: return "list.bullet"
        }
    }
}

struct CategoryGroup: Identifiable {
    let id = UUID()
    let categoryName: String
    var items: [GroupedItem]
}

struct GroupedItem: Identifiable, Equatable, Hashable {
    let id = UUID()
    let itemId: String
    let itemName: String
    var quantity: Int
    var tables: Set<String>
    var orderItems: [OrderItem]
    let categoryName: String
    let notes: String?
    var orderTime: Date
    var priority: Int
    var status: OrderItemStatus

    // Computed properties for enhanced display
    var displayNotes: String {
        if let notes = notes, !notes.isEmpty {
            return notes
        }
        return orderItems.compactMap { $0.notes }.filter { !$0.isEmpty }.joined(separator: ", ")
    }
    
    var toppings: [String] {
        var list: [String] = []
        for item in orderItems {
            if let toppings = item.toppings {
                list.append(contentsOf: toppings.map { $0.displayName })
            } else if let notes = item.notes, !notes.isEmpty {
                list.append(contentsOf: notes.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) })
            }
        }
        return list
    }

    var size: String? {
        for item in orderItems {
            if let size = item.menu_item_size?.displayName {
                return size
            }
            if let notes = item.notes, !notes.isEmpty {
                let lowercased = notes.lowercased()
                if lowercased.contains("large") { return "Large" }
                if lowercased.contains("medium") { return "Medium" }
                if lowercased.contains("small") { return "Small" }
            }
        }
        return nil
    }
    
    // Equatable conformance
    static func == (lhs: GroupedItem, rhs: GroupedItem) -> Bool {
        return lhs.id == rhs.id &&
               lhs.itemId == rhs.itemId &&
               lhs.quantity == rhs.quantity &&
               lhs.status == rhs.status &&
               lhs.priority == rhs.priority
    }
    
    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
        hasher.combine(itemId)
        hasher.combine(status)
        hasher.combine(priority)
    }
}

// MARK: - Kitchen Board Configuration

struct KitchenBoardConfig {
    static let autoRefreshInterval: TimeInterval = 30.0
    static let urgentThreshold: Int = 4
    static let maxDisplayedTables: Int = 3
    static let urgentThresholdMinutes: Double = 10.0 // Example value: 10 minutes
    static func categoryPriority(_ categoryName: String) -> Int {
        switch categoryName {
        case "🥤 Drinks": return 1
        case "🥗 Appetizers": return 2
        case "🍽️ Main Dishes": return 3
        case "🍰 Desserts": return 4
        default: return 5
        }
    }
    
    static func colorForCategory(_ categoryName: String) -> Color {
        switch categoryName {
        case "🥤 Drinks": return .blue
        case "🥗 Appetizers": return .green
        case "🍽️ Main Dishes": return .orange
        case "🍰 Desserts": return .purple
        default: return .gray
        }
    }
}

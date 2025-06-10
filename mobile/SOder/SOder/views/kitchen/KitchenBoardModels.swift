import SwiftUI
import Foundation

// MARK: - Data Models

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
        // Extract toppings from notes or menu item details
        return orderItems.compactMap { item in
            if let notes = item.notes, !notes.isEmpty {
                // Parse toppings from notes (could be "Extra cheese, No onions")
                return notes.components(separatedBy: ",").map { $0.trimmingCharacters(in: .whitespaces) }
            }
            return nil
        }.flatMap { $0 }
    }
    
    var size: String? {
        // Extract size information from menu item or notes
        return orderItems.compactMap { item in
            if let notes = item.notes, !notes.isEmpty {
                let lowercased = notes.lowercased()
                if lowercased.contains("large") { return "Large" }
                if lowercased.contains("medium") { return "Medium" }
                if lowercased.contains("small") { return "Small" }
            }
            return nil
        }.first
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

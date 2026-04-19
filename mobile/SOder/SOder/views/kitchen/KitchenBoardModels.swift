import SwiftUI
import Foundation

// MARK: - Data Models

// MARK: - Kitchen View Layout Modes
enum KitchenViewMode: String, CaseIterable {
    case statusColumns = "status_columns"
    case categoryGrid = "category_grid"
    
    var displayName: String {
        switch self {
        case .statusColumns: return "kitchen_view_mode_status".localized
        case .categoryGrid: return "kitchen_view_mode_category".localized
        }
    }
    
    var icon: String {
        switch self {
        case .statusColumns: return "rectangle.split.2x1"
        case .categoryGrid: return "square.grid.2x2"
        }
    }
}

struct CategoryGroup: Identifiable {
    let id = UUID()
    let categoryName: String
    var items: [GroupedItem]
}

struct GroupedItem: Identifiable, Equatable, Hashable {
    let itemId: String
    var id: String { itemId }
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
        orderItems
            .flatMap { item in
                item.toppings?.map(\.displayName) ?? []
            }
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

    var tableNames: [String] {
        tables.sorted { lhs, rhs in
            lhs.localizedStandardCompare(rhs) == .orderedAscending
        }
    }

    var tableSummary: String {
        tableNames.joined(separator: ", ")
    }

    var ticketCount: Int {
        Set(orderItems.map(\.order_id)).count
    }
    
    // Equatable conformance
    static func == (lhs: GroupedItem, rhs: GroupedItem) -> Bool {
        return lhs.itemId == rhs.itemId &&
               lhs.quantity == rhs.quantity &&
               lhs.tables == rhs.tables &&
               lhs.status == rhs.status
    }
    
    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(itemId)
    }
}

struct KitchenGroupingEngine {
    static func buildCategoryGroups(from orders: [Order]) -> [CategoryGroup] {
        var groupedItemsByKey: [String: GroupedItem] = [:]

        let sortedOrders = orders.sorted { lhs, rhs in
            date(from: lhs.created_at) < date(from: rhs.created_at)
        }

        for order in sortedOrders {
            for orderItem in order.order_items ?? [] {
                guard let menuItem = orderItem.menu_item else { continue }
                guard KitchenBoardConfig.visibleStatuses.contains(orderItem.status) else { continue }

                let itemTime = date(from: orderItem.created_at)
                let groupingKey = itemGroupingKey(menuItem: menuItem, orderItem: orderItem)
                let tableName = order.table?.name ?? String(format: "order_table_number".localized, order.table_id)
                let quantity = max(orderItem.quantity, 1)
                let priority = priority(for: itemTime)

                if var existing = groupedItemsByKey[groupingKey] {
                    existing.quantity += quantity
                    existing.tables.insert(tableName)
                    existing.orderItems.append(orderItem)
                    existing.orderTime = min(existing.orderTime, itemTime)
                    existing.priority = max(existing.priority, priority)
                    groupedItemsByKey[groupingKey] = existing
                    continue
                }

                groupedItemsByKey[groupingKey] = GroupedItem(
                    itemId: groupingKey,
                    itemName: menuItem.displayName,
                    quantity: quantity,
                    tables: [tableName],
                    orderItems: [orderItem],
                    categoryName: menuItem.categoryDisplayName,
                    notes: normalizedNotes(orderItem.notes),
                    orderTime: itemTime,
                    priority: priority,
                    status: orderItem.status
                )
            }
        }

        let orderedItems = groupedItemsByKey.values.sorted(by: sortItems)
        let itemsByCategory = Dictionary(grouping: orderedItems, by: \.categoryName)

        return itemsByCategory.keys.sorted { lhs, rhs in
            KitchenBoardConfig.categoryPriority(lhs) < KitchenBoardConfig.categoryPriority(rhs)
        }.map { categoryName in
            CategoryGroup(
                categoryName: categoryName,
                items: itemsByCategory[categoryName, default: []]
            )
        }
    }

    static func sortItems(_ lhs: GroupedItem, _ rhs: GroupedItem) -> Bool {
        let lhsStatus = statusSortIndex(lhs.status)
        let rhsStatus = statusSortIndex(rhs.status)

        if lhsStatus != rhsStatus {
            return lhsStatus < rhsStatus
        }

        if lhs.orderTime != rhs.orderTime {
            return lhs.orderTime < rhs.orderTime
        }

        if lhs.priority != rhs.priority {
            return lhs.priority > rhs.priority
        }

        return lhs.itemName.localizedCaseInsensitiveCompare(rhs.itemName) == .orderedAscending
    }

    private static func itemGroupingKey(menuItem: MenuItem, orderItem: OrderItem) -> String {
        let sizeKey = orderItem.menu_item_size?.id ?? orderItem.menu_item_size_id ?? "no_size"
        let toppingKey = toppingIdentifiers(from: orderItem).sorted().joined(separator: ",")
        let notesKey = normalizedNotes(orderItem.notes) ?? "no_notes"
        return [
            menuItem.id,
            sizeKey,
            toppingKey.isEmpty ? "no_toppings" : toppingKey,
            notesKey,
            orderItem.status.rawValue
        ].joined(separator: "|")
    }

    private static func toppingIdentifiers(from orderItem: OrderItem) -> [String] {
        if let ids = orderItem.topping_ids, !ids.isEmpty {
            return ids
        }

        return orderItem.toppings?.map(\.id) ?? []
    }

    private static func normalizedNotes(_ notes: String?) -> String? {
        guard let notes else { return nil }

        let normalized = notes
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)

        return normalized.isEmpty ? nil : normalized
    }

    private static func statusSortIndex(_ status: OrderItemStatus) -> Int {
        switch status {
        case .new:
            return 0
        case .preparing:
            return 1
        case .ready:
            return 2
        case .served:
            return 3
        case .canceled:
            return 4
        case .draft:
            return 5
        }
    }

    private static func priority(for orderTime: Date) -> Int {
        let ageInMinutes = Date().timeIntervalSince(orderTime) / 60

        switch ageInMinutes {
        case 20...:
            return 5
        case KitchenBoardConfig.urgentThresholdMinutes...:
            return 4
        case 5...:
            return 2
        default:
            return 1
        }
    }

    private static func date(from dateString: String) -> Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        if let parsed = formatter.date(from: dateString) {
            return parsed
        }

        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: dateString) ?? Date()
    }
}

// MARK: - Kitchen Board Configuration

struct KitchenBoardConfig {
    static let autoRefreshInterval: TimeInterval = 30.0
    static let urgentThreshold: Int = 4
    static let visibleStatuses: [OrderItemStatus] = [.new, .preparing]
    static let maxDisplayedTables: Int = 3
    static let mobileGridMinimumCardWidth: CGFloat = 260
    static let regularGridMinimumCardWidth: CGFloat = 300
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
        case "🥤 Drinks": return .appInfo
        case "🥗 Appetizers": return .appSuccess
        case "🍽️ Main Dishes": return .appWarning
        case "🍰 Desserts": return .appPrimary
        default: return .appTextSecondary
        }
    }
}

import Foundation

/// Represents the state of an order.
struct Order: Identifiable, Equatable, Decodable {
    let id: String
    let tableId: String
    var totalAmount: Double
    var status: OrderStatus
    let createdAt: Date
    var items: [OrderItem]

    // Custom initializer to parse from a dictionary (e.g., from Supabase)
    init?(from dict: [String: Any]) {
        guard let id = dict["id"] as? String,
              let tableId = dict["table_id"] as? String,
              let totalAmount = dict["total_amount"] as? Double,
              let statusString = dict["status"] as? String,
              let status = OrderStatus(rawValue: statusString),
              let createdAtString = dict["created_at"] as? String,
              let createdAt = ISO8601DateFormatter().date(from: createdAtString),
              let itemsArray = dict["items"] as? [[String: Any]] else {
            return nil
        }

        self.id = id
        self.tableId = tableId
        self.totalAmount = totalAmount
        self.status = status
        self.createdAt = createdAt
        self.items = itemsArray.compactMap { OrderItem(from: $0) }

        if !itemsArray.isEmpty && self.items.count != itemsArray.count {
            print("Warning: Not all order items could be parsed for order \(id).")
        }
    }
}

struct OrderItem: Identifiable, Codable, Equatable {
    let id: String
    let menuItemId: String
    let menuItemName: String
    var quantity: Int
    var notes: String?

    init?(from dict: [String: Any]) {
        guard let id = dict["id"] as? String,
              let menuItemId = dict["menu_item_id"] as? String,
              let menuItemName = dict["menu_item_name"] as? String,
              let quantity = dict["quantity"] as? Int else {
            return nil
        }
        self.id = id
        self.menuItemId = menuItemId
        self.menuItemName = menuItemName
        self.quantity = quantity
        self.notes = dict["notes"] as? String
    }
}

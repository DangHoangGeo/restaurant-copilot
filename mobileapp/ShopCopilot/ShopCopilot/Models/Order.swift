import Foundation

struct Order: Identifiable, Codable {
    let id: String
    let tableId: String
    var totalAmount: Double
    var status: OrderStatus // Changed to OrderStatus
    let createdAt: Date
    var items: [OrderItem]

    // Custom initializer to parse from a dictionary (e.g., from Supabase)
    init?(from dict: [String: Any]) {
        guard let id = dict["id"] as? String, // Assuming UUID is sent as String
              let tableId = dict["table_id"] as? String,
              let totalAmount = dict["total_amount"] as? Double,
              let statusString = dict["status"] as? String, // Read as String first
              let status = OrderStatus(rawValue: statusString), // Then initialize OrderStatus
              let createdAtString = dict["created_at"] as? String,
              let createdAt = ISO8601DateFormatter().date(from: createdAtString),
              let itemsArray = dict["items"] as? [[String: Any]] else {
            return nil
        }

        self.id = id
        self.tableId = tableId
        self.totalAmount = totalAmount
        self.status = status // Assign OrderStatus
        self.createdAt = createdAt
        self.items = itemsArray.compactMap { OrderItem(from: $0) }

        // Ensure all items were parsed correctly if items array was not empty
        if !itemsArray.isEmpty && self.items.count != itemsArray.count {
             // This could indicate some OrderItems failed to initialize.
             // Depending on strictness, you might want to return nil here.
             print("Warning: Not all order items could be parsed for order \(id).")
        }
    }
}

struct OrderItem: Identifiable, Codable { // Added Codable
    let id: String // Assuming UUID is sent as String for id
    let menuItemId: String // Assuming UUID for menu_item_id
    let menuItemName: String
    var quantity: Int
    var notes: String?

    // Custom initializer to parse from a dictionary
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

import Foundation

struct Order: Identifiable {
    let id: String
    let tableId: String
    var totalAmount: Double
    var status: String
    let createdAt: Date
    var items: [OrderItem]
}

struct OrderItem: Identifiable {
    let id: String
    let menuItemId: String
    let menuItemName: String
    var quantity: Int
    var notes: String?
}

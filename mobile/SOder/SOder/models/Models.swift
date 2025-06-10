import Foundation

// MARK: - Order Models
struct Order: Decodable, Identifiable, Equatable, Hashable {
    let id: String
    let restaurant_id: String
    let table_id: String
    let session_id: String
    let guest_count: Int
    var status: OrderStatus
    let total_amount: Double?
    let created_at: String
    var updated_at: String
    
    // Related data
    var table: Table?
    var order_items: [OrderItem]?
    
    // Equatable conformance
    static func == (lhs: Order, rhs: Order) -> Bool {
        return lhs.id == rhs.id &&
               lhs.status == rhs.status &&
               lhs.updated_at == rhs.updated_at &&
               lhs.order_items?.count == rhs.order_items?.count
    }
    
    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
        hasher.combine(status)
        hasher.combine(updated_at)
    }
}

enum OrderStatus: String, Decodable, CaseIterable {
    case new = "new"
    case ordered = "ordered"  // Add missing ordered case
    case preparing = "preparing"
    case ready = "ready"
    case completed = "completed"
    
    
    var displayName: String {
        switch self {
        case .new: return "New"
        case .ordered: return "Ordered"  // Add display name for ordered
        case .preparing: return "Preparing"
        case .ready: return "Ready"
        case .completed: return "Completed"
        }
    }
    
    var color: String {
        switch self {
        case .new: return "blue"
        case .ordered: return "blue"  // Add color for ordered
        case .preparing: return "orange"
        case .ready: return "green"
        case .completed: return "gray"
        }
    }
}

struct OrderItem: Decodable, Identifiable {
    let id: String
    let restaurant_id: String
    let order_id: String
    let menu_item_id: String
    let quantity: Int
    let notes: String?
    var status: OrderItemStatus
    let created_at: String
    var updated_at: String
    
    // Related data
    var menu_item: MenuItem?
}

enum OrderItemStatus: String, Decodable, CaseIterable, Comparable {
    case ordered = "ordered"
    case preparing = "preparing"
    case ready = "ready"
    case served = "served"
    case cancelled = "cancelled"
    
    var displayName: String {
        switch self {
        case .ordered: return "Ordered"
        case .preparing: return "Preparing"
        case .ready: return "Ready"
        case .served: return "Served"
        case .cancelled: return "Cancelled"
        }
    }
    
    var color: String {
        switch self {
        case .ordered: return "blue"
        case .preparing: return "orange"
        case .ready: return "green"
        case .served: return "gray"
        case .cancelled: return "red"
        }
    }
    
    // Comparable conformance - defines ordering for status progression
    static func < (lhs: OrderItemStatus, rhs: OrderItemStatus) -> Bool {
        let order: [OrderItemStatus] = [.ordered, .preparing, .ready, .served, .cancelled]
        guard let lhsIndex = order.firstIndex(of: lhs),
              let rhsIndex = order.firstIndex(of: rhs) else {
            return false
        }
        return lhsIndex < rhsIndex
    }
}

// MARK: - Category Model
struct Category: Decodable, Identifiable {
    let id: String
    let name_en: String
    let name_ja: String
    let name_vi: String
    
    // Helper to get localized name (defaulting to English)
    var displayName: String {
        return name_en // You can implement locale-based selection later
    }
}

struct MenuItem:  Decodable, Identifiable {
    let id: String
    let restaurant_id: String
    let category_id: String
    let name_en: String
    let name_ja: String
    let name_vi: String
    let code: String?
    let description_en: String?
    let description_ja: String?
    let description_vi: String?
    let price: Double
    let tags: [String]?
    let image_url: String?
    let stock_level: Int
    let available: Bool
    let position: Int
    let created_at: String
    let updated_at: String
    
    // Category information (when fetched with joins)
    var category: Category?
    
    // Helper to get localized name (defaulting to English)
    var displayName: String {
        return name_en // You can implement locale-based selection later
    }
    
    var displayDescription: String? {
        return description_en // You can implement locale-based selection later
    }
    
    // Helper to get category name with fallback
    var categoryDisplayName: String {
        return category?.displayName ?? category_id
    }
}

struct Table: Decodable, Identifiable {
    let id: String
    let restaurant_id: String
    let name: String
    let status: TableStatus
    let capacity: Int
    let is_outdoor: Bool
    let is_accessible: Bool
    let notes: String?
    let qr_code: String?
    let created_at: String
    let updated_at: String
}

enum TableStatus: String, Decodable, CaseIterable {
    case available = "available"
    case occupied = "occupied"
    case reserved = "reserved"
    
    var displayName: String {
        switch self {
        case .available: return "Available"
        case .occupied: return "Occupied"
        case .reserved: return "Reserved"
        }
    }
}

// MARK: - Function Response Models

// Response type for orders with joined table and order items data
struct OrderWithTableResponse: Decodable {
    let id: String
    let restaurant_id: String
    let table_id: String
    let session_id: String
    let guest_count: Int
    let status: String
    let total_amount: Double?
    let created_at: String
    let updated_at: String
    
    // Nested table data
    let table: TableResponse?
    
    // Nested order items data
    let order_items: [OrderItemWithMenuResponse]
    
    // Convert to Order model
    func toOrder() -> Order {
        let tableModel = table?.toTable()
        let orderItems = order_items.map { $0.toOrderItem() }
        
        return Order(
            id: id,
            restaurant_id: restaurant_id,
            table_id: table_id,
            session_id: session_id,
            guest_count: guest_count,
            status: OrderStatus(rawValue: status) ?? .new,
            total_amount: total_amount,
            created_at: created_at,
            updated_at: updated_at,
            table: tableModel,
            order_items: orderItems
        )
    }
}

struct TableResponse: Decodable {
    let id: String
    let restaurant_id: String
    let name: String
    let status: String
    let capacity: Int
    let is_outdoor: Bool
    let is_accessible: Bool
    let notes: String?
    let qr_code: String?
    let created_at: String
    let updated_at: String
    
    func toTable() -> Table {
        return Table(
            id: id,
            restaurant_id: restaurant_id,
            name: name,
            status: TableStatus(rawValue: status) ?? .available,
            capacity: capacity,
            is_outdoor: is_outdoor,
            is_accessible: is_accessible,
            notes: notes,
            qr_code: qr_code,
            created_at: created_at,
            updated_at: updated_at
        )
    }
}

struct OrderWithDetailsResponse: Decodable {
    let order_id: String
    let order_restaurant_id: String
    let order_table_id: String
    let order_session_id: String
    let order_guest_count: Int
    let order_status: String
    let order_total_amount: Double?
    let order_created_at: String
    let order_updated_at: String
    
    let table_id: String?
    let table_name: String?
    let table_status: String?
    let table_capacity: Int?
    let table_is_outdoor: Bool?
    let table_is_accessible: Bool?
    let table_notes: String?
    
    let order_items: [OrderItemWithMenuResponse]
    
    // Convert to Order model
    func toOrder() -> Order {
        let table = table_id != nil ? Table(
            id: table_id!,
            restaurant_id: order_restaurant_id,
            name: table_name ?? "",
            status: TableStatus(rawValue: table_status ?? "available") ?? .available,
            capacity: table_capacity ?? 0,
            is_outdoor: table_is_outdoor ?? false,
            is_accessible: table_is_accessible ?? false,
            notes: table_notes,
            qr_code: nil,
            created_at: "",
            updated_at: ""
        ) : nil
        
        let orderItems = order_items.map { $0.toOrderItem() }
        
        return Order(
            id: order_id,
            restaurant_id: order_restaurant_id,
            table_id: order_table_id,
            session_id: order_session_id,
            guest_count: order_guest_count,
            status: OrderStatus(rawValue: order_status) ?? .new,
            total_amount: order_total_amount,
            created_at: order_created_at,
            updated_at: order_updated_at,
            table: table,
            order_items: orderItems
        )
    }
}

struct OrderItemWithMenuResponse: Decodable {
    let id: String
    let restaurant_id: String
    let order_id: String
    let menu_item_id: String
    let quantity: Int
    let notes: String?
    let status: String
    let created_at: String
    let menu_item: MenuItemResponse
    
    func toOrderItem() -> OrderItem {
        return OrderItem(
            id: id,
            restaurant_id: restaurant_id,
            order_id: order_id,
            menu_item_id: menu_item_id,
            quantity: quantity,
            notes: notes,
            status: OrderItemStatus(rawValue: status) ?? .ordered,
            created_at: created_at,
            updated_at: created_at,
            menu_item: menu_item.toMenuItem()
        )
    }
}

struct MenuItemResponse: Decodable {
    let id: String
    let restaurant_id: String
    let category_id: String
    let name_en: String
    let name_ja: String
    let name_vi: String
    let code: String?
    let description_en: String?
    let description_ja: String?
    let description_vi: String?
    let price: Double
    let tags: [String]?
    let image_url: String?
    let stock_level: Int
    let available: Bool
    let position: Int
    let created_at: String
    let updated_at: String
    
    // Category information when fetched with joins
    let category: Category?
    
    func toMenuItem() -> MenuItem {
        return MenuItem(
            id: id,
            restaurant_id: restaurant_id,
            category_id: category_id,
            name_en: name_en,
            name_ja: name_ja,
            name_vi: name_vi,
            code: code,
            description_en: description_en,
            description_ja: description_ja,
            description_vi: description_vi,
            price: price,
            tags: tags,
            image_url: image_url,
            stock_level: stock_level,
            available: available,
            position: position,
            created_at: created_at,
            updated_at: updated_at,
            category: category
        )
    }
}

import Foundation

// MARK: - Order Models
struct Order: Codable, Identifiable, Equatable, Hashable { // Changed to Codable
    let id: String
    let restaurant_id: String
    let table_id: String
    let user_id: String? // Added user_id as it's in NewOrderPayload and often useful
    let session_id: String? // session_id can be nullable in DB
    let guest_count: Int?
    var status: OrderStatus
    var total_price: Double? // Renamed from total_amount to match DB
    let order_number: Int? // Added as it's in OrderManager's mock and often present
    let created_at: String
    var updated_at: String
    
    // Related data
    var table: Table?
    var order_items: [OrderItem]?
    var payment_method: String? // Added from OrderManager mock
    var discount_amount: Double? // Added from OrderManager mock
    var tax_amount: Double? // Added from OrderManager mock
    var tip_amount: Double? // Added from OrderManager mock
    
    // Equatable conformance
    static func == (lhs: Order, rhs: Order) -> Bool {
        return lhs.id == rhs.id &&
               lhs.status == rhs.status &&
               lhs.updated_at == rhs.updated_at &&
               lhs.order_items?.count == rhs.order_items?.count &&
               lhs.total_price == rhs.total_price
    }
    
    // Hashable conformance
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
        hasher.combine(status)
        hasher.combine(updated_at)
        hasher.combine(total_price)
    }
}

enum OrderStatus: String, Codable, CaseIterable { // Changed to Codable
    case draft = "draft" // Added draft status
    case new = "new"
    case serving = "serving"
    case completed = "completed"
    case canceled = "canceled"
    
    var displayName: String {
        switch self {
        case .draft: return "Draft"
        case .new: return "New"
        case .serving: return "Serving"
        case .completed: return "Completed"
        case .canceled: return "Canceled"
        }
    }
    
    var color: String {
        switch self {
        case .draft: return "teal" // Example color for draft
        case .new: return "blue"
        case .serving: return "orange"
        case .completed: return "gray"
        case .canceled: return "red"
        }
    }
}

struct OrderItem: Codable, Identifiable, Equatable, Hashable { // Changed to Codable, added Equatable, Hashable
    let id: String
    let restaurant_id: String
    let order_id: String
    let menu_item_id: String
    var quantity: Int // Made var for potential updates
    var notes: String? // Made var
    let menu_item_size_id: String?
    let topping_ids: [String]? // Consider if this should be [ToppingId] if ToppingId is a distinct type
    var price_at_order: Double // Made var, if options change, this might need update
    var status: OrderItemStatus
    let created_at: String
    var updated_at: String

    // Related data
    var menu_item: MenuItem?
    var menu_item_size: MenuItemSize? // This is likely a String ID if MenuItemSize is just a typealias for String.
                                      // If MenuItemSize becomes a struct, this should be `MenuItemSize?`
    var toppings: [Topping]? // Similar to menu_item_size

    // Equatable
    static func == (lhs: OrderItem, rhs: OrderItem) -> Bool {
        lhs.id == rhs.id && lhs.quantity == rhs.quantity && lhs.notes == rhs.notes && lhs.status == rhs.status
    }

    // Hashable
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

enum OrderItemStatus: String, Codable, CaseIterable, Comparable { // Changed to Codable
    case draft = "draft_item" // Added from OrderManager
    case ordered = "ordered"
    case preparing = "preparing"
    case ready = "ready"
    case served = "served"
    case cancelled = "cancelled"
    
    var displayName: String {
        switch self {
        case .draft: return "Draft Item"
        case .ordered: return "Ordered"
        case .preparing: return "Preparing"
        case .ready: return "Ready"
        case .served: return "Served"
        case .cancelled: return "Cancelled"
        }
    }
    
    var color: String {
        switch self {
        case .draft: return "purple" // Example color
        case .ordered: return "blue"
        case .preparing: return "orange"
        case .ready: return "green"
        case .served: return "gray"
        case .cancelled: return "red"
        }
    }
    
    // Comparable conformance - defines ordering for status progression
    static func < (lhs: OrderItemStatus, rhs: OrderItemStatus) -> Bool {
        let order: [OrderItemStatus] = [.draft, .ordered, .preparing, .ready, .served, .cancelled]
        guard let lhsIndex = order.firstIndex(of: lhs),
              let rhsIndex = order.firstIndex(of: rhs) else {
            return false
        }
        return lhsIndex < rhsIndex
    }
}

// MARK: - Category Model
struct Category: Codable, Identifiable, Hashable { // Changed to Codable, added Hashable
    let id: String
    let name_en: String
    let name_ja: String? // Made optional for flexibility
    let name_vi: String? // Made optional for flexibility
    let position: Int? // Often categories have a display order
    
    // Helper to get localized name (defaulting to English)
    var displayName: String {
        // TODO: Integrate with LocalizationManager
        return name_en
    }

    // Hashable
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

struct MenuItem: Codable, Identifiable, Hashable { // Changed to Codable, added Hashable
    let id: String
    let restaurant_id: String
    let category_id: String
    let name_en: String
    let name_ja: String? // Made optional
    let name_vi: String? // Made optional
    let code: String?
    let description_en: String?
    let description_ja: String? // Made optional
    let description_vi: String? // Made optional
    let price: Double
    let tags: [String]?
    let image_url: String?
    let stock_level: Int? // Made optional as it might not always be tracked
    let available: Bool
    let position: Int? // Made optional
    let created_at: String
    let updated_at: String
    
    // Category information (when fetched with joins)
    var category: Category?
    
    // For POS flow, to hold available sizes and toppings if applicable
    var availableSizes: [MenuItemSize]?
    var availableToppings: [Topping]?

    // Helper to get localized name (defaulting to English)
    var displayName: String {
        // TODO: Integrate with LocalizationManager
        return name_en
    }
    
    var displayDescription: String? {
        // TODO: Integrate with LocalizationManager
        return description_en
    }
    
    // Helper to get category name with fallback
    var categoryDisplayName: String {
        return category?.displayName ?? category_id
    }

    // Hashable
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Menu Item Size & Topping Models
struct MenuItemSize: Codable, Identifiable, Hashable { // Changed to Codable, added Hashable
    let id: String // This is the menu_item_size_id
    let restaurant_id: String
    let menu_item_id: String // Foreign key to menu_items
    let size_key: String? // e.g., "S", "M", "L" - could be part of a separate "SizeDefinition" table
    let name_en: String
    let name_ja: String? // Made optional
    let name_vi: String? // Made optional
    let price_modifier: Double // How much this size changes the base menu_item.price
    let position: Int? // Made optional
    let created_at: String
    let updated_at: String

    var displayName: String {
        // TODO: Integrate with LocalizationManager
        return name_en
    }
    // In previous stubs, MenuItemSize was sometimes used as just a String ID.
    // This struct makes it a full model. If OrderItem.menu_item_size_id refers to this,
    // then OrderItem.menu_item_size should be of type MenuItemSize?

    // Hashable
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

struct Topping: Codable, Identifiable, Hashable { // Changed to Codable, added Hashable
    let id: String
    let restaurant_id: String
    // let menu_item_id: String? // A topping might be general or specific to a menu_item. Assume general for now.
    let name_en: String
    let name_ja: String? // Made optional
    let name_vi: String? // Made optional
    let price: Double // Price of the topping itself
    let position: Int? // Made optional
    let created_at: String
    let updated_at: String

    var displayName: String {
        // TODO: Integrate with LocalizationManager
        return name_en
    }

    // Hashable
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

struct Table: Codable, Identifiable, Hashable { // Changed to Codable, added Hashable
    let id: String
    let restaurant_id: String
    let name: String
    var status: TableStatus // Made var if it can be updated client-side then synced
    let capacity: Int
    let is_outdoor: Bool? // Made optional
    let is_accessible: Bool? // Made optional
    let notes: String?
    let qr_code: String?
    let created_at: String
    let updated_at: String

    // Hashable
    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// This is the canonical TableStatus enum. The duplicate will be removed.
enum TableStatus: String, Codable, CaseIterable { // Changed to Codable
    case available = "available"
    case occupied = "occupied"
    case reserved = "reserved"
    case maintenance = "maintenance" // Added from SelectTableView stub
    
    var displayName: String {
        switch self {
        case .available: return "Available"
        case .occupied: return "Occupied"
        case .reserved: return "Reserved"
        case .maintenance: return "Maintenance"
        }
    }

    var color: String { // Added color property, useful for UI
        switch self {
        case .available: return "green"
        case .occupied: return "orange"
        case .reserved: return "purple"
        case .maintenance: return "gray"
        }
    }
}


// MARK: - Function Response Models / DTOs

// Response type for orders with joined table and order items data
struct OrderWithTableResponse: Decodable { // Should remain Decodable, not Codable unless sent back
    let id: String
    let restaurant_id: String
    let table_id: String
    let user_id: String?
    let session_id: String?
    let guest_count: Int?
    let status: String
    let total_price: Double? // Renamed from total_amount
    let order_number: Int?
    let created_at: String
    let updated_at: String
    
    // Nested table data
    let table: TableResponse? // Assuming TableResponse is a DTO for table data
    
    // Nested order items data
    let order_items: [OrderItemWithMenuResponse]? // Made optional as it might not always be joined
    
    // Convert to Order model
    func toOrder() -> Order {
        let tableModel = table?.toTable()
        let orderItemsModels = order_items?.map { $0.toOrderItem() }
        
        return Order(
            id: id,
            restaurant_id: restaurant_id,
            table_id: table_id,
            user_id: user_id,
            session_id: session_id,
            guest_count: guest_count,
            status: OrderStatus(rawValue: status) ?? .new, // Default if status string is unknown
            total_price: total_price,
            order_number: order_number,
            created_at: created_at,
            updated_at: updated_at,
            table: tableModel,
            order_items: orderItemsModels
            // payment_method, discount_amount etc. are nil as they are not in this DTO
        )
    }
}

struct TableResponse: Decodable { // Should remain Decodable
    let id: String
    let restaurant_id: String
    let name: String
    let status: String // Raw string status from DB
    let capacity: Int
    let is_outdoor: Bool?
    let is_accessible: Bool?
    let notes: String?
    let qr_code: String?
    // created_at and updated_at might not be needed in all Table DTOs if not displayed
    
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
// Removed OrderWithDetailsResponse as it was very similar to OrderWithTableResponse
// and could be consolidated or made more distinct if different joins are truly needed.
// For now, assuming OrderWithTableResponse is the primary DTO for fetching orders with details.


struct OrderItemWithMenuResponse: Decodable { // Should remain Decodable
    let id: String
    let restaurant_id: String
    let order_id: String
    let menu_item_id: String
    let quantity: Int
    let notes: String?
    let menu_item_size_id: String? // This is the ID of the selected MenuItemSize
    let topping_ids: [String]?     // Array of Topping IDs
    let price_at_order: Double
    let status: String             // Raw string status from DB
    let created_at: String
    let updated_at: String         // Added updated_at

    // Nested full objects (DTOs)
    let menu_item: MenuItemResponse             // DTO for menu_item
    let menu_item_size: MenuItemSizeResponse?   // DTO for menu_item_size (optional)
    // let toppings: [ToppingResponse]?         // DTOs for toppings (optional array)
    // For toppings, Supabase might return them as a JSON array of IDs or objects.
    // If they are full objects, then ToppingResponse would be used.
    // If it's just an array of IDs, topping_ids: [String]? is fine.
    // The current Topping model is a full object, so if toppings are joined as full objects:
    let toppings: [ToppingResponse]?
    
    func toOrderItem() -> OrderItem {
        return OrderItem(
            id: id,
            restaurant_id: restaurant_id,
            order_id: order_id,
            menu_item_id: menu_item_id,
            quantity: quantity,
            notes: notes,
            menu_item_size_id: menu_item_size_id,
            topping_ids: topping_ids,
            price_at_order: price_at_order,
            status: OrderItemStatus(rawValue: status) ?? .ordered,
            created_at: created_at,
            updated_at: created_at,
            menu_item: menu_item.toMenuItem(),
            menu_item_size: menu_item_size?.toMenuItemSize(),
            toppings: toppings?.map { $0.toTopping() }
        )
    }
}

struct MenuItemResponse: Decodable { // Should remain Decodable
    let id: String
    let restaurant_id: String
    let category_id: String
    let name_en: String
    let name_ja: String?
    let name_vi: String?
    let code: String?
    let description_en: String?
    let description_ja: String?
    let description_vi: String?
    let price: Double
    let tags: [String]?
    let image_url: String?
    let stock_level: Int?
    let available: Bool
    let position: Int?
    let created_at: String
    let updated_at: String
    
    // Category information when fetched with joins (DTO)
    let category: CategoryResponse? // Assuming CategoryResponse is a DTO for category
    
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

// Added CategoryResponse DTO
struct CategoryResponse: Decodable {
    let id: String
    let name_en: String
    let name_ja: String?
    let name_vi: String?
    let position: Int?

    func toCategory() -> Category {
        return Category(
            id: id,
            name_en: name_en,
            name_ja: name_ja,
            name_vi: name_vi,
            position: position
        )
    }
}


struct MenuItemSizeResponse: Decodable { // Should remain Decodable
    let id: String
    let restaurant_id: String
    let menu_item_id: String
    let size_key: String
    let name_en: String
    let name_ja: String?
    let name_vi: String?
    let price_modifier: Double // Changed from price to price_modifier to align with MenuItemSize model logic
    let position: Int?
    let created_at: String
    let updated_at: String

    func toMenuItemSize() -> MenuItemSize {
        MenuItemSize(
            id: id,
            restaurant_id: restaurant_id,
            menu_item_id: menu_item_id,
            size_key: size_key,
            name_en: name_en,
            name_ja: name_ja,
            name_vi: name_vi,
            price: price,
            position: position,
            created_at: created_at,
            updated_at: updated_at
        )
    }
}

struct ToppingResponse: Decodable { // Should remain Decodable
    let id: String
    let restaurant_id: String
    // let menu_item_id: String? // If toppings can be item-specific
    let name_en: String
    let name_ja: String?
    let name_vi: String?
    let price: Double
    let position: Int?
    let created_at: String
    let updated_at: String

    func toTopping() -> Topping {
        Topping(
            id: id,
            restaurant_id: restaurant_id,
            menu_item_id: menu_item_id,
            name_ja: name_ja,
            name_en: name_en,
            name_vi: name_vi,
            price: price,
            position: position,
            created_at: created_at,
            updated_at: updated_at
        )
    }
}

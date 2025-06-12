import Foundation
import XCTest
@testable import SOder

class AutoPrintingTests: XCTestCase {
    var orderManager: OrderManager!
    var mockPrinterManager: MockPrinterManager!
    
    override func setUp() {
        super.setUp()
        orderManager = OrderManager()
        mockPrinterManager = MockPrinterManager()
    }
    
    override func tearDown() {
        orderManager = nil
        mockPrinterManager = nil
        super.tearDown()
    }
    
    // MARK: - Auto-printing Settings Tests
    
    func testAutoPrintingEnabledByDefault() {
        XCTAssertTrue(orderManager.autoPrintingEnabled, "Auto-printing should be enabled by default")
    }
    
    func testAutoPrintingSettingsPersistence() {
        // Set to false
        orderManager.setAutoPrintingEnabled(false)
        XCTAssertFalse(orderManager.autoPrintingEnabled)
        
        // Create new instance to test persistence
        let newOrderManager = OrderManager()
        XCTAssertFalse(newOrderManager.autoPrintingEnabled, "Auto-printing setting should persist")
        
        // Reset to true for other tests
        orderManager.setAutoPrintingEnabled(true)
    }
    
    // MARK: - New Order Auto-printing Tests
    
    func testNewOrderDetection() async {
        let previousOrders: [Order] = []
        
        let newOrder = createMockOrder(id: "order1", tableId: "table1")
        orderManager.orders = [newOrder]
        
        let foundNewOrders = orderManager.findNewOrders(currentOrders: [newOrder], previousOrders: previousOrders)
        XCTAssertEqual(foundNewOrders.count, 1)
        XCTAssertEqual(foundNewOrders.first?.id, "order1")
    }
    
    func testNoDuplicateNewOrderDetection() async {
        let existingOrder = createMockOrder(id: "order1", tableId: "table1")
        let previousOrders = [existingOrder]
        
        // Same order exists in both previous and current
        let currentOrders = [existingOrder]
        
        let foundNewOrders = orderManager.findNewOrders(currentOrders: currentOrders, previousOrders: previousOrders)
        XCTAssertEqual(foundNewOrders.count, 0, "Should not detect existing orders as new")
    }
    
    // MARK: - Ready Item Auto-printing Tests
    
    func testReadyItemDetection() async {
        let orderItem1 = createMockOrderItem(id: "item1", status: .cooking)
        let orderItem2 = createMockOrderItem(id: "item2", status: .ready)
        
        let previousOrder = createMockOrder(id: "order1", tableId: "table1", items: [
            createMockOrderItem(id: "item1", status: .cooking),
            createMockOrderItem(id: "item2", status: .cooking)
        ])
        
        let currentOrder = createMockOrder(id: "order1", tableId: "table1", items: [
            orderItem1, // Still cooking
            orderItem2  // Changed to ready
        ])
        
        let readyItems = orderManager.findItemsChangedToReady(
            currentOrders: [currentOrder],
            previousOrders: [previousOrder]
        )
        
        XCTAssertEqual(readyItems.count, 1)
        XCTAssertEqual(readyItems.first?.id, "item2")
        XCTAssertEqual(readyItems.first?.status, .ready)
    }
    
    func testNoReadyItemDetectionForAlreadyReadyItems() async {
        let orderItem = createMockOrderItem(id: "item1", status: .ready)
        
        let previousOrder = createMockOrder(id: "order1", tableId: "table1", items: [orderItem])
        let currentOrder = createMockOrder(id: "order1", tableId: "table1", items: [orderItem])
        
        let readyItems = orderManager.findItemsChangedToReady(
            currentOrders: [currentOrder],
            previousOrders: [previousOrder]
        )
        
        XCTAssertEqual(readyItems.count, 0, "Should not detect already ready items")
    }
    
    // MARK: - Print History Tests
    
    func testPrintHistoryPreventsActualDuplicates() {
        let orderId = "order1"
        let itemId = "item1"
        
        // Add to print history
        orderManager.printedNewOrders.insert(orderId)
        orderManager.printedReadyItems.insert(itemId)
        
        // Check if already printed
        XCTAssertTrue(orderManager.printedNewOrders.contains(orderId))
        XCTAssertTrue(orderManager.printedReadyItems.contains(itemId))
    }
    
    func testClearPrintHistory() {
        let orderId = "order1"
        let itemId = "item1"
        
        // Add to print history
        orderManager.printedNewOrders.insert(orderId)
        orderManager.printedReadyItems.insert(itemId)
        
        // Clear history
        orderManager.clearPrintHistory()
        
        // Verify history is cleared
        XCTAssertFalse(orderManager.printedNewOrders.contains(orderId))
        XCTAssertFalse(orderManager.printedReadyItems.contains(itemId))
    }
    
    // MARK: - Mock Objects Creation
    
    private func createMockOrder(id: String, tableId: String, items: [OrderItem] = []) -> Order {
        return Order(
            id: id,
            restaurant_id: "test-restaurant",
            table_id: tableId,
            session_id: "test-session",
            guest_count: 2,
            status: .cooking,
            total_amount: 1000,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date()),
            table: nil,
            order_items: items.isEmpty ? nil : items
        )
    }
    
    private func createMockOrderItem(id: String, status: OrderItemStatus) -> OrderItem {
        return OrderItem(
            id: id,
            restaurant_id: "test-restaurant",
            order_id: "test-order",
            menu_item_id: "test-item",
            quantity: 1,
            notes: nil,
            status: status,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date()),
            menu_item: createMockMenuItem()
        )
    }
    
    private func createMockMenuItem() -> MenuItem {
        return MenuItem(
            id: "test-menu-item",
            restaurant_id: "test-restaurant",
            category_id: "test-category",
            name_en: "Test Item",
            name_ja: "テストアイテム",
            name_vi: "Món Test",
            description_en: "Test description",
            description_ja: "テスト説明",
            description_vi: "Mô tả test",
            price: 500,
            is_available: true,
            image_url: nil,
            allergens: nil,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date()),
            category: nil
        )
    }
}

// MARK: - Mock Printer Manager for Testing

class MockPrinterManager {
    var printKitchenSlipCalled = false
    var printItemOverviewCalled = false
    var lastPrintedOrder: Order?
    var lastPrintedItem: OrderItem?
    
    func printKitchenSlip(for order: Order) async throws {
        printKitchenSlipCalled = true
        lastPrintedOrder = order
    }
    
    func printItemOverview(item: OrderItem, order: Order) async throws {
        printItemOverviewCalled = true
        lastPrintedItem = item
        lastPrintedOrder = order
    }
}

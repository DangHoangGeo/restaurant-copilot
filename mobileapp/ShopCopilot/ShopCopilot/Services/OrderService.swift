import Foundation

/// Mock service that simulates realtime order updates.
/// In the real application this would connect to Supabase Realtime.
class OrderService: ObservableObject {
    /// Published list of active orders sorted by `createdAt` descending.
    @Published var activeOrders: [Order] = []

    init() {
        loadMockData()
    }

    /// Updates the status for a specific order by id.
    func updateOrderStatus(orderId: String, newStatus: String) {
        guard let index = activeOrders.firstIndex(where: { $0.id == orderId }) else { return }
        activeOrders[index].status = newStatus
        if newStatus == "completed" {
            // remove completed orders from the active list
            activeOrders.remove(at: index)
        }
    }

    /// Loads some mock data for demonstration purposes.
    private func loadMockData() {
        activeOrders = [
            Order(
                id: "1",
                tableId: "T1",
                totalAmount: 2500,
                status: "new",
                createdAt: Date().addingTimeInterval(-300),
                items: [
                    OrderItem(id: "i1", menuItemId: "m1", menuItemName: "Ramen", quantity: 2, notes: nil),
                    OrderItem(id: "i2", menuItemId: "m2", menuItemName: "Gyoza", quantity: 1, notes: "No garlic")
                ]
            ),
            Order(
                id: "2",
                tableId: "T2",
                totalAmount: 1500,
                status: "preparing",
                createdAt: Date().addingTimeInterval(-200),
                items: [
                    OrderItem(id: "i3", menuItemId: "m3", menuItemName: "Udon", quantity: 1, notes: nil)
                ]
            )
        ]
    }
}

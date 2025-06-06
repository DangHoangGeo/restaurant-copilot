import SwiftUI

/// Displays the list of active orders sorted by creation date.
struct OrderListView: View {
    @EnvironmentObject var orderService: OrderService

    var body: some View {
        NavigationView {
            if orderService.activeOrders.isEmpty {
                VStack {
                    Spacer()
                    Text(NSLocalizedString("no_active_orders_message", comment: "Message when there are no active orders"))
                        .font(.title2)
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .navigationTitle(NSLocalizedString("orders_title", comment: "Order list title"))
            } else {
                // OrderService.activeOrders is already sorted by the service itself.
                // If not, or if additional client-side sorting is desired, it can be done here.
                // For now, relying on the service's sort order.
                List(orderService.activeOrders) { order in
                    NavigationLink(destination: OrderDetailView(order: order)) { // Pass only the order
                        HStack {
                            VStack(alignment: .leading) {
                                Text(String(format: NSLocalizedString("table_number_format", comment: "Table number"), order.tableId))
                                    .font(.headline)
                                Text(order.createdAt, style: .time)
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                            Text(statusText(for: order.status)) // order.status is now OrderStatus
                                .font(.caption)
                                .padding(6)
                                .background(statusColor(order.status)) // order.status is now OrderStatus
                                .foregroundColor(.white)
                                .cornerRadius(8)
                        }
                    }
                }
                .animation(.default, value: orderService.activeOrders) // Added animation
                .navigationTitle(NSLocalizedString("orders_title", comment: "Order list title"))
            }
        }
    }

    private func statusColor(_ status: OrderStatus) -> Color { // Changed to OrderStatus
        switch status {
        case .new: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .completed: return .gray // Added completed case, though active orders usually won't be completed
        }
    }

    private func statusText(for status: OrderStatus) -> String { // Changed to OrderStatus
        // Use the localizedString method from the enum itself
        return status.localizedString()
    }
}

struct OrderListView_Previews: PreviewProvider {
    static var previews: some View {
        // Create a mock OrderService for the preview
        let mockOrderServiceEmpty = OrderService()
        mockOrderServiceEmpty.activeOrders = []

        let mockOrderServiceWithOrders = OrderService()
        // Populate mockOrderService.activeOrders with sample data using OrderStatus
        mockOrderServiceWithOrders.activeOrders = [
            Order(id: "1", tableId: "T1", totalAmount: 10.0, status: .new, createdAt: Date(), items: []),
            Order(id: "2", tableId: "T2", totalAmount: 20.0, status: .preparing, createdAt: Date(), items: [])
        ].compactMap { $0 } // Assuming Order init is failable and returns optional

        return Group {
            OrderListView()
                .environmentObject(mockOrderServiceEmpty)
                .displayName("No Orders")

            OrderListView()
                .environmentObject(mockOrderServiceWithOrders)
                .displayName("With Orders")
        }
    }
}

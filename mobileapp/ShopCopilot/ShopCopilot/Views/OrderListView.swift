import SwiftUI

/// Displays the list of active orders sorted by creation date.
struct OrderListView: View {
    @EnvironmentObject var orderService: OrderService

    var body: some View {
        NavigationView {
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
                        Text(statusText(for: order.status))
                            .font(.caption)
                            .padding(6)
                            .background(statusColor(order.status))
                            .foregroundColor(.white)
                            .cornerRadius(8)
                    }
                }
            }
            .navigationTitle(NSLocalizedString("orders_title", comment: "Order list title"))
        }
    }

    private func statusColor(_ status: String) -> Color {
        switch status {
        case "new": return .blue
        case "preparing": return .orange
        case "ready": return .green
        default: return .gray
        }
    }

    private func statusText(for status: String) -> String {
        switch status {
        case "new": return NSLocalizedString("status_new", comment: "")
        case "preparing": return NSLocalizedString("status_preparing", comment: "")
        case "ready": return NSLocalizedString("status_ready", comment: "")
        case "completed": return NSLocalizedString("status_completed", comment: "")
        default: return status
        }
    }
}

struct OrderListView_Previews: PreviewProvider {
    static var previews: some View {
        // Create a mock OrderService for the preview
        let mockOrderService = OrderService()
        // You might want to populate mockOrderService.activeOrders with some sample data here
        // for a more representative preview. For example:
        // mockOrderService.activeOrders = [
        //     Order(id: "1", tableId: "T1", totalAmount: 10.0, status: "new", createdAt: Date(), items: []),
        //     Order(id: "2", tableId: "T2", totalAmount: 20.0, status: "preparing", createdAt: Date(), items: [])
        // ]

        return OrderListView()
            .environmentObject(mockOrderService) // Inject the mock service into the environment
    }
}

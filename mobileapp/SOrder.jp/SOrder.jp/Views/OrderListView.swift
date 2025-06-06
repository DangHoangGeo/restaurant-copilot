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


    private func statusColor(_ status: OrderStatus) -> Color {
        switch status {
        case .new: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .completed: return .gray
        case .unknown: return .gray
        }
    }

    private func statusText(for status: OrderStatus) -> String {
        switch status {
        case .new: return NSLocalizedString("status_new", comment: "")
        case .preparing: return NSLocalizedString("status_preparing", comment: "")
        case .ready: return NSLocalizedString("status_ready", comment: "")
        case .completed: return NSLocalizedString("status_completed", comment: "")
        case .unknown: return status.rawValue
        }
    }
}

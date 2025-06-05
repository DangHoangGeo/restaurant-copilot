import SwiftUI

/// Displays the list of active orders sorted by creation date.
struct OrderListView: View {
    @ObservedObject var orderService: OrderService

    var body: some View {
        NavigationView {
            List(orderService.activeOrders.sorted(by: { $0.createdAt > $1.createdAt })) { order in
                NavigationLink(destination: OrderDetailView(order: order, service: orderService)) {
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
        OrderListView(orderService: OrderService())
    }
}

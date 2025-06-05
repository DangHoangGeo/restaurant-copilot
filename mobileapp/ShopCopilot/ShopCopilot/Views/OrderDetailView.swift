import SwiftUI

/// Shows details for a single order and allows updating its status.
struct OrderDetailView: View {
    @State var order: Order
    @ObservedObject var service: OrderService
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(String(format: NSLocalizedString("table_number_format", comment: "Table number"), order.tableId))
                .font(.title2)
            Divider()
            ForEach(order.items) { item in
                VStack(alignment: .leading) {
                    HStack {
                        Text(item.menuItemName)
                        Spacer()
                        Text("x\(item.quantity)")
                    }
                    if let notes = item.notes, !notes.isEmpty {
                        Text(notes)
                            .font(.footnote)
                            .foregroundColor(.gray)
                    }
                    Divider()
                }
            }
            HStack {
                Text(NSLocalizedString("total_label", comment: "Total label"))
                    .font(.headline)
                Spacer()
                Text(order.totalAmount, format: .currency(code: Locale.current.currencyCode ?? "USD"))
                    .font(.headline)
            }
            Divider()
            actionButtons
            Spacer()
        }
        .padding()
        .navigationTitle(NSLocalizedString("order_detail_title", comment: "Order detail title"))
    }

    @ViewBuilder
    private var actionButtons: some View {
        switch order.status {
        case "new":
            Button(NSLocalizedString("mark_preparing_button", comment: "")) {
                updateStatus("preparing")
            }
            .buttonStyle(.borderedProminent)
        case "preparing":
            Button(NSLocalizedString("mark_ready_button", comment: "")) {
                updateStatus("ready")
            }
            .buttonStyle(.borderedProminent)
        case "ready":
            Button(NSLocalizedString("complete_print_button", comment: "")) {
                updateStatus("completed")
            }
            .buttonStyle(.borderedProminent)
        default:
            EmptyView()
        }
    }

    private func updateStatus(_ newStatus: String) {
        service.updateOrderStatus(orderId: order.id, newStatus: newStatus)
        order.status = newStatus
        if newStatus == "completed" {
            dismiss()
        }
    }
}

struct OrderDetailView_Previews: PreviewProvider {
    static var previews: some View {
        OrderDetailView(order: OrderService().activeOrders[0], service: OrderService())
    }
}

import SwiftUI

/// Shows details for a single order and allows updating its status.
struct OrderDetailView: View {
    // The order is passed in, and its state might become stale if not updated
    // when the source of truth in OrderService changes.
    // For this example, we'll keep it as @State, but acknowledge this.
    // A more robust solution might involve making 'order' an @ObservedObject
    // if Order itself were a class, or re-fetching/finding it from OrderService.
    @State var order: Order
    @EnvironmentObject var service: OrderService // Use EnvironmentObject
    @Environment(\.dismiss) private var dismiss
    @State private var updateError: String? = nil // For showing errors

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

            if let error = updateError {
                Text("Error: \(error)")
                    .foregroundColor(.red)
                    .padding()
            }

            Spacer()
        }
        .padding()
        .navigationTitle(NSLocalizedString("order_detail_title", comment: "Order detail title"))
        // This listener can react to changes in the order if it's found in the orderService.activeOrders
        // This helps keep the local @State var order in sync if its properties change due to external events.
        .onReceive(service.$activeOrders) { updatedOrders in
            if let refreshedOrder = updatedOrders.first(where: { $0.id == order.id }) {
                // Only update if there are actual changes to avoid potential infinite loops
                // or unnecessary view refreshes. A proper diffing would be even better.
                if self.order.status != refreshedOrder.status || self.order.items.count != refreshedOrder.items.count {
                     self.order = refreshedOrder
                }
            } else {
                // The order might have been completed or deleted from activeOrders
                // If the current view is for an order that no longer exists in activeOrders (e.g. completed)
                // you might want to dismiss the view.
                if self.order.status != .completed { // Avoid dismissing if we manually set to completed and are about to dismiss
                   // This logic might need refinement based on desired UX when an order disappears from active list
                   // For now, if it's not found and not explicitly completed by this view, it might mean it was remotely completed.
                   // Consider if dismiss() is always the right action here.
                   print("Order \(order.id) no longer in active orders, potentially completed or deleted remotely.")
                   // dismiss() // Potentially dismiss if order vanishes
                }
            }
        }
    }

    @ViewBuilder
    private var actionButtons: some View {
        // Disable buttons if status is completed, or if an update is in progress (not shown here)
        let disableActions = order.status == .completed

        HStack { // Use HStack for horizontal layout of buttons if multiple can appear
            Spacer()
            switch order.status {
            case .new:
                Button(NSLocalizedString("mark_preparing_button", comment: "")) {
                    updateStatus(.preparing)
                }
                .buttonStyle(.borderedProminent)
                .disabled(disableActions)
            case .preparing:
                Button(NSLocalizedString("mark_ready_button", comment: "")) {
                    updateStatus(.ready)
                }
                .buttonStyle(.borderedProminent)
                .disabled(disableActions)
            case .ready:
                Button(NSLocalizedString("complete_print_button", comment: "")) {
                    updateStatus(.completed)
                }
                .buttonStyle(.borderedProminent)
                .disabled(disableActions)
            default:
                Text(NSLocalizedString("status_completed_message", comment: "Order is completed"))
                    .foregroundColor(.green)
            }
            Spacer()
        }
    }

    private func updateStatus(_ newStatus: OrderStatus) {
        Task {
            do {
                try await service.updateOrderStatus(orderId: order.id, newStatus: newStatus)
                // The @State order.status might become stale.
                // The .onReceive handler for service.$activeOrders should update it.
                // If the change to "completed" is confirmed by the backend and reflected,
                // the .onReceive might trigger dismiss if the order is removed from activeOrders.
                // For immediate UI feedback on this action:
                if newStatus == .completed {
                    // Optimistically update local state, then dismiss.
                    // The .onReceive might also try to update it, which should be fine.
                    self.order.status = newStatus
                    dismiss()
                }
                self.updateError = nil // Clear any previous error
            } catch {
                print("Error updating order status: \(error.localizedDescription)")
                self.updateError = error.localizedDescription
            }
        }
    }
}

struct OrderDetailView_Previews: PreviewProvider {
    static var previews: some View {
        // Create a mock order and service for the preview
        let mockService = OrderService()
        let mockOrder = Order(
            id: "previewOrder123",
            tableId: "T5",
            totalAmount: 125.50,
            status: .new, // Change to .preparing, .ready to see different buttons
            createdAt: Date(),
            items: [
                OrderItem(id: "item1", menuItemId: "menuItem1", menuItemName: "Sushi Platter", quantity: 1, notes: "Extra wasabi"),
                OrderItem(id: "item2", menuItemId: "menuItem2", menuItemName: "Miso Soup", quantity: 2)
            ]
        )! // Force unwrap for preview simplicity, ensure mock data is valid

        // If you want to test the "completed" state or other states:
        // mockOrder.status = .preparing

        // Simulate adding it to the service's active orders so .onReceive can find it
        // mockService.activeOrders = [mockOrder]

        return NavigationView { // Embed in NavigationView for title and context
            OrderDetailView(order: mockOrder)
                .environmentObject(mockService) // Inject the mock service
        }
    }
}

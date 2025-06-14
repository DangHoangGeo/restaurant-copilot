import SwiftUI

struct DraftOrderView: View {
    let orderId: String
    let table: Table
    let onOrderConfirmed: (() -> Void)?

    @EnvironmentObject var orderManager: OrderManager
    @Environment(\.dismiss) var dismiss

    @State private var draftOrder: Order? = nil
    @State private var isLoading = false
    @State private var isProcessingOrder = false

    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert = false
    @State private var showingCancelConfirmAlert = false
    @State private var showOrderConfirmedAlert = false

    var body: some View {
        VStack {
            if isLoading {
                ProgressView("Loading draft order...")
                    .padding()
            } else if let order = draftOrder, let items = order.order_items, !items.isEmpty {
                List {
                    Section(header: Text("Items (\(items.count))")) {
                        ForEach(items) { item in
                            orderItemRow(item)
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        Task { await removeOrderItem(item.id) }
                                    } label: {
                                        Label("Remove", systemImage: "trash.fill")
                                    }
                                }
                        }
                    }

                    Section(header: Text("Order Summary")) {
                        HStack {
                            Text("Total Items:")
                            Spacer()
                            Text("\(items.reduce(0) { $0 + $1.quantity })")
                        }
                        HStack {
                            Text("Total Price:")
                                .fontWeight(.bold)
                            Spacer()
                            Text(String(format: "%.0f円", order.total_price ?? calculateTotalPrice()))
                                .fontWeight(.bold)
                        }
                    }
                }

                actionButtons()

            } else {
                VStack(spacing: 20) {
                    Text("No items added to this order yet.")
                        .foregroundColor(.secondary)
                        .padding()
                    
                    Button("Add Items") {
                        dismiss()
                    }
                    .buttonStyle(.borderedProminent)
                }
                Spacer()
            }
        }
        .navigationTitle("Draft: Table \(table.name)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Back to Menu") {
                    dismiss()
                }
            }
            
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    Task { await fetchDraftOrderDetails() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .disabled(isLoading || isProcessingOrder)
                .accessibilityLabel("Refresh order details")
            }
        }
        .task {
            await fetchDraftOrderDetails()
        }
        .alert("Error", isPresented: $showingErrorAlert) {
            Button("OK") {}
        } message: {
            Text(errorMessage ?? "An unknown error occurred.")
        }
        .alert("Confirm Cancellation", isPresented: $showingCancelConfirmAlert) {
            Button("Yes, Cancel Order", role: .destructive) { 
                Task { await cancelEntireOrder() } 
            }
            Button("No", role: .cancel) {}
        } message: {
            Text("Are you sure you want to cancel this entire draft order? This cannot be undone.")
        }
        .alert("Order Confirmed", isPresented: $showOrderConfirmedAlert) {
            Button("OK") {
                onOrderConfirmed?()
                dismiss()
            }
        } message: {
            Text("Order has been successfully sent to the kitchen!")
        }
        .disabled(isProcessingOrder)
    }

    @ViewBuilder
    private func orderItemRow(_ item: OrderItem) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.menu_item?.displayName ?? "Unknown Item")
                    .font(.headline)

                Text("Qty: \(item.quantity)")
                    .font(.subheadline)

                if let notes = item.notes, !notes.isEmpty {
                    Text("Notes: \(notes)")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            Spacer()
            Text(String(format: "%.0f円", item.price_at_order * Double(item.quantity)))
                .fontWeight(.medium)
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private func actionButtons() -> some View {
        VStack(spacing: 12) {
            Button {
                Task { await confirmOrderToKitchen() }
            } label: {
                HStack {
                    Image(systemName: "paperplane.fill")
                    Text("Confirm Order to Kitchen")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .controlSize(.large)
            .disabled(isProcessingOrder || draftOrder == nil || draftOrder?.order_items?.isEmpty == true)

            Button("Cancel Entire Order", role: .destructive) {
                showingCancelConfirmAlert = true
            }
            .buttonStyle(.bordered)
            .controlSize(.large)
            .disabled(isProcessingOrder || draftOrder == nil)
        }
        .padding()
    }

    // MARK: - Data Functions
    
    @MainActor
    private func fetchDraftOrderDetails() async {
        isLoading = true
        errorMessage = nil
        do {
            self.draftOrder = try await orderManager.getDraftOrder(orderId: orderId)
            if self.draftOrder == nil {
                print("Draft order \(orderId) not found or is empty.")
            }
        } catch {
            print("Error fetching draft order: \(error.localizedDescription)")
            self.errorMessage = "Failed to load draft order: \(error.localizedDescription)"
            self.showingErrorAlert = true
        }
        isLoading = false
    }

    @MainActor
    private func removeOrderItem(_ orderItemId: String) async {
        isProcessingOrder = true
        errorMessage = nil
        do {
            try await orderManager.removeDraftOrderItem(orderItemId: orderItemId)
            await fetchDraftOrderDetails()
        } catch {
            print("Error removing order item: \(error.localizedDescription)")
            self.errorMessage = "Failed to remove item: \(error.localizedDescription)"
            self.showingErrorAlert = true
        }
        isProcessingOrder = false
    }

    @MainActor
    private func confirmOrderToKitchen() async {
        guard let order = draftOrder, order.id == orderId else {
            self.errorMessage = "Draft order details are missing."
            self.showingErrorAlert = true
            return
        }

        isProcessingOrder = true
        errorMessage = nil
        do {
            _ = try await orderManager.confirmOrderToKitchen(orderId: order.id)
            self.showOrderConfirmedAlert = true
        } catch {
            print("Error confirming order: \(error.localizedDescription)")
            self.errorMessage = "Failed to confirm order: \(error.localizedDescription)"
            self.showingErrorAlert = true
        }
        isProcessingOrder = false
    }

    @MainActor
    private func cancelEntireOrder() async {
        guard let order = draftOrder, order.id == orderId else {
            self.errorMessage = "Draft order details are missing."
            self.showingErrorAlert = true
            return
        }

        isProcessingOrder = true
        errorMessage = nil
        do {
            try await orderManager.clearDraftOrder(orderId: order.id)
            dismiss()
        } catch {
            print("Error cancelling order: \(error.localizedDescription)")
            self.errorMessage = "Failed to cancel order: \(error.localizedDescription)"
            self.showingErrorAlert = true
        }
        isProcessingOrder = false
    }

    private func calculateTotalPrice() -> Double {
        guard let items = draftOrder?.order_items else { return 0 }
        return items.reduce(0) { $0 + ($1.price_at_order * Double($1.quantity)) }
    }
}

struct DraftOrderView_Previews: PreviewProvider {
    static var previews: some View {
        let mockOrderManager = OrderManager()
        let mockTable = Table(
            id: "previewTableDraft",
            restaurant_id: "resto_preview",
            name: "D1",
            status: .occupied,
            capacity: 4,
            is_outdoor: false,
            is_accessible: true,
            notes: nil,
            qr_code: nil,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        let mockOrderId = "mockDraftOrder123"

        NavigationStack {
            DraftOrderView(orderId: mockOrderId, table: mockTable, onOrderConfirmed: nil)
                .environmentObject(mockOrderManager)
        }
    }
}

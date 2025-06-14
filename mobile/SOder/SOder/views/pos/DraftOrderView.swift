import SwiftUI

// --- Using existing stub definitions if possible, or local ones for clarity ---
// Assuming Order and OrderItem structures are as mocked in OrderManager.
// TableStub / TableStubPreview local definitions removed.
// This view will use the canonical Table model from Models.swift.

struct DraftOrderView: View {
    let orderId: String
    let table: Table // Now using the canonical Table model

    @EnvironmentObject var orderManager: OrderManager
    @Environment(\.dismiss) var dismiss

    @State private var draftOrder: Order? = nil // Full Order object from OrderManager
    @State private var isLoading = false
    @State private var isProcessingOrder = false // Generic for confirm/cancel operations

    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert = false
    @State private var showingCancelConfirmAlert = false
    @State private var showOrderConfirmedAlert = false

    var body: some View {
        NavigationView { // Or NavigationStack
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
                    Text("No items added to this order yet.")
                        .foregroundColor(.secondary)
                        .padding()
                    Spacer()
                    Button("Add Items") {
                        dismiss() // Go back to MenuCategoryView or MenuItemView
                    }
                    .buttonStyle(.borderedProminent)
                    .padding()
                }
            }
            .navigationTitle("Draft: Table \(table.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Back to Menu") { // Or "Add More Items"
                        dismiss() // Dismisses to MenuCategoryView or MenuItemView
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
                Button("Yes, Cancel Order", role: .destructive) { Task { await cancelEntireOrder() } }
                Button("No", role: .cancel) {}
            } message: {
                Text("Are you sure you want to cancel this entire draft order? This cannot be undone.")
            }
            .alert("Order Confirmed", isPresented: $showOrderConfirmedAlert) {
                Button("OK") {
                    // Potentially navigate to a different screen or dismiss further
                    dismiss() // For now, just dismiss this view
                }
            } message: {
                Text("Order has been successfully sent to the kitchen!")
            }
        }
        .disabled(isProcessingOrder) // Disable entire view during critical operations
    }

    @ViewBuilder
    private func orderItemRow(_ item: OrderItem) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.menu_item?.displayName ?? "Unknown Item") // Assuming OrderItem has a nested MenuItem or its details
                    .font(.headline)

                Text("Qty: \(item.quantity)")
                    .font(.subheadline)

                if let notes = item.notes, !notes.isEmpty {
                    Text("Notes: \(notes)")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
                // TODO: Display selected size and toppings if applicable and available in item data
                // Example:
                // if let sizeName = item.menu_item_size?.name { Text("Size: \(sizeName)").font(.caption) }
            }
            Spacer()
            Text(String(format: "%.0f円", item.price_at_order * Double(item.quantity))) // Price for this line
                .fontWeight(.medium)
        }
        .padding(.vertical, 4)
        // Placeholder for Edit action - can be a NavigationLink or Button triggering a sheet
        // .onTapGesture { print("Edit item \(item.id) - placeholder") }
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

    // --- Data Functions ---
    @MainActor
    private func fetchDraftOrderDetails() async {
        isLoading = true
        errorMessage = nil
        do {
            self.draftOrder = try await orderManager.getDraftOrder(orderId: orderId)
            if self.draftOrder == nil {
                print("Draft order \(orderId) not found or is empty.")
                // Optionally set an error message or handle as "empty order" state
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
        isProcessingOrder = true // Using generic processing flag
        errorMessage = nil
        do {
            try await orderManager.removeDraftOrderItem(orderItemId: orderItemId)
            // Refresh order details to reflect removal
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
            // Handle success: show confirmation, then dismiss or navigate
            self.showOrderConfirmedAlert = true
            // Actual navigation or further state change would happen after user taps OK on the alert
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
            // Handle success: dismiss view
            dismiss()
        } catch {
            print("Error cancelling order: \(error.localizedDescription)")
            self.errorMessage = "Failed to cancel order: \(error.localizedDescription)"
            self.showingErrorAlert = true
        }
        isProcessingOrder = false
    }

    // Helper to calculate total price if not directly available on Order model
    private func calculateTotalPrice() -> Double {
        guard let items = draftOrder?.order_items else { return 0 }
        return items.reduce(0) { $0 + ($1.price_at_order * Double($1.quantity)) }
    }
}

struct DraftOrderView_Previews: PreviewProvider {
    static var previews: some View {
        let mockOrderManager = OrderManager()
        // Use the canonical Table model for the preview
        let mockTable = Table(
            id: "previewTableDraft",
            restaurant_id: "resto_preview_draft", // Provide a restaurant_id
            name: "D1",
            status: .occupied, // Use the TableStatus enum
            capacity: 4,
            is_outdoor: false,
            is_accessible: true,
            notes: "Preview Table for DraftOrderView",
            qr_code: nil,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        let mockOrderId = "mockDraftOrder123" // This ID is handled by OrderManager.getDraftOrder for mock data

        // To make the preview more useful, ensure getDraftOrder in OrderManager
        // returns a mock Order with some items when called with `mockOrderId`.
        // The current OrderManager.getDraftOrder stub already does this.

        DraftOrderView(orderId: mockOrderId, table: mockTable)
            .environmentObject(mockOrderManager)
    }
}

// Local TableStub definition for preview is no longer needed.

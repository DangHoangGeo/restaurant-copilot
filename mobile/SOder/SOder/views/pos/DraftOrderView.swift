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
        VStack(spacing: 0) {
            if isLoading {
                ProgressView("loading_draft_order_text".localized)
                    .padding(16)
            } else if let order = draftOrder, let items = order.order_items, !items.isEmpty {
                List {
                    Section(header: Text("items_section_title".localized + " (\(items.count))")) {
                        ForEach(items) { item in
                            orderItemRow(item)
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button(role: .destructive) {
                                        Task { await removeOrderItem(item.id) }
                                    } label: {
                                        Label("remove_item_action_label".localized, systemImage: "trash.fill")
                                    }
                                }
                        }
                    }
                    Section(header: Text("order_summary_section_title".localized)) {
                        HStack {
                            Text("total_items_label".localized)
                            Spacer()
                            Text("\(items.reduce(0) { $0 + $1.quantity })")
                        }
                        HStack {
                            Text("total_price_label".localized)
                                .fontWeight(.bold)
                            Spacer()
                            Text(String(format: "%.0f円", order.total_amount ?? calculateTotalPrice()))
                                .fontWeight(.bold)
                        }
                    }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
                actionButtons()
            } else {
                VStack(spacing: 20) {
                    Text("no_items_in_order_text".localized)
                        .foregroundColor(.secondary)
                        .padding(16)
                    Button("add_items_button_title".localized) {
                        dismiss()
                    }
                    .buttonStyle(.borderedProminent)
                    .accessibilityLabel("add_menu_items_accessibility_label".localized)
                    .accessibilityHint("add_menu_items_accessibility_hint".localized)
                }
                Spacer()
            }
        }
        .navigationTitle("draft_order_title_prefix".localized + table.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("back_to_menu_button_title".localized) {
                    dismiss()
                }
                .accessibilityLabel("return_to_menu_accessibility_label".localized)
                .accessibilityHint("return_to_menu_accessibility_hint".localized)
            }
            ToolbarItem(placement: .navigationBarTrailing) {
                Button {
                    Task { await fetchDraftOrderDetails() }
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .disabled(isLoading || isProcessingOrder)
                .accessibilityLabel("refresh_order_details_accessibility_label".localized)
                .accessibilityHint("refresh_order_details_accessibility_hint".localized)
            }
        }
        .task {
            await fetchDraftOrderDetails()
        }
        .alert("error_alert_title".localized, isPresented: $showingErrorAlert) {
            Button("ok_button_title".localized) {}
        } message: {
            Text(errorMessage ?? "error_alert_default_message".localized)
        }
        .alert("confirm_cancel_title".localized, isPresented: $showingCancelConfirmAlert) {
            Button("yes_cancel_order_button_title".localized, role: .destructive) { 
                Task { await cancelEntireOrder() } 
            }
            Button("no_button_title".localized, role: .cancel) {}
        } message: {
            Text("confirm_cancel_message".localized)
        }
        .alert("order_confirmed_alert_title".localized, isPresented: $showOrderConfirmedAlert) {
            Button("ok_button_title".localized) {
                onOrderConfirmed?()
                dismiss()
            }
        } message: {
            Text("order_confirmed_alert_message".localized)
        }
        .disabled(isProcessingOrder)
    }

    @ViewBuilder
    private func orderItemRow(_ item: OrderItem) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.menu_item?.displayName ?? "unknown_item_text".localized)
                    .font(.cardTitle)
                Text("qty_label".localized + ": \(item.quantity)")
                    .font(.bodyMedium)
                if let notes = item.notes, !notes.isEmpty {
                    Text("notes_label".localized + ": \(notes)")
                        .font(.caption)
                        .foregroundColor(.gray)
                }
            }
            Spacer()
            Text(String(format: "%.0f円", item.price_at_order * Double(item.quantity)))
                .fontWeight(.medium)
        }
        .padding(.vertical, 8)
    }

    @ViewBuilder
    private func actionButtons() -> some View {
        VStack(spacing: 12) {
            Button {
                Task { await confirmOrderToKitchen() }
            } label: {
                Label("confirm_order_to_kitchen_button_title".localized, systemImage: "paperplane.fill")
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(isProcessingOrder || draftOrder == nil || draftOrder?.order_items?.isEmpty == true)
            .accessibilityLabel("confirm_order_to_kitchen_accessibility_label".localized)
            .accessibilityHint("confirm_order_to_kitchen_accessibility_hint".localized)

            Button("cancel_entire_order_button_title".localized) {
                showingCancelConfirmAlert = true
            }
            .buttonStyle(DestructiveButtonStyle())
            .disabled(isProcessingOrder || draftOrder == nil)
            .accessibilityLabel("cancel_entire_order_accessibility_label".localized)
            .accessibilityHint("cancel_entire_order_accessibility_hint".localized)
        }
        .padding(16)
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
                .environmentObject(OrderManager.shared)
        }
    }
}

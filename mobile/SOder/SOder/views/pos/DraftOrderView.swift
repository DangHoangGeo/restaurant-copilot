import SwiftUI

struct DraftOrderView: View {
    let orderId: String
    let table: Table
    let onOrderConfirmed: (() -> Void)?

    @EnvironmentObject var orderManager: OrderManager
    @Environment(\.dismiss) var dismiss

    // Use computed property to get current draft order from OrderManager
    private var draftOrder: Order? {
        // First check if OrderManager has the current draft order for this orderId
        if let currentDraft = orderManager.currentDraftOrder, currentDraft.id == orderId {
            return currentDraft
        }
        // Check local draft orders
        return orderManager.localDraftOrders[orderId]
    }
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
            } else if let order = draftOrder {
                // Show cart content whether items exist or not
                VStack(spacing: 0) {
                    if let items = order.order_items, !items.isEmpty {
                        List {
                            Section(header: Text("items_section_title".localized + " (\(items.count))")) {
                                ForEach(items) { item in
                                    orderItemRow(item)
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
                                    Text(String(format: "price_format".localized, order.total_amount ?? calculateTotalPrice()))
                                        .fontWeight(.bold)
                                }
                            }
                        }
                        .listStyle(PlainListStyle())
                        .scrollContentBackground(.hidden)
                    } else {
                        // Empty cart state - show table info and empty state
                        VStack(spacing: 16) {
                            Text(String(format: "draft_table_label_format".localized, table.name))
                                .font(.title2)
                                .fontWeight(.semibold)
                                .foregroundColor(.appTextPrimary)
                            Text("no_items_in_order_text".localized)
                                .foregroundColor(.appTextSecondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                        Spacer()
                    }
                    
                    // Always show action buttons
                    actionButtons()
                }
            } else {
                // No draft order - show loading or error state
                VStack(spacing: 20) {
                    Text(String(format: "draft_preparing_order_format".localized, table.name))
                        .foregroundColor(.appTextSecondary)
                        .padding(16)
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
        VStack(spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(item.menu_item?.displayName ?? "unknown_item_text".localized)
                        .font(.cardTitle)
                        .fontWeight(.semibold)
                    
                    // Show size and toppings if available
                    if item.menu_item_size_id != nil || !(item.topping_ids?.isEmpty ?? true) {
                        VStack(alignment: .leading, spacing: 2) {
                            if item.menu_item_size_id != nil {
                                Text("draft_size_custom".localized)
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                            }
                            if let toppingIds = item.topping_ids, !toppingIds.isEmpty {
                                Text(String(format: "draft_toppings_count_format".localized, toppingIds.count))
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                            }
                        }
                    }
                    
                    if let notes = item.notes, !notes.isEmpty {
                        Text(notes)
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                            .padding(.top, 2)
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 4) {
                    Text(String(format: "price_format".localized, item.price_at_order * Double(item.quantity)))
                        .font(.headline)
                        .fontWeight(.semibold)
                        .foregroundColor(.appTextPrimary)

                    Text(String(format: "price_each_format".localized, item.price_at_order))
                        .font(.captionRegular)
                        .foregroundColor(.appTextSecondary)
                }
            }
            
            // Quantity controls - compact design with gesture isolation
            HStack {
                // Quantity stepper section
                HStack(spacing: 8) {
                    Button {
                        print("➖ Minus button pressed - item: \(item.id), current: \(item.quantity)")
                        Task { await updateItemQuantity(item.id, newQuantity: max(1, item.quantity - 1)) }
                    } label: {
                        Image(systemName: "minus.circle.fill")
                            .font(.title3)
                            .foregroundColor(.appError)
                    }
                    .disabled(item.quantity <= 1)
                    .buttonStyle(.plain)
                    .frame(width: 32, height: 32)
                    .background(Color.clear)
                    
                    Text("\(item.quantity)")
                        .font(.headline)
                        .fontWeight(.semibold)
                        .frame(minWidth: 24)
                    
                    Button {
                        let newQty = item.quantity + 1
                        print("🔥 Plus button pressed - item: \(item.id), current: \(item.quantity), new: \(newQty)")
                        Task { await updateItemQuantity(item.id, newQuantity: newQty) }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundColor(.appPrimary)
                    }
                    .buttonStyle(.plain)
                    .frame(width: 32, height: 32)
                    .background(Color.clear)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color.appSurfaceSecondary)
                .cornerRadius(8)
                
                Spacer()
                
                // Delete button - isolated with different styling
                Button {
                    print("🗑️ Delete button pressed - item: \(item.id)")
                    Task { await removeOrderItem(item.id) }
                } label: {
                    Image(systemName: "trash.circle.fill")
                        .font(.title3)
                        .foregroundColor(.appError)
                }
                .buttonStyle(.plain)
                .frame(width: 36, height: 36)
                .background(Color.appError.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 4)
    }

    @ViewBuilder
    private func actionButtons() -> some View {
        let hasItems = draftOrder?.order_items?.isEmpty == false
        
        VStack(spacing: 12) {
            Button {
                if hasItems {
                    Task { await confirmOrderToKitchen() }
                } else {
                    dismiss() // Go back to menu to add items
                }
            } label: {
                if hasItems {
                    Label("confirm_order_to_kitchen_button_title".localized, systemImage: "paperplane.fill")
                } else {
                    Label("draft_add_items_to_continue".localized, systemImage: "plus.circle.fill")
                }
            }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(isProcessingOrder || draftOrder == nil)
            .accessibilityLabel(hasItems ? "confirm_order_to_kitchen_accessibility_label".localized : "draft_add_items_accessibility".localized)
            .accessibilityHint(hasItems ? "confirm_order_to_kitchen_accessibility_hint".localized : "draft_add_items_hint".localized)

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
            // For local draft orders, no need to fetch from database
            if orderManager.localDraftOrders[orderId] != nil {
                print("Local draft order found for: \(orderId)")
            } else {
                // Fetch from database for existing orders
                _ = try await orderManager.getDraftOrder(orderId: orderId)
            }
        } catch {
            self.errorMessage = error.localizedDescription
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
            // No need to fetch - the computed property will automatically update
        } catch {
            self.errorMessage = error.localizedDescription
            self.showingErrorAlert = true
        }
        isProcessingOrder = false
    }

    @MainActor
    private func updateItemQuantity(_ orderItemId: String, newQuantity: Int) async {
        print("🎯 DraftOrderView.updateItemQuantity called - itemId: \(orderItemId), newQuantity: \(newQuantity)")
        
        guard newQuantity > 0 else {
            print("🗑️ Quantity is <= 0, removing item")
            await removeOrderItem(orderItemId)
            return
        }
        
        isProcessingOrder = true
        errorMessage = nil
        do {
            print("🎯 Calling orderManager.updateDraftOrderItemQuantity")
            try await orderManager.updateDraftOrderItemQuantity(orderItemId: orderItemId, newQuantity: newQuantity)
            print("🎯 Successfully updated quantity in OrderManager")
        } catch {
            self.errorMessage = error.localizedDescription
            self.showingErrorAlert = true
        }
        isProcessingOrder = false
    }

    @MainActor
    private func confirmOrderToKitchen() async {
        guard let order = draftOrder, order.id == orderId else {
            self.errorMessage = "error_order_update_failed".localized
            self.showingErrorAlert = true
            return
        }

        isProcessingOrder = true
        errorMessage = nil
        do {
            _ = try await orderManager.confirmOrderToKitchen(orderId: order.id)
            self.showOrderConfirmedAlert = true
        } catch {
            self.errorMessage = error.localizedDescription
            self.showingErrorAlert = true
        }
        isProcessingOrder = false
    }

    @MainActor
    private func cancelEntireOrder() async {
        guard let order = draftOrder, order.id == orderId else {
            self.errorMessage = "error_order_update_failed".localized
            self.showingErrorAlert = true
            return
        }

        isProcessingOrder = true
        errorMessage = nil
        do {
            try await orderManager.clearDraftOrder(orderId: order.id)
            dismiss()
        } catch {
            self.errorMessage = error.localizedDescription
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

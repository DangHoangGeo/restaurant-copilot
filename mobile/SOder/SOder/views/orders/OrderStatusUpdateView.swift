import SwiftUI

struct OrderStatusUpdateView: View {
    let order: Order
    
    @EnvironmentObject var orderManager: OrderManager
    @Environment(\.dismiss) var dismiss
    
    @State private var newOrderStatus: OrderStatus
    @State private var itemStatusUpdates: [String: OrderItemStatus] = [:]
    @State private var hasChanges = false
    @State private var isUpdating = false
    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert = false
    
    init(order: Order) {
        self.order = order
        self._newOrderStatus = State(initialValue: order.status)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("order_status_update_section_header".localized)) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(String(format: "order_status_update_current_status_format".localized, order.status.displayName))
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Picker("order_status_update_new_status_picker".localized, selection: $newOrderStatus) {
                            ForEach(OrderStatus.allCases, id: \.self) { status in
                                HStack {
                                    Circle()
                                        .fill(Color(status.color))
                                        .frame(width: 12, height: 12)
                                    Text(status.displayName)
                                }
                                .tag(status)
                            }
                        }
                        .pickerStyle(.menu)
                        .onChange(of: newOrderStatus) { _, _ in
                            hasChanges = true
                        }
                    }
                }
                
                if let orderItems = order.order_items, !orderItems.isEmpty {
                    Section(header: Text("order_status_update_item_status_section_header".localized)) {
                        ForEach(orderItems) { item in
                            orderItemStatusRow(item)
                        }
                    }
                }
                
                Section {
                    VStack(spacing: 12) {
                        if hasChanges {
                            Text("order_status_update_unsaved_changes_warning".localized)
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                        
                        Button {
                            Task { await updateStatuses() }
                        } label: {
                            HStack {
                                if isUpdating {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                        .padding(.trailing, 4)
                                }
                                Image(systemName: "checkmark.circle.fill")
                                Text("order_status_update_button".localized)
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(!hasChanges || isUpdating)
                    }
                }
            }
            .navigationTitle("order_status_update_title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("cancel".localized) {
                        dismiss()
                    }
                }
            }
            .alert("error".localized, isPresented: $showingErrorAlert) {
                Button("ok".localized) {}
            } message: {
                Text(errorMessage ?? "order_status_update_default_error".localized)
            }
        }
        .onAppear {
            initializeItemStatuses()
        }
    }
    
    private func orderItemStatusRow(_ item: OrderItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(item.menu_item?.displayName ?? "orders_unknown_item".localized)
                        .font(.headline)
                    
                    Text(String(format: "order_status_update_item_quantity_format".localized, item.quantity))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("order_status_update_item_current_status_label".localized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Text(item.status.displayName)
                        .font(.caption)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(item.status.color).opacity(0.2))
                        .foregroundColor(Color(item.status.color))
                        .cornerRadius(4)
                }
            }
            
            Picker("order_status_update_item_status_picker".localized, selection: Binding(
                get: { itemStatusUpdates[item.id] ?? item.status },
                set: { newStatus in
                    itemStatusUpdates[item.id] = newStatus
                    hasChanges = true
                }
            )) {
                ForEach(OrderItemStatus.allCases, id: \.self) { status in
                    HStack {
                        Circle()
                            .fill(Color(status.color))
                            .frame(width: 10, height: 10)
                        Text(status.displayName)
                    }
                    .tag(status)
                }
            }
            .pickerStyle(.menu)
        }
        .padding(.vertical, 4)
    }
    
    private func initializeItemStatuses() {
        // Initialize with current statuses if not already set
        if let orderItems = order.order_items {
            for item in orderItems {
                if itemStatusUpdates[item.id] == nil {
                    itemStatusUpdates[item.id] = item.status
                }
            }
        }
    }
    
    @MainActor
    private func updateStatuses() async {
        isUpdating = true
        errorMessage = nil
        
        do {
            // Update order status if changed
            if newOrderStatus != order.status {
                try await orderManager.updateOrderStatus(orderId: order.id, newStatus: newOrderStatus)
            }
            
            // Update individual item statuses if changed
            if let orderItems = order.order_items {
                for item in orderItems {
                    if let newStatus = itemStatusUpdates[item.id], newStatus != item.status {
                        await orderManager.updateOrderItemStatus(orderItemId: item.id, newStatus: newStatus)
                    }
                }
            }
            
            // Success - dismiss the view
            dismiss()
            
        } catch {
            errorMessage = "Failed to update status: \(error.localizedDescription)"
            showingErrorAlert = true
        }
        
        isUpdating = false
    }
}

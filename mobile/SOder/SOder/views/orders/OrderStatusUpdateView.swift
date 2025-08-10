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
                Section(header: Text("Order Status")) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Current: \(order.status.displayName)")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Picker("New Status", selection: $newOrderStatus) {
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
                    Section(header: Text("Individual Item Status")) {
                        ForEach(orderItems) { item in
                            orderItemStatusRow(item)
                        }
                    }
                }
                
                Section {
                    VStack(spacing: 12) {
                        if hasChanges {
                            Text("⚠️ You have unsaved changes")
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
                                Text("Update Status")
                            }
                            .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(!hasChanges || isUpdating)
                    }
                }
            }
            .navigationTitle("Update Status")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

#if DEBUG
#Preview {
    // Mock Environment Objects
    let orderManager = OrderManager.shared
    let printerManager = PrinterManager.shared
    let localizationManager = LocalizationManager.shared

    // Populate with mock data for preview
    let mockCategory = Category(id: "1", name_en: "Drinks", name_ja: "飲み物", name_vi: "Đồ uống", position: 1)
    let mockMenuItem = MenuItem(id: "1", restaurant_id: "1", category_id: "1", name_en: "Coffee", name_ja: "コーヒー", name_vi: "Cà phê", code: "COF", description_en: "Hot coffee", description_ja: "ホットコーヒー", description_vi: "Cà phê nóng", price: 5.0, tags: [], image_url: nil, stock_level: nil, available: true, position: 1, created_at: "", updated_at: "", category: mockCategory, availableSizes: [], availableToppings: [])
    let mockOrderItem = OrderItem(id: "1", restaurant_id: "1", order_id: "1", menu_item_id: "1", quantity: 2, notes: "Extra hot", menu_item_size_id: nil, topping_ids: [], price_at_order: 5.0, status: .new, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", menu_item: mockMenuItem)
    let mockTable = Table(id: "1", restaurant_id: "1", name: "Table 1", status: .occupied, capacity: 4, is_outdoor: false, is_accessible: true, notes: nil, qr_code: nil, created_at: "", updated_at: "")
    let mockOrder = Order(id: "1", restaurant_id: "1", table_id: "1", session_id: "1", guest_count: 2, status: .new, total_amount: 10.0, order_number: 1, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", table: mockTable, order_items: [mockOrderItem], payment_method: nil, discount_amount: nil, tax_amount: nil, tip_amount: nil)

    return OrderStatusUpdateView(order: mockOrder)
        .environmentObject(orderManager)
        .environmentObject(printerManager)
        .environmentObject(localizationManager)
        .environmentObject(SupabaseManager.shared)
}
#endif
            }
            .alert("Error", isPresented: $showingErrorAlert) {
                Button("OK") {}
            } message: {
                Text(errorMessage ?? "Failed to update status")
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
                    Text(item.menu_item?.displayName ?? "Unknown Item")
                        .font(.headline)
                    
                    Text("Qty: \(item.quantity)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text("Current:")
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
            
            Picker("Status", selection: Binding(
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
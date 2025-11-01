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
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Enhanced Order Header
                    VStack(spacing: Spacing.md) {
                        HStack {
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Text(order.table?.name ?? "Table \(order.table_id)")
                                    .font(.cardTitle)
                                    .fontWeight(.bold)
                                    .foregroundColor(.appTextPrimary)
                                
                                HStack(spacing: Spacing.md) {
                                    Label("\(order.guest_count ?? 1)", systemImage: "person.2.fill")
                                        .font(.captionRegular)
                                        .foregroundColor(.appTextTertiary)
                                    
                                    Label("ID: \(String(order.id.prefix(6).uppercased()))", systemImage: "number")
                                        .font(.captionRegular)
                                        .foregroundColor(.appTextTertiary)
                                }
                            }
                            Spacer()
                            EnhancedStatusBadge(status: order.status)
                        }
                    }
                    .elevatedCardStyle()
                    
                    // Enhanced Order Status Section
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        HStack {
                            Image(systemName: "arrow.triangle.2.circlepath")
                                .font(.title3)
                                .foregroundColor(.appPrimary)
                            Text("order_status_update_section_header".localized)
                                .font(.sectionHeader)
                                .fontWeight(.semibold)
                                .foregroundColor(.appTextPrimary)
                            Spacer()
                        }
                        
                        VStack(spacing: Spacing.sm) {
                            HStack {
                                Text("order_status_update_current_status_label".localized)
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                                Spacer()
                                EnhancedStatusBadge(status: order.status)
                            }
                            
                            Divider()
                            
                            VStack(alignment: .leading, spacing: Spacing.xs) {
                                Text("order_status_update_new_status_label".localized)
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                                
                                Menu {
                                    ForEach(OrderStatus.allCases, id: \.self) { status in
                                        Button(action: { 
                                            newOrderStatus = status
                                            hasChanges = true
                                        }) {
                                            HStack {
                                                Circle()
                                                    .fill(statusColor(for: status))
                                                    .frame(width: 12, height: 12)
                                                Text(status.displayName)
                                                Spacer()
                                                if newOrderStatus == status {
                                                    Image(systemName: "checkmark")
                                                        .foregroundColor(.appPrimary)
                                                }
                                            }
                                        }
                                    }
                                } label: {
                                    HStack {
                                        Circle()
                                            .fill(statusColor(for: newOrderStatus))
                                            .frame(width: 16, height: 16)
                                        Text(newOrderStatus.displayName)
                                            .font(.bodyMedium)
                                            .fontWeight(.medium)
                                            .foregroundColor(.appTextPrimary)
                                        Spacer()
                                        Image(systemName: "chevron.down")
                                            .font(.captionRegular)
                                            .foregroundColor(.appTextSecondary)
                                    }
                                    .padding()
                                    .background(Color.appSurfaceSecondary)
                                    .cornerRadius(CornerRadius.md)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: CornerRadius.md)
                                            .stroke(Color.appBorderLight, lineWidth: 1)
                                    )
                                }
                            }
                        }
                    }
                    .elevatedCardStyle()
                    
                    // Enhanced Individual Items Section
                    if let orderItems = order.order_items, !orderItems.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            HStack {
                                Image(systemName: "list.bullet.circle")
                                    .font(.title3)
                                    .foregroundColor(.appPrimary)
                                Text("order_status_update_item_status_section_header".localized)
                                    .font(.sectionHeader)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.appTextPrimary)
                                Spacer()
                                Text("(\(orderItems.count))")
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                            }
                            
                            VStack(spacing: Spacing.sm) {
                                ForEach(orderItems) { item in
                                    enhancedOrderItemStatusRow(item)
                                }
                            }
                        }
                        .elevatedCardStyle()
                    }
                    
                    // Enhanced Action Section
                    VStack(spacing: Spacing.md) {
                        if hasChanges {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.appWarning)
                                Text("order_status_update_unsaved_changes_warning".localized)
                                    .font(.captionRegular)
                                    .foregroundColor(.appWarning)
                                Spacer()
                            }
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.xs)
                            .background(Color.appWarningLight)
                            .cornerRadius(CornerRadius.sm)
                        }
                        
                        Button { Task { await updateStatuses() } } label: {
                            HStack {
                                if isUpdating { 
                                    ProgressView()
                                        .scaleEffect(0.9)
                                        .padding(.trailing, 4) 
                                } else { 
                                    Image(systemName: "checkmark.circle.fill") 
                                }
                                Text(isUpdating ? "order_status_update_updating".localized : "order_status_update_button".localized)
                                    .fontWeight(.semibold)
                            }
                        }
                        .buttonStyle(PrimaryButtonStyle(isEnabled: hasChanges && !isUpdating))
                        .disabled(!hasChanges || isUpdating)
                        
                        if !hasChanges {
                            Text("order_status_update_disabled_hint".localized)
                                .font(.captionRegular)
                                .foregroundColor(.appTextTertiary)
                                .multilineTextAlignment(.center)
                        }
                    }
                    .padding()
                }
                .padding()
            }
            .background(Color.appBackground)
            .navigationTitle("order_status_update_title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("cancel".localized) { dismiss() }
                        .foregroundColor(.appTextSecondary)
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
    
    private func enhancedOrderItemStatusRow(_ item: OrderItem) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                // Quantity badge
                Text("\(item.quantity)")
                    .font(.captionBold)
                    .foregroundColor(.appTextSecondary)
                    .frame(width: 24, height: 24)
                    .background(Circle().fill(Color.appSurfaceSecondary))
                
                // Item info
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(item.menu_item?.displayName ?? "orders_unknown_item".localized)
                        .font(.bodyMedium)
                        .fontWeight(.medium)
                        .foregroundColor(.appTextPrimary)
                    
                    if let code = item.menu_item?.code, !code.isEmpty {
                        Text(code)
                            .font(.captionRegular)
                            .foregroundColor(.appTextTertiary)
                    }
                }
                
                Spacer()
                
                // Current status
                OrderItemStatusBadge(status: item.status)
            }
            
            // Status picker with enhanced design
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("order_status_update_item_new_status_label".localized)
                    .font(.captionRegular)
                    .foregroundColor(.appTextSecondary)
                
                Menu {
                    ForEach(OrderItemStatus.allCases, id: \.self) { status in
                        Button(action: { 
                            itemStatusUpdates[item.id] = status
                            hasChanges = true
                        }) {
                            HStack {
                                Circle()
                                    .fill(itemStatusColor(for: status))
                                    .frame(width: 12, height: 12)
                                Text(status.displayName)
                                Spacer()
                                if (itemStatusUpdates[item.id] ?? item.status) == status {
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.appPrimary)
                                }
                            }
                        }
                    }
                } label: {
                    HStack {
                        let currentStatus = itemStatusUpdates[item.id] ?? item.status
                        Circle()
                            .fill(itemStatusColor(for: currentStatus))
                            .frame(width: 14, height: 14)
                        Text(currentStatus.displayName)
                            .font(.captionBold)
                            .foregroundColor(.appTextPrimary)
                        Spacer()
                        Image(systemName: "chevron.down")
                            .font(.caption2)
                            .foregroundColor(.appTextSecondary)
                    }
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(Color.appSurfaceSecondary)
                    .cornerRadius(CornerRadius.sm)
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.sm)
                            .stroke(Color.appBorderLight, lineWidth: 0.5)
                    )
                }
            }
        }
        .padding(Spacing.sm)
        .background(Color.appSurfaceSecondary)
        .cornerRadius(CornerRadius.sm)
    }
    
    private func statusColor(for status: OrderStatus) -> Color {
        switch status {
        case .draft: return .appTextSecondary
        case .new: return .appInfo
        case .serving: return .appWarning
        case .completed: return .appSuccess
        case .canceled: return .appError
        }
    }
    
    private func itemStatusColor(for status: OrderItemStatus) -> Color {
        switch status {
        case .draft: return .appTextSecondary
        case .new: return .appInfo
        case .preparing: return .appWarning
        case .ready: return .appSuccess
        case .served: return .appTextSecondary
        case .canceled: return .appError
        }
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

        // Haptic feedback at start
        let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
        impactFeedback.impactOccurred()

        do {
            // Update order status if changed
            if newOrderStatus != order.status {
                try await orderManager.updateOrderStatus(orderId: order.id, newStatus: newOrderStatus)
            }

            // Update individual item statuses if changed
            if let orderItems = order.order_items {
                for item in orderItems {
                    if let newStatus = itemStatusUpdates[item.id], newStatus != item.status {
                        do {
                            try await orderManager.updateOrderItemStatus(orderItemId: item.id, newStatus: newStatus)
                        } catch {
                            print("Failed to update status for item \(item.id): \(error.localizedDescription)")
                            errorMessage = "Failed to update some item statuses"
                            
                            // Error haptic
                            let feedback = UINotificationFeedbackGenerator()
                            feedback.notificationOccurred(.error)
                            return // Exit early if any update fails
                        }
                    }
                }
            }

            // Success haptic
            let notificationFeedback = UINotificationFeedbackGenerator()
            notificationFeedback.notificationOccurred(.success)

            // Success - dismiss the view
            dismiss()

        } catch {
            errorMessage = "Failed to update status: \(error.localizedDescription)"
            showingErrorAlert = true
            // Error haptic
            let notificationFeedback = UINotificationFeedbackGenerator()
            notificationFeedback.notificationOccurred(.error)
        }

        isUpdating = false
    }
}

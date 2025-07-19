import SwiftUI

struct OrderItemDetailView: View {
    let item: OrderItem
    let orderManager: OrderManager
    let printerManager: PrinterManager
    let onComplete: () -> Void
    let onPrintResult: (String) -> Void
    
    @State private var isUpdatingStatus = false
    @State private var isUpdatingNotes = false
    @State private var isCancelling = false
    @State private var editingNotes = false
    @State private var tempNotes: String = ""
    @State private var showingCancelConfirmation = false
    
    var body: some View {
        ZStack {
            // Background overlay
            Color.black.opacity(0.3)
                .ignoresSafeArea()
                .onTapGesture {
                    onComplete()
                }
            // Detail dialog
            VStack(spacing: 0) {
                // Header
                headerSection
                
                // Content
                ScrollView {
                    VStack(spacing: Spacing.md) {
                        // Item summary
                        itemSummarySection
                        
                        // Notes section
                        notesSection
                        
                        // Status management
                        statusManagementSection
                        
                        // Action buttons
                        actionButtonsSection
                    }
                    .padding()
                }
                .background(Color.appBackground)
            }
            .frame(maxWidth: 600) // Limit width for iPad
            .frame(maxHeight: UIScreen.main.bounds.height * 0.8) // Limit height
            .background(Color.appSurface)
            .cornerRadius(CornerRadius.lg)
            .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
            .padding()
        }
        .onAppear {
            tempNotes = item.notes ?? ""
        }
        .alert("Cancel Item", isPresented: $showingCancelConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Confirm", role: .destructive) {
                Task {
                    await cancelItem()
                }
            }
        } message: {
            Text("Are you sure you want to cancel this item? This action cannot be undone.")
        }
    }
    
    // MARK: - Sections
    
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(item.menu_item?.displayName ?? "Unknown Item")
                    .font(.cardTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.appTextPrimary)
                
                HStack(spacing: 16) {
                    Label("×\(item.quantity)", systemImage: "number.circle")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Label(timeAgoText, systemImage: "clock")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
            
            Button("Close") {
                onComplete()
            }
            .font(.bodyMedium)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(Color.appSurface)
            .cornerRadius(CornerRadius.sm)
        }
        .padding()
        .background(Color.appSurface)
        .overlay(
            Rectangle()
                .frame(height: 1)
                .foregroundColor(Color.appBorder),
            alignment: .bottom
        )
    }
    
    private var itemSummarySection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("item_detail_item_details_title".localized)
                .font(.sectionHeader)
                .fontWeight(.semibold)
                .foregroundColor(.appTextPrimary)
            
            VStack(alignment: .leading, spacing: Spacing.sm) {
                // Name and quantity
                HStack {
                    Text("Name:")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)
                    
                    Text(item.menu_item?.displayName ?? "Unknown Item")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Spacer()
                    
                    Text("Qty: \(item.quantity)")
                        .font(.subheadline)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(.systemGray5))
                        .cornerRadius(8)
                }
                
                // Price if available
                if let price = item.menu_item?.price {
                    HStack {
                        Text("Price:")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.secondary)
                        
                        Text("¥\(String(format: "%.0f", price * Double(item.quantity)))")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                        
                        Spacer()
                    }
                }
            }
        }
        .padding()
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.lg)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    private var notesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("Special Notes")
                    .font(.headline)
                    .fontWeight(.semibold)
                    .foregroundColor(.appTextPrimary)
                
                Spacer()
                
                if !editingNotes {
                    Button("Edit") {
                        editingNotes = true
                    }
                    .font(.subheadline)
                    .foregroundColor(.blue)
                }
            }
            
            if editingNotes {
                VStack(spacing: 12) {
                    TextField("Enter special notes...", text: $tempNotes, axis: .vertical)
                        .textFieldStyle(.roundedBorder)
                        .lineLimit(3...6)
                    
                    HStack {
                        Button("Cancel") {
                            tempNotes = item.notes ?? ""
                            editingNotes = false
                        }
                        .buttonStyle(.bordered)
                        
                        Spacer()
                        
                        Button("Save") {
                            Task {
                                await saveNotes()
                            }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(isUpdatingNotes)
                    }
                }
            } else {
                Text(item.notes?.isEmpty == false ? item.notes! : "No special notes")
                    .font(.subheadline)
                    .foregroundColor(item.notes?.isEmpty == false ? .primary : .secondary)
                    .padding()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color(.systemGray6))
                    .cornerRadius(12)
            }
        }
        .padding()
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.lg)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    private var statusManagementSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("item_detail_status_management_title".localized)
                .font(.sectionHeader)
                .fontWeight(.semibold)
                .foregroundColor(.appTextPrimary)
            
            VStack(spacing: Spacing.sm) {
                // Current status display
                HStack {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 16, height: 16)
                    
                    Text("Current Status: \(item.status.displayName)")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Spacer()
                }
                
                // Status progression
                OrderItemStatusProgressView(currentStatus: item.status)
                
                // Status advance button
                if item.status != .served && item.status != .cancelled {
                    Button(action: {
                        Task {
                            await advanceStatus()
                        }
                    }) {
                        HStack {
                            if isUpdatingStatus {
                                ProgressView()
                                    .scaleEffect(0.8)
                                    .foregroundColor(.white)
                            } else {
                                Image(systemName: statusIcon)
                            }
                            
                            Text(isUpdatingStatus ? "Updating..." : "Mark as \(nextStatusText)")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(isUpdatingStatus ? Color.gray : statusColor)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isUpdatingStatus)
                }
                
                // Cancel button
                if item.status != .served && item.status != .cancelled {
                    Button(action: {
                        showingCancelConfirmation = true
                    }) {
                        HStack {
                            if isCancelling {
                                ProgressView()
                                    .scaleEffect(0.8)
                                    .foregroundColor(.white)
                            } else {
                                Image(systemName: "xmark.circle")
                            }
                            
                            Text(isCancelling ? "Cancelling..." : "Cancel Item")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 44)
                        .background(isCancelling ? Color.gray : Color.red)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(isCancelling)
                }
            }
        }
        .padding()
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.lg)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    private var actionButtonsSection: some View {
        VStack(spacing: Spacing.sm) {
            Button(action: {
                Task {
                    await printKitchenSlip()
                }
            }) {
                HStack {
                    Image(systemName: "doc.text")
                    Text("Print Kitchen Slip")
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(Color.gray)
                .foregroundColor(.white)
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.lg)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Computed Properties
    
    private var timeAgoText: String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: item.created_at) else { return "Unknown" }
        
        let displayFormatter = RelativeDateTimeFormatter()
        displayFormatter.unitsStyle = .full
        return displayFormatter.localizedString(for: date, relativeTo: Date())
    }
    
    private var statusColor: Color {
        switch item.status {
        case .draft: return .appTextSecondary
        case .ordered: return .appInfo
        case .preparing: return .appWarning
        case .ready: return .appSuccess
        case .served: return .appTextSecondary
        case .cancelled: return .appError
        }
    }
    
    private var statusIcon: String {
        switch item.status {
        case .draft: return "doc.text.fill"
        case .ordered: return "flame"
        case .preparing: return "checkmark.circle"
        case .ready: return "checkmark.circle.fill"
        case .served: return "checkmark.seal.fill"
        case .cancelled: return "xmark.circle.fill"
        }
    }
    
    private var nextStatusText: String {
        switch item.status {
        case .draft: return "Order"
        case .ordered: return "Preparing"
        case .preparing: return "Ready"
        case .ready: return "Served"
        case .served: return "Completed"
        case .cancelled: return "Cancelled"
        }
    }
    
    // MARK: - Helper Functions
    
    @MainActor
    private func saveNotes() async {
        isUpdatingNotes = true
        let notesToSave = tempNotes.trimmingCharacters(in: .whitespacesAndNewlines)
        let finalNotes = notesToSave.isEmpty ? nil : notesToSave
        
        await orderManager.updateOrderItemNotes(orderItemId: item.id, notes: finalNotes)
        
        editingNotes = false
        isUpdatingNotes = false
        onPrintResult("Notes updated successfully")
    }
    
    @MainActor
    private func advanceStatus() async {
        isUpdatingStatus = true
        
        let nextStatus = getNextStatus()
        await orderManager.updateOrderItemStatus(orderItemId: item.id, newStatus: nextStatus)
        
        isUpdatingStatus = false
        onPrintResult("Status updated to \(nextStatus.displayName)")
        
        // Close after a short delay to show feedback
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            onComplete()
        }
    }
    
    @MainActor
    private func cancelItem() async {
        isCancelling = true
        
        await orderManager.cancelOrderItem(orderItemId: item.id)
        
        isCancelling = false
        onPrintResult("Item cancelled successfully")
        
        // Close after a short delay to show feedback
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            onComplete()
        }
    }
    
    @MainActor
    private func printKitchenSlip() async {
        do {
            // Convert OrderItem to a format that the printer can handle
            // This is a simplified approach - you might want to create a proper conversion method
            onPrintResult("Kitchen slip printing not yet implemented for order items")
        } catch {
            onPrintResult("Failed to print kitchen slip: \(error.localizedDescription)")
        }
    }
    
    private func getNextStatus() -> OrderItemStatus {
        switch item.status {
        case .draft:
            return .ordered
        case .ordered:
            return .preparing
        case .preparing:
            return .ready
        case .ready:
            return .served
        case .served:
            return .served
        case .cancelled:
            return .cancelled
        }
    }
}

// MARK: - Supporting Views for OrderItem

struct OrderItemStatusProgressView: View {
    let currentStatus: OrderItemStatus
    
    private let allStatuses: [OrderItemStatus] = [.ordered, .preparing, .ready, .served]
    
    var body: some View {
        HStack(spacing: 8) {
            ForEach(allStatuses, id: \.self) { status in
                VStack(spacing: 4) {
                    Circle()
                        .fill(status <= currentStatus ? statusColor(for: status) : Color.gray.opacity(0.3))
                        .frame(width: 16, height: 16)
                    
                    Text(status.displayName)
                        .font(.caption2)
                        .foregroundColor(status <= currentStatus ? .primary : .secondary)
                }
                
                if status != allStatuses.last {
                    Rectangle()
                        .fill(status < currentStatus ? Color.green : Color.gray.opacity(0.3))
                        .frame(height: 2)
                        .frame(maxWidth: .infinity)
                }
            }
            
            // Show cancelled status separately if item is cancelled
            if currentStatus == .cancelled {
                VStack(spacing: 4) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.red)
                        .frame(width: 16, height: 16)
                    
                    Text("Cancelled")
                        .font(.caption2)
                        .foregroundColor(.red)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func statusColor(for status: OrderItemStatus) -> Color {
        switch status {
        case .draft: return .purple
        case .ordered: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
        case .cancelled: return .red
        }
    }
}

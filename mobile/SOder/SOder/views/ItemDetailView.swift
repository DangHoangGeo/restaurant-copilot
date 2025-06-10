import SwiftUI

struct ItemDetailView: View {
    let item: GroupedItem
    let orderManager: OrderManager
    let printerManager: PrinterManager
    let onComplete: () -> Void
    let onPrintResult: (String) -> Void
    let onStatusAdvance: () -> Void
    
    @State private var isAdvancingStatus = false
    
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
                    VStack(spacing: 20) {
                        // Item summary
                        itemSummarySection
                        
                        // Status management
                        statusManagementSection
                        
                        // Action buttons
                        actionButtonsSection
                    }
                    .padding()
                }
                .background(Color(.systemGroupedBackground))
            }
            .frame(maxWidth: 600) // Limit width for iPad
            .frame(maxHeight: UIScreen.main.bounds.height * 0.8) // Limit height
            .background(Color(.systemBackground))
            .cornerRadius(20)
            .shadow(color: Color.black.opacity(0.3), radius: 20, x: 0, y: 10)
            .padding()
        }
    }
    
    // MARK: - Sections
    
    private var headerSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.itemName)
                    .font(.headline)
                    .fontWeight(.bold)
                
                HStack(spacing: 16) {
                    Label("×\(item.quantity)", systemImage: "number.circle")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    Label(timeAgoText, systemImage: "clock")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                    
                    if item.priority >= KitchenBoardConfig.urgentThreshold {
                        HStack(spacing: 4) {
                            Image(systemName: "exclamationmark.triangle.fill")
                            Text("URGENT")
                                .font(.caption)
                                .fontWeight(.bold)
                        }
                        .foregroundColor(.red)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.red.opacity(0.2))
                        .cornerRadius(8)
                    }
                }
            }
            
            Spacer()
            
            Button("Close") {
                onComplete()
            }
            .font(.subheadline)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color(.systemGray5))
            .cornerRadius(8)
        }
        .padding()
        .background(Color(.systemBackground))
        .overlay(
            Rectangle()
                .frame(height: 1)
                .foregroundColor(Color(.systemGray4)),
            alignment: .bottom
        )
    }
    
    private var itemSummarySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Item Details")
                .font(.headline)
                .fontWeight(.semibold)
            
            VStack(alignment: .leading, spacing: 12) {
                // Name and size
                HStack {
                    Text("Name:")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)
                    
                    Text(item.itemName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    Spacer()
                    
                    if let size = item.size {
                        Text("Size: \(size)")
                            .font(.subheadline)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color(.systemGray5))
                            .cornerRadius(8)
                    }
                }
                
                // Quantity and tables
                HStack {
                    Text("Quantity:")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)
                    
                    Text("×\(item.quantity)")
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.orange)
                    
                    Spacer()
                    
                    Text("Tables: \(item.tables.sorted().joined(separator: ", "))")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
                
                // Toppings/modifications
                if !item.toppings.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Modifications:")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.secondary)
                        
                        ForEach(item.toppings, id: \.self) { topping in
                            HStack {
                                Circle()
                                    .fill(Color.blue)
                                    .frame(width: 6, height: 6)
                                
                                Text(topping)
                                    .font(.subheadline)
                                    .foregroundColor(.blue)
                                
                                Spacer()
                            }
                        }
                    }
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)
                }
                
                // Notes
                if !item.displayNotes.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Special Notes:")
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundColor(.secondary)
                        
                        Text(item.displayNotes)
                            .font(.subheadline)
                            .foregroundColor(.blue)
                            .fontWeight(.medium)
                    }
                    .padding()
                    .background(Color.blue.opacity(0.1))
                    .cornerRadius(12)
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    private var statusManagementSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Status Management")
                .font(.headline)
                .fontWeight(.semibold)
            
            VStack(spacing: 12) {
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
                StatusProgressView(currentStatus: item.status)
                
                // Status advance button
                Button(action: {
                    isAdvancingStatus = true
                    onStatusAdvance()
                    
                    // Add small delay before closing to show feedback
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        isAdvancingStatus = false
                        onComplete()
                    }
                }) {
                    HStack {
                        if isAdvancingStatus {
                            ProgressView()
                                .scaleEffect(0.8)
                                .foregroundColor(.white)
                        } else {
                            Image(systemName: statusIcon)
                        }
                        
                        Text(isAdvancingStatus ? "Updating..." : "Mark as \(nextStatusText)")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(isAdvancingStatus ? Color.gray : statusColor)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(item.status == .served || isAdvancingStatus)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    private var actionButtonsSection: some View {
        VStack(spacing: 12) {
        
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
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
    
    // MARK: - Computed Properties
    
    private var timeAgoText: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        return formatter.localizedString(for: item.orderTime, relativeTo: Date())
    }
    
    private var statusColor: Color {
        switch item.status {
        case .ordered: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
        }
    }
    
    private var statusIcon: String {
        switch item.status {
        case .ordered: return "flame"
        case .preparing: return "checkmark.circle"
        case .ready: return "checkmark.circle.fill"
        case .served: return "checkmark.seal.fill"
        }
    }
    
    private var nextStatusText: String {
        switch item.status {
        case .ordered: return "Preparing"
        case .preparing: return "Ready"
        case .ready: return "Served"
        case .served: return "Completed"
        }
    }
    
    // MARK: - Helper Functions
    
    @MainActor
    private func printItemSummary() async {
        do {
            try await printerManager.printKitchenItemSummary(item)
            onPrintResult("Item summary printed successfully")
        } catch {
            onPrintResult("Failed to print item summary: \(error.localizedDescription)")
        }
    }
    
    @MainActor
    private func printKitchenSlip() async {
        do {
            try await printerManager.printKitchenSlip(item)
            onPrintResult("Kitchen slip printed successfully")
        } catch {
            onPrintResult("Failed to print kitchen slip: \(error.localizedDescription)")
        }
    }
}

// MARK: - Supporting Views

struct OrderItemDetailRow: View {
    let orderItem: OrderItem
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Order #\(orderItem.id.prefix(8))")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text("Quantity: \(orderItem.quantity)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                if let notes = orderItem.notes, !notes.isEmpty {
                    Text("Notes: \(notes)")
                        .font(.caption)
                        .foregroundColor(.blue)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Circle()
                    .fill(statusColor)
                    .frame(width: 12, height: 12)
                
                Text(orderItem.status.displayName)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
    
    private var statusColor: Color {
        switch orderItem.status {
        case .ordered: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
        }
    }
}

struct StatusProgressView: View {
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
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private func statusColor(for status: OrderItemStatus) -> Color {
        switch status {
        case .ordered: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
        }
    }
}

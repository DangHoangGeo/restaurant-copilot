import SwiftUI

struct ItemDetailView: View {
    let item: GroupedItem
    let orderManager: OrderManager
    let printerManager: PrinterManager
    let onComplete: () -> Void
    let onPrintResult: (String) -> Void
    let onStatusAdvance: () -> Void
    
    @State private var isAdvancingStatus = false
    @State private var timeAgoText: String = ""

    private let timer = Timer.publish(every: 10, on: .main, in: .common).autoconnect()
    
    var body: some View {
        GeometryReader { proxy in
            let isCompact = proxy.size.width < 520

            ZStack {
                Color.black.opacity(0.34)
                    .ignoresSafeArea()
                    .onTapGesture {
                        onComplete()
                    }

                VStack(spacing: 0) {
                    headerSection(isCompact: isCompact)

                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            itemSummarySection
                            statusManagementSection
                            actionButtonsSection
                        }
                        .padding(.horizontal, isCompact ? Spacing.md : Spacing.lg)
                        .padding(.top, Spacing.md)
                        .padding(.bottom, Spacing.xl)
                    }
                    .background(Color.appBackground)
                }
                .frame(maxWidth: isCompact ? .infinity : 620)
                .frame(maxHeight: isCompact ? .infinity : proxy.size.height * 0.86)
                .background(Color.appBackground)
                .clipShape(RoundedRectangle(cornerRadius: isCompact ? 0 : CornerRadius.lg))
                .shadow(color: Color.black.opacity(isCompact ? 0 : 0.16), radius: 22, x: 0, y: 12)
                .padding(isCompact ? 0 : Spacing.md)
                .ignoresSafeArea(edges: isCompact ? [.bottom] : [])
            }
        }
        .onAppear(perform: updateTimeAgoText)
        .onReceive(timer) { _ in
            updateTimeAgoText()
        }
    }
    
    // MARK: - Sections

    private func headerSection(isCompact: Bool) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(alignment: .top, spacing: Spacing.md) {
                Text(item.itemName)
                    .font(.cardTitle)
                    .fontWeight(.bold)
                    .foregroundColor(.appTextPrimary)
                    .lineLimit(3)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer(minLength: Spacing.sm)

                Button(action: onComplete) {
                    Image(systemName: "xmark")
                        .font(.bodyMedium.weight(.semibold))
                        .foregroundColor(.appTextPrimary)
                        .frame(width: 40, height: 40)
                        .background(Color.appSurfaceSecondary)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("item_detail_close_button".localized)
            }

            KitchenDetailChipWrap(spacing: Spacing.xs) {
                KitchenDetailChip(
                    icon: "number.circle",
                    text: String(format: "item_detail_quantity_format".localized, item.quantity),
                    tint: .appPrimary
                )
                KitchenDetailChip(icon: "clock", text: timeAgoText, tint: timeColor)
                KitchenDetailChip(icon: statusIcon, text: item.status.displayName, tint: statusColor)

                if item.priority >= KitchenBoardConfig.urgentThreshold {
                    KitchenDetailChip(
                        icon: "exclamationmark.triangle.fill",
                        text: "kitchen_urgent".localized,
                        tint: .appError
                    )
                }
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, isCompact ? Spacing.lg : Spacing.md)
        .padding(.bottom, Spacing.md)
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
                .font(.monoCaption)
                .fontWeight(.semibold)
                .foregroundColor(.appTextSecondary)
            
            VStack(alignment: .leading, spacing: Spacing.md) {
                KitchenDetailInfoRow(
                    label: "item_detail_name_label".localized,
                    value: item.itemName
                )

                KitchenDetailInfoRow(
                    label: "item_detail_quantity_label".localized,
                    value: "\(item.quantity)",
                    valueColor: .appPrimary,
                    emphasize: true
                )

                if let size = item.size {
                    KitchenDetailInfoRow(
                        label: "pos_size_section_title".localized,
                        value: size
                    )
                }

                if !item.toppings.isEmpty {
                    KitchenDetailInfoRow(
                        label: "pos_toppings_section_title".localized,
                        value: item.toppings.joined(separator: ", "),
                        valueColor: .appInfo
                    )
                }

                if !item.tableNames.isEmpty {
                    KitchenDetailInfoRow(
                        label: "item_detail_tables_label".localized,
                        value: item.tableSummary
                    )
                }
                
                if !item.displayNotes.isEmpty {
                    KitchenDetailInfoRow(
                        label: "item_detail_notes_label".localized,
                        value: item.displayNotes,
                        valueColor: .appWarning,
                        emphasize: true
                    )
                }
            }
        }
        .padding(.vertical, Spacing.sm)
    }
    
    private var statusManagementSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("item_detail_status_management_title".localized)
                .font(.monoCaption)
                .fontWeight(.semibold)
                .foregroundColor(.appTextSecondary)
            
            VStack(spacing: Spacing.sm) {
                // Current status display
                KitchenDetailInfoRow(
                    label: "order_item_detail_current_status".localized,
                    value: item.status.displayName,
                    valueColor: statusColor,
                    emphasize: true
                )
                
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
                        
                        Text(isAdvancingStatus ? "item_detail_updating_status".localized : "order_item_detail_mark_as".localized(with: nextStatusText))
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
        .padding(.vertical, Spacing.sm)
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
                    Text("item_detail_print_kitchen_slip".localized)
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(Color.gray)
                .foregroundColor(.white)
                .cornerRadius(8)
            }
        }
        .padding(.vertical, Spacing.sm)
    }
    
    // MARK: - Computed Properties
    
    private func updateTimeAgoText() {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        timeAgoText = formatter.localizedString(for: item.orderTime, relativeTo: Date())
    }
    
    private var statusColor: Color {
        switch item.status {
        case .draft: return .appTextSecondary
        case .new: return .appInfo
        case .preparing: return .appWarning
        case .ready: return .appSuccess
        case .served: return .appTextSecondary
        case .canceled: return .appError
        }
    }

    private var timeColor: Color {
        let minutes = Int(Date().timeIntervalSince(item.orderTime) / 60)

        if minutes < 10 {
            return .appSuccess
        }

        if minutes < 20 {
            return .appWarning
        }

        return .appError
    }
    
    private var statusIcon: String {
        switch item.status {
        case .draft: return "doc.plaintext"
        case .new: return "flame"
        case .preparing: return "checkmark.circle"
        case .ready: return "checkmark.circle.fill"
        case .served: return "checkmark.seal.fill"
        case .canceled: return "xmark.seal.fill"
        }
    }
    
    private var nextStatusText: String {
        switch item.status {
        case .draft: return OrderItemStatus.new.displayName
        case .new: return OrderItemStatus.preparing.displayName
        case .preparing: return OrderItemStatus.ready.displayName
        case .ready: return OrderItemStatus.served.displayName
        case .served: return OrderStatus.completed.displayName
        case .canceled: return OrderItemStatus.canceled.displayName
        }
    }
    
    // MARK: - Helper Functions
    
    @MainActor
    private func printItemSummary() async {
        do {
            try await printerManager.printKitchenItemSummary(item)
            onPrintResult("item_detail_print_success".localized)
        } catch {
            onPrintResult("item_detail_print_failure".localized(with: error.localizedDescription))
        }
    }
    
    @MainActor
    private func printKitchenSlip() async {
        do {
            try await printerManager.printKitchenSlip(item)
            onPrintResult("item_detail_print_success".localized)
        } catch {
            onPrintResult("item_detail_print_failure".localized(with: error.localizedDescription))
        }
    }
}

// MARK: - Supporting Views

private struct KitchenDetailInfoRow: View {
    let label: String
    let value: String
    var valueColor: Color = .appTextPrimary
    var emphasize = false

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: Spacing.sm) {
            Text(label.uppercased())
                .font(.monoCaption)
                .foregroundColor(.appTextSecondary)
                .frame(width: 82, alignment: .leading)

            Text(value)
                .font(emphasize ? .bodyMedium.weight(.semibold) : .bodyMedium)
                .foregroundColor(valueColor)
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 2)
    }
}

private struct KitchenDetailChip: View {
    let icon: String
    let text: String
    let tint: Color

    var body: some View {
        Label(text, systemImage: icon)
            .font(.captionBold)
            .foregroundColor(tint)
            .lineLimit(1)
            .padding(.trailing, Spacing.xs)
    }
}

private struct KitchenDetailChipWrap<Content: View>: View {
    let spacing: CGFloat
    let content: Content

    init(spacing: CGFloat, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }

    var body: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: spacing) {
                content
            }

            VStack(alignment: .leading, spacing: spacing) {
                content
            }
        }
    }
}

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
        case .draft: return .gray
        case .new: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
        case .canceled: return .red
        }
    }
}

struct StatusProgressView: View {
    let currentStatus: OrderItemStatus
    
    private let allStatuses: [OrderItemStatus] = [.new, .preparing, .ready, .served]
    
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
        .padding(.vertical, Spacing.xs)
    }
    
    private func statusColor(for status: OrderItemStatus) -> Color {
        switch status {
        case .draft: return .gray
        case .new: return .blue
        case .preparing: return .orange
        case .ready: return .green
        case .served: return .gray
        case .canceled: return .red
        }
    }
}

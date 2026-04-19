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
    @State private var tempNotes = ""
    @State private var showingCancelConfirmation = false

    var body: some View {
        ZStack {
            AppScreenBackground()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    headerSection
                    summarySection
                    notesSection
                    statusSection
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.lg)
                .padding(.bottom, canCancelItem ? 116 : Spacing.xl)
            }
        }
        .safeAreaInset(edge: .bottom) {
            if canCancelItem {
                actionBar
                    .padding(.horizontal, Spacing.md)
                    .padding(.top, Spacing.sm)
                    .background(
                        LinearGradient(
                            colors: [Color.appBackground.opacity(0), Color.appBackground.opacity(0.92), Color.appBackground],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            }
        }
        .onAppear {
            tempNotes = item.notes ?? ""
        }
        .alert("order_item_detail_cancel_title".localized, isPresented: $showingCancelConfirmation) {
            Button("cancel".localized, role: .cancel) {}
            Button("order_item_detail_cancel_item".localized, role: .destructive) {
                Task {
                    await cancelItem()
                }
            }
        } message: {
            Text("order_item_detail_cancel_message".localized(with: primaryItemName))
        }
    }
}

private extension OrderItemDetailView {
    var primaryItemName: String {
        item.menu_item?.displayName ?? "orders_unknown_item".localized
    }

    var japaneseSecondaryName: String? {
        guard LocalizationManager.shared.currentLanguage != "ja" else {
            return nil
        }

        let japaneseName = item.menu_item?.name_ja?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard !japaneseName.isEmpty, japaneseName != primaryItemName else {
            return nil
        }

        return japaneseName
    }

    var itemReference: String {
        let code = item.menu_item?.code?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return code.isEmpty ? String(item.id.suffix(6)).uppercased() : code.uppercased()
    }

    var canCancelItem: Bool {
        item.status != .served && item.status != .canceled
    }

    var canEditNotes: Bool {
        item.status == .draft || item.status == .new
    }

    var sizeName: String? {
        let value = item.menu_item_size?.displayName.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return value.isEmpty ? nil : value
    }

    var toppingNames: [String] {
        (item.toppings ?? [])
            .map(\.displayName)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    var allProgressStatuses: [OrderItemStatus] {
        [.new, .preparing, .ready, .served]
    }

    var availableStatusUpdates: [OrderItemStatus] {
        switch item.status {
        case .draft:
            return [.new, .preparing, .ready, .served]
        case .new:
            return [.preparing, .ready, .served]
        case .preparing:
            return [.ready, .served]
        case .ready:
            return [.served]
        case .served, .canceled:
            return []
        }
    }

    var headerSection: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                AppSectionEyebrow(itemReference)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(primaryItemName)
                        .font(.cardTitle)
                        .foregroundColor(.appHighlight)
                        .multilineTextAlignment(.leading)

                    if let japaneseSecondaryName {
                        Text(japaneseSecondaryName)
                            .font(.bodyLarge)
                            .foregroundColor(.appTextSecondary)
                    }
                }
            }

            Spacer(minLength: Spacing.md)

            VStack(alignment: .trailing, spacing: Spacing.sm) {
                OrderItemStatusBadge(status: item.status)

                Button(action: onComplete) {
                    Image(systemName: "xmark")
                        .font(.buttonMedium)
                        .foregroundColor(.appTextPrimary)
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, 14)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.md)
                                .fill(Color.appSurface.opacity(0.96))
                                .overlay(
                                    RoundedRectangle(cornerRadius: CornerRadius.md)
                                        .stroke(Color.appBorderLight, lineWidth: 1)
                                )
                        )
                }
                .buttonStyle(.plain)
                .accessibilityLabel("common_close".localized)
            }
        }
    }

    var summarySection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("order_item_detail_summary_title".localized.uppercased())
                .font(.monoLabel)
                .kerning(1.6)
                .foregroundColor(.appTextSecondary)

            HStack(alignment: .top, spacing: Spacing.md) {
                QuantityHeroCard(quantity: item.quantity)

                VStack(alignment: .leading, spacing: Spacing.md) {
                    if let sizeName {
                        SummaryDetailRow(
                            label: "pos_size_section_title".localized,
                            value: sizeName
                        )
                    }

                    if !toppingNames.isEmpty {
                        SummaryDetailRow(
                            label: "pos_toppings_section_title".localized,
                            value: toppingNames.joined(separator: ", ")
                        )
                    }

                    SummaryDetailRow(
                        label: "order_item_detail_price_label".localized,
                        value: AppCurrencyFormatter.format(Double(item.quantity) * item.price_at_order),
                        valueColor: .appTextPrimary,
                        emphasize: true
                    )
                }
            }
            .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
        }
    }

    var notesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("order_item_detail_notes_title".localized.uppercased())
                    .font(.monoLabel)
                    .kerning(1.6)
                    .foregroundColor(.appTextSecondary)

                Spacer()

                if canEditNotes && !editingNotes {
                    Button("edit".localized) {
                        editingNotes = true
                    }
                    .font(.buttonSmall)
                    .foregroundColor(.appHighlight)
                }
            }

            VStack(alignment: .leading, spacing: Spacing.md) {
                if editingNotes {
                    TextField("order_item_detail_notes_placeholder".localized, text: $tempNotes, axis: .vertical)
                        .textFieldStyle(.plain)
                        .foregroundColor(.appTextPrimary)
                        .padding(Spacing.md)
                        .background(Color.appSurfaceSecondary)
                        .cornerRadius(CornerRadius.md)
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.md)
                                .stroke(Color.appBorderLight, lineWidth: 1)
                        )

                    HStack(spacing: Spacing.md) {
                        InlineActionButton(
                            title: "cancel".localized,
                            tint: .appTextSecondary,
                            fill: Color.appSurfaceSecondary,
                            foreground: .appTextPrimary,
                            action: {
                                tempNotes = item.notes ?? ""
                                editingNotes = false
                            }
                        )

                        InlineActionButton(
                            title: isUpdatingNotes ? "order_detail_updating".localized : "save".localized,
                            tint: .appPrimary,
                            fill: Color.appPrimary,
                            foreground: .appOnHighlight,
                            action: {
                                Task {
                                    await saveNotes()
                                }
                            },
                            isDisabled: isUpdatingNotes
                        )
                    }
                } else {
                    Text(
                        item.notes?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == false
                            ? (item.notes ?? "")
                            : "order_item_detail_no_notes".localized
                    )
                    .font(.bodyMedium)
                    .foregroundColor(item.notes?.isEmpty == false ? .appTextPrimary : .appTextSecondary)
                    .padding(Spacing.md)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.appSurface.opacity(0.92))
                    .cornerRadius(CornerRadius.md)
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(Color.appBorderLight, lineWidth: 1)
                    )
                }
            }
        }
    }

    var statusSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("order_item_detail_status_title".localized.uppercased())
                .font(.monoLabel)
                .kerning(1.6)
                .foregroundColor(.appTextSecondary)

            VStack(alignment: .leading, spacing: Spacing.md) {
                if !availableStatusUpdates.isEmpty {
                    Text("order_item_detail_status_direct_hint".localized)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                }

                OrderItemStatusProgressView(
                    currentStatus: item.status,
                    progressStatuses: allProgressStatuses,
                    selectableStatuses: Set(availableStatusUpdates),
                    isUpdating: isUpdatingStatus || isCancelling,
                    onSelect: { status in
                        Task {
                            await updateStatus(to: status)
                        }
                    }
                )
            }
            .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
        }
    }

    var actionBar: some View {
        InlineActionButton(
            title: isCancelling ? "order_item_detail_cancelling".localized : "order_item_detail_cancel_item".localized,
            tint: .appError,
            fill: Color.appError.opacity(0.12),
            foreground: .appError,
            action: {
                showingCancelConfirmation = true
            },
            isDisabled: isCancelling || isUpdatingStatus
        )
    }

    @MainActor
    func saveNotes() async {
        isUpdatingNotes = true
        let notesToSave = tempNotes.trimmingCharacters(in: .whitespacesAndNewlines)
        let finalNotes = notesToSave.isEmpty ? nil : notesToSave

        defer {
            isUpdatingNotes = false
        }

        do {
            try await orderManager.updateOrderItemNotes(orderItemId: item.id, notes: finalNotes)
            editingNotes = false
            onPrintResult("order_item_detail_notes_saved".localized)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch {
            onPrintResult("error_update_item_notes".localized)
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }

    @MainActor
    func updateStatus(to newStatus: OrderItemStatus) async {
        guard newStatus != item.status else {
            return
        }

        isUpdatingStatus = true

        defer {
            isUpdatingStatus = false
        }

        do {
            try await orderManager.updateOrderItemStatus(orderItemId: item.id, newStatus: newStatus)
            onPrintResult("order_item_detail_status_updated".localized(with: newStatus.displayName))
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            onComplete()
        } catch {
            onPrintResult("error_update_item_status".localized)
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }

    @MainActor
    func cancelItem() async {
        isCancelling = true

        defer {
            isCancelling = false
        }

        do {
            try await orderManager.cancelOrderItem(orderItemId: item.id)
            onPrintResult("order_item_detail_cancel_success".localized)
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            onComplete()
        } catch {
            onPrintResult("error_cancel_item".localized)
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }
}

private struct QuantityHeroCard: View {
    let quantity: Int

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("order_item_detail_quantity_label".localized.uppercased())
                .font(.monoLabel)
                .foregroundColor(.appTextSecondary)

            HStack(alignment: .firstTextBaseline, spacing: Spacing.xs) {
                Text("\(quantity)")
                    .font(.system(size: 44, weight: .semibold, design: .rounded))
                    .foregroundColor(.appPrimary)

                Text("×")
                    .font(.system(size: 24, weight: .medium, design: .rounded))
                    .foregroundColor(.appPrimary.opacity(0.8))
            }
        }
        .frame(maxWidth: 112, alignment: .leading)
        .padding(Spacing.md)
        .background(Color.appSurfaceSecondary)
        .cornerRadius(CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(Color.appBorderLight, lineWidth: 1)
        )
    }
}

private struct SummaryDetailRow: View {
    let label: String
    let value: String
    var valueColor: Color = .appTextPrimary
    var emphasize = false

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text(label.uppercased())
                .font(.monoLabel)
                .foregroundColor(.appTextSecondary)

            Text(value)
                .font(emphasize ? .bodyLarge.weight(.semibold) : .bodyLarge)
                .foregroundColor(valueColor)
                .multilineTextAlignment(.leading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct InlineActionButton: View {
    let title: String
    let tint: Color
    let fill: Color
    let foreground: Color
    let action: () -> Void
    var isDisabled = false

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.buttonMedium)
                .foregroundColor(foreground)
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(
                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                        .fill(fill)
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.lg)
                                .stroke(tint.opacity(0.24), lineWidth: 1)
                        )
                )
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .opacity(isDisabled ? 0.5 : 1)
    }
}

private struct OrderItemStatusProgressView: View {
    let currentStatus: OrderItemStatus
    let progressStatuses: [OrderItemStatus]
    let selectableStatuses: Set<OrderItemStatus>
    let isUpdating: Bool
    let onSelect: (OrderItemStatus) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            ForEach(progressStatuses, id: \.self) { status in
                Button {
                    onSelect(status)
                } label: {
                    HStack(spacing: Spacing.md) {
                        statusIndicator(for: status)

                        Text(status.displayName)
                            .font(.buttonMedium)
                            .foregroundColor(textColor(for: status))

                        Spacer()

                        if selectableStatuses.contains(status) {
                            Image(systemName: "arrow.up.right")
                                .font(.captionRegular.weight(.semibold))
                                .foregroundColor(.appHighlight)
                        } else if status < currentStatus && currentStatus != .canceled {
                            Image(systemName: "checkmark")
                                .font(.captionRegular.weight(.semibold))
                                .foregroundColor(.appSuccess)
                        }
                    }
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.md)
                    .background(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .fill(backgroundFill(for: status))
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(borderColor(for: status), lineWidth: status == currentStatus ? 1.5 : 1)
                    )
                }
                .buttonStyle(.plain)
                .disabled(!selectableStatuses.contains(status) || isUpdating)
                .opacity(isUpdating && selectableStatuses.contains(status) ? 0.55 : 1)
            }
        }
    }

    @ViewBuilder
    private func statusIndicator(for status: OrderItemStatus) -> some View {
        ZStack {
            Circle()
                .fill(indicatorFill(for: status))
                .frame(width: 18, height: 18)

            if status < currentStatus && currentStatus != .canceled {
                Image(systemName: "checkmark")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundColor(.appOnHighlight)
            } else if status == currentStatus {
                Circle()
                    .fill(Color.appOnHighlight)
                    .frame(width: 7, height: 7)
            }
        }
    }

    private func backgroundFill(for status: OrderItemStatus) -> Color {
        if currentStatus == .canceled {
            return Color.appSurfaceSecondary.opacity(0.72)
        }

        if status == currentStatus {
            return status.statusColor.opacity(0.24)
        }

        if selectableStatuses.contains(status) {
            return Color.appSurfaceElevated
        }

        if status < currentStatus {
            return Color.appSurfaceSecondary.opacity(0.9)
        }

        return Color.appSurfaceSecondary.opacity(0.72)
    }

    private func borderColor(for status: OrderItemStatus) -> Color {
        if status == currentStatus {
            return status.statusColor.opacity(0.75)
        }

        if selectableStatuses.contains(status) {
            return Color.appHighlight.opacity(0.35)
        }

        return Color.appBorderLight
    }

    private func indicatorFill(for status: OrderItemStatus) -> Color {
        if status == currentStatus {
            return status.statusColor
        }

        if status < currentStatus && currentStatus != .canceled {
            return status.statusColor
        }

        if selectableStatuses.contains(status) {
            return Color.appHighlight.opacity(0.9)
        }

        return Color.appSurface
    }

    private func textColor(for status: OrderItemStatus) -> Color {
        if status == currentStatus {
            return .appTextPrimary
        }

        if selectableStatuses.contains(status) {
            return .appHighlight
        }

        if status < currentStatus && currentStatus != .canceled {
            return .appTextPrimary
        }

        return .appTextSecondary
    }
}

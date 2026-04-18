import SwiftUI

struct OrderStatusUpdateView: View {
    let order: Order

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var orderManager: OrderManager

    @State private var itemStatusUpdates: [String: OrderItemStatus] = [:]
    @State private var hasChanges = false
    @State private var isUpdating = false
    @State private var errorMessage: String?
    @State private var showingErrorAlert = false

    var body: some View {
        ZStack {
            AppScreenBackground()

            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: Spacing.xl) {
                    statusHeader

                    if let orderItems = order.order_items, !orderItems.isEmpty {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            Text("order_status_update_item_status_section_header".localized.uppercased())
                                .font(.monoLabel)
                                .kerning(1.6)
                                .foregroundColor(.appTextSecondary)

                            VStack(spacing: Spacing.md) {
                                ForEach(orderItems) { item in
                                    statusRow(for: item)
                                }
                            }
                        }
                    }

                    saveSection
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.lg)
                .padding(.bottom, Spacing.xxl)
            }
        }
        .navigationTitle("order_status_update_title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .alert("error".localized, isPresented: $showingErrorAlert) {
            Button("ok".localized) {}
        } message: {
            Text(errorMessage ?? "order_status_update_default_error".localized)
        }
        .onAppear {
            initializeItemStatuses()
        }
    }
}

private extension OrderStatusUpdateView {
    var statusHeader: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            AppSectionEyebrow(String(order.id.suffix(6)).uppercased())

            HStack(alignment: .top, spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    Text(order.table?.name ?? String(format: "order_detail_table_fallback".localized, order.table_id))
                        .font(.cardTitle)
                        .foregroundColor(.appHighlight)
                }

                Spacer()

                EnhancedStatusBadge(status: order.status)
            }
        }
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.xl)
                .fill(Color.appSurface.opacity(0.92))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.xl)
                        .stroke(Color.appBorderLight, lineWidth: 1)
                )
        )
    }

    func statusRow(for item: OrderItem) -> some View {
        let selectedStatus = itemStatusUpdates[item.id] ?? item.status

        return VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                Text("\(item.quantity)x")
                    .font(.sectionHeader)
                    .foregroundColor(.appPrimary)
                    .frame(minWidth: 28, alignment: .leading)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(item.menu_item?.displayName ?? "orders_unknown_item".localized)
                        .font(.bodyLarge.weight(.medium))
                        .foregroundColor(.appTextPrimary)

                    if let code = item.menu_item?.code, !code.isEmpty {
                        Text(code)
                            .font(.monoCaption)
                            .foregroundColor(.appTextSecondary)
                    }
                }

                Spacer()

                OrderItemStatusBadge(status: selectedStatus)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.sm) {
                    ForEach(availableStatuses(for: item), id: \.self) { status in
                        StatusChoiceChip(
                            title: status.displayName,
                            isSelected: selectedStatus == status,
                            tint: status.statusColor
                        ) {
                            itemStatusUpdates[item.id] = status
                            hasChanges = true
                        }
                    }
                }
            }
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.lg)
                .fill(Color.appSurface.opacity(0.92))
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                        .stroke(Color.appBorderLight, lineWidth: 1)
                )
        )
    }

    var saveSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            if hasChanges {
                Text("order_status_update_unsaved_changes_warning".localized)
                    .font(.captionRegular)
                    .foregroundColor(.appWarning)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.sm)
                    .background(Color.appWarningLight)
                    .cornerRadius(CornerRadius.md)
            }

            Button {
                Task {
                    await updateStatuses()
                }
            } label: {
                HStack(spacing: Spacing.sm) {
                    if isUpdating {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(.appOnHighlight)
                    } else {
                        Image(systemName: "checkmark.circle.fill")
                    }

                    Text(isUpdating ? "order_status_update_updating".localized : "order_status_update_button".localized)
                        .font(.bodyLarge.weight(.semibold))
                }
                .foregroundColor(.appOnHighlight)
                .frame(maxWidth: .infinity)
                .frame(height: 58)
                .background(
                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                        .fill(hasChanges && !isUpdating ? Color.appPrimary : Color.appDisabled)
                )
            }
            .buttonStyle(.plain)
            .disabled(!hasChanges || isUpdating)

            if !hasChanges {
                Text("order_status_update_disabled_hint".localized)
                    .font(.captionRegular)
                    .foregroundColor(.appTextTertiary)
            }
        }
    }

    func availableStatuses(for item: OrderItem) -> [OrderItemStatus] {
        let activeProgression: [OrderItemStatus] = [.new, .preparing, .ready, .served]

        switch item.status {
        case .draft:
            return activeProgression + [.canceled]
        case .new:
            return Array(activeProgression.drop(while: { $0 != .new })) + [.canceled]
        case .preparing:
            return Array(activeProgression.drop(while: { $0 != .preparing })) + [.canceled]
        case .ready:
            return Array(activeProgression.drop(while: { $0 != .ready })) + [.canceled]
        case .served:
            return [.served]
        case .canceled:
            return [.canceled]
        }
    }

    func initializeItemStatuses() {
        guard let orderItems = order.order_items else { return }

        for item in orderItems {
            itemStatusUpdates[item.id] = item.status
        }
    }

    @MainActor
    func updateStatuses() async {
        isUpdating = true
        errorMessage = nil

        defer {
            isUpdating = false
        }

        do {
            if let orderItems = order.order_items {
                for item in orderItems {
                    if let newStatus = itemStatusUpdates[item.id], newStatus != item.status {
                        try await orderManager.updateOrderItemStatus(orderItemId: item.id, newStatus: newStatus)
                    }
                }
            }

            UINotificationFeedbackGenerator().notificationOccurred(.success)
            dismiss()
        } catch {
            errorMessage = "order_status_update_items_failed".localized
            showingErrorAlert = true
            UINotificationFeedbackGenerator().notificationOccurred(.error)
        }
    }
}

private struct StatusChoiceChip: View {
    let title: String
    let isSelected: Bool
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.buttonSmall)
                .foregroundColor(isSelected ? .appBackground : tint)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, 10)
                .background(
                    Capsule()
                        .fill(isSelected ? tint : tint.opacity(0.14))
                        .overlay(
                            Capsule()
                                .stroke(tint.opacity(0.24), lineWidth: 1)
                        )
                )
        }
        .buttonStyle(.plain)
    }
}

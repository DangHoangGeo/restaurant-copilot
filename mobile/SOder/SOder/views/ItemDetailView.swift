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
                    .onTapGesture { onComplete() }

                VStack(spacing: 0) {
                    headerBar(isCompact: isCompact)

                    ScrollView(showsIndicators: false) {
                        VStack(alignment: .leading, spacing: Spacing.md) {
                            if !item.tableNames.isEmpty {
                                tablesSection
                            }

                            quantityAndSizeSection

                            if !item.toppings.isEmpty {
                                toppingsSection
                            }

                            if !item.displayNotes.isEmpty {
                                notesSection
                            }

                            Divider()
                                .padding(.vertical, Spacing.xs)

                            statusSection
                            actionsSection
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
        .onReceive(timer) { _ in updateTimeAgoText() }
    }

    // MARK: - Header

    private func headerBar(isCompact: Bool) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(alignment: .top, spacing: Spacing.md) {
                Text(item.itemName)
                    .font(.compactPageTitle)
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

    // MARK: - Tables Section

    private var tablesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("item_detail_tables_label".localized.uppercased())
                .font(.monoCaption)
                .foregroundColor(.appTextSecondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.sm) {
                    ForEach(item.tableNames, id: \.self) { table in
                        Text(table)
                            .font(.sectionHeader)
                            .foregroundColor(.appTextPrimary)
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                            .background(Color.appPrimary.opacity(0.10))
                            .cornerRadius(CornerRadius.sm)
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.sm)
                                    .stroke(Color.appPrimary.opacity(0.22), lineWidth: 1)
                            )
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(Color.appBorderLight, lineWidth: 1)
        )
    }

    // MARK: - Quantity + Size

    private var quantityAndSizeSection: some View {
        HStack(alignment: .center, spacing: 0) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("item_detail_quantity_label".localized.uppercased())
                    .font(.monoCaption)
                    .foregroundColor(.appTextSecondary)

                Text("\(item.quantity)")
                    .font(.metricValue)
                    .foregroundColor(statusColor)
                    .monospacedDigit()
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let size = item.size {
                Rectangle()
                    .fill(Color.appBorderLight)
                    .frame(width: 1, height: 48)
                    .padding(.horizontal, Spacing.md)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("pos_size_section_title".localized.uppercased())
                        .font(.monoCaption)
                        .foregroundColor(.appTextSecondary)

                    Text(size)
                        .font(.sectionHeader)
                        .fontWeight(.semibold)
                        .foregroundColor(.appTextPrimary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(Color.appBorderLight, lineWidth: 1)
        )
    }

    // MARK: - Toppings

    private var toppingsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("pos_toppings_section_title".localized.uppercased())
                .font(.monoCaption)
                .foregroundColor(.appTextSecondary)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                ForEach(item.toppings, id: \.self) { topping in
                    HStack(spacing: Spacing.sm) {
                        Circle()
                            .fill(Color.appInfo)
                            .frame(width: 5, height: 5)

                        Text(topping)
                            .font(.sectionHeader)
                            .foregroundColor(.appTextPrimary)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(Color.appBorderLight, lineWidth: 1)
        )
    }

    // MARK: - Notes

    private var notesSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Text("item_detail_notes_label".localized.uppercased())
                .font(.monoCaption)
                .foregroundColor(.appWarning)

            Text(item.displayNotes)
                .font(.bodyMedium.weight(.semibold))
                .foregroundColor(.appWarning)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .background(Color.appWarning.opacity(0.08))
        .cornerRadius(CornerRadius.md)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .stroke(Color.appWarning.opacity(0.22), lineWidth: 1)
        )
    }

    // MARK: - Status Progress

    private var statusSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("item_detail_status_management_title".localized)
                .font(.monoCaption)
                .fontWeight(.semibold)
                .foregroundColor(.appTextSecondary)

            StatusProgressView(currentStatus: item.status)
        }
    }

    // MARK: - Action Buttons

    private var actionsSection: some View {
        VStack(spacing: Spacing.sm) {
            Button(action: {
                isAdvancingStatus = true
                onStatusAdvance()
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    isAdvancingStatus = false
                    onComplete()
                }
            }) {
                HStack(spacing: Spacing.sm) {
                    if isAdvancingStatus {
                        ProgressView()
                            .scaleEffect(0.85)
                            .tint(.white)
                    } else {
                        Image(systemName: statusIcon)
                            .font(.bodyMedium.weight(.semibold))
                    }

                    Text(isAdvancingStatus
                         ? "item_detail_updating_status".localized
                         : "order_item_detail_mark_as".localized(with: nextStatusText))
                        .font(.buttonLarge)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 56)
                .background(isAdvancingStatus ? Color.appDisabled : statusColor)
                .foregroundColor(.white)
                .cornerRadius(CornerRadius.lg)
                .shadow(
                    color: (isAdvancingStatus ? Color.clear : statusColor).opacity(0.22),
                    radius: 10,
                    y: 4
                )
            }
            .disabled(item.status == .served || isAdvancingStatus)
            .accessibilityLabel("order_item_detail_mark_as".localized(with: nextStatusText))

            Button(action: {
                Task { await printKitchenSlip() }
            }) {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "doc.text")
                    Text("item_detail_print_kitchen_slip".localized)
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .font(.buttonMedium)
                .foregroundColor(.appTextPrimary)
                .background(Color.appSurfaceSecondary)
                .cornerRadius(CornerRadius.md)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(Color.appBorderLight, lineWidth: 1)
                )
            }
            .accessibilityLabel("item_detail_print_kitchen_slip".localized)
        }
    }

    // MARK: - Computed Properties

    private func updateTimeAgoText() {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        timeAgoText = formatter.localizedString(for: item.orderTime, relativeTo: Date())
    }

    private var statusColor: Color {
        switch item.status {
        case .draft:    return .appTextSecondary
        case .new:      return .appInfo
        case .preparing: return .appWarning
        case .ready:    return .appSuccess
        case .served:   return .appTextSecondary
        case .canceled: return .appError
        }
    }

    private var timeColor: Color {
        let minutes = Int(Date().timeIntervalSince(item.orderTime) / 60)
        if minutes < 10 { return .appSuccess }
        if minutes < 20 { return .appWarning }
        return .appError
    }

    private var statusIcon: String {
        switch item.status {
        case .draft:     return "doc.plaintext"
        case .new:       return "flame"
        case .preparing: return "checkmark.circle"
        case .ready:     return "checkmark.circle.fill"
        case .served:    return "checkmark.seal.fill"
        case .canceled:  return "xmark.seal.fill"
        }
    }

    private var nextStatusText: String {
        switch item.status {
        case .draft:     return OrderItemStatus.new.displayName
        case .new:       return OrderItemStatus.preparing.displayName
        case .preparing: return OrderItemStatus.ready.displayName
        case .ready:     return OrderItemStatus.served.displayName
        case .served:    return OrderStatus.completed.displayName
        case .canceled:  return OrderItemStatus.canceled.displayName
        }
    }

    // MARK: - Actions

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
            HStack(spacing: spacing) { content }
            VStack(alignment: .leading, spacing: spacing) { content }
        }
    }
}

struct StatusProgressView: View {
    let currentStatus: OrderItemStatus

    private let allStatuses: [OrderItemStatus] = [.new, .preparing, .ready, .served]

    var body: some View {
        HStack(spacing: Spacing.xs) {
            ForEach(allStatuses, id: \.self) { status in
                VStack(spacing: Spacing.xs) {
                    Circle()
                        .fill(status <= currentStatus ? designColor(for: status) : Color.appTextSecondary.opacity(0.25))
                        .frame(width: 14, height: 14)
                        .overlay(
                            Circle()
                                .stroke(
                                    status <= currentStatus ? designColor(for: status).opacity(0.3) : Color.clear,
                                    lineWidth: 3
                                )
                                .scaleEffect(1.5)
                        )

                    Text(status.displayName)
                        .font(.footnote)
                        .foregroundColor(status <= currentStatus ? designColor(for: status) : .appTextSecondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
                .frame(maxWidth: .infinity)

                if status != allStatuses.last {
                    Rectangle()
                        .fill(status < currentStatus ? designColor(for: status) : Color.appTextSecondary.opacity(0.2))
                        .frame(height: 2)
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.vertical, Spacing.xs)
    }

    private func designColor(for status: OrderItemStatus) -> Color {
        switch status {
        case .draft:     return .appTextSecondary
        case .new:       return .appInfo
        case .preparing: return .appWarning
        case .ready:     return .appSuccess
        case .served:    return .appTextSecondary
        case .canceled:  return .appError
        }
    }
}

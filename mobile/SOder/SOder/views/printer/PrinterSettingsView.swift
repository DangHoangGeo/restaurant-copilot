import SwiftUI

struct PrinterSettingsView: View {
    @EnvironmentObject private var printerManager: PrinterManager
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared
    @State private var showingAllLogs = false

    var body: some View {
        Group {
            if #available(iOS 16.0, *) {
                NavigationStack {
                    mainContent
                }
            } else {
                NavigationView {
                    mainContent
                }
                .navigationViewStyle(StackNavigationViewStyle())
            }
        }
        .sheet(isPresented: $showingAllLogs) {
            AllPrintLogsView(printerManager: printerManager)
        }
        .onAppear {
            settingsManager.syncFromCurrentRestaurant()
            printerManager.checkAvailablePrinters()
        }
    }

    private var mainContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                readinessCard
                setupLinksSection

                if settingsManager.primaryReceiptPrinter != nil {
                    quickActionsSection
                }

                supportSection

                if let errorMessage = printerManager.errorMessage, !errorMessage.isEmpty {
                    errorCard(errorMessage)
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
        .background(Color.appBackground.ignoresSafeArea())
        .navigationTitle("printer_settings_title".localized)
        .navigationBarTitleDisplayMode(.large)
    }

    private var readinessCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("printer_owner_setup_title".localized)
                        .font(.sectionHeader)
                        .foregroundColor(.appTextPrimary)

                    Text(settingsManager.setupSummaryText)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                }

                Spacer()

                connectionBadge
            }

            Divider()

            VStack(alignment: .leading, spacing: Spacing.sm) {
                detailRow(
                    title: "printer_receipt_printer_title".localized,
                    value: settingsManager.primaryReceiptPrinter?.name ?? "printer_current_config_not_set".localized
                )

                detailRow(
                    title: "printer_receipt_style_title".localized,
                    value: "printer_receipt_style_standard".localized
                )

                if settingsManager.usesSeparateKitchenPrinter {
                    detailRow(
                        title: "printer_current_config_kitchen".localized,
                        value: settingsManager.kitchenPrinter?.name ?? "printer_current_config_not_set".localized
                    )
                } else {
                    detailRow(
                        title: "printer_kitchen_behavior_title".localized,
                        value: "printer_kitchen_behavior_same".localized
                    )
                }
            }
        }
        .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.xl, surfaceColor: Color.appSurface.opacity(0.95))
    }

    private var connectionBadge: some View {
        HStack(spacing: Spacing.xs) {
            Image(systemName: printerManager.isConnected ? "checkmark.circle.fill" : "printer")
                .foregroundColor(printerManager.isConnected ? .appSuccess : .appWarning)

            Text(printerManager.isConnected ? "printer_setup_complete".localized : "printer_setup_needs_setup".localized)
                .font(.monoLabel)
                .foregroundColor(printerManager.isConnected ? .appSuccess : .appWarning)
        }
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xs)
        .background(
            Capsule()
                .fill((printerManager.isConnected ? Color.appSuccess : Color.appWarning).opacity(0.12))
        )
    }

    private var setupLinksSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("printer_owner_flow_title".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            NavigationLink(destination: UnifiedPrinterSetupView().environmentObject(printerManager)) {
                settingsLinkCard(
                    icon: "printer.fill",
                    title: "printer_quick_setup_button".localized,
                    subtitle: "printer_owner_setup_subtitle".localized
                )
            }
            .buttonStyle(.plain)

            NavigationLink(destination: ReceiptCustomizationView()) {
                settingsLinkCard(
                    icon: "doc.text.fill",
                    title: "receipt_customization".localized,
                    subtitle: "printer_standard_receipt_subtitle".localized
                )
            }
            .buttonStyle(.plain)
        }
    }

    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("printer_quick_actions_title".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            Button {
                Task {
                    await testPrint()
                }
            } label: {
                HStack {
                    Image(systemName: "doc.text")
                    Text("printer_print_test_receipt_button".localized)
                }
            }
            .buttonStyle(PrimaryButtonStyle(isEnabled: printerManager.isConnected))
            .disabled(!printerManager.isConnected)

            if settingsManager.usesSeparateKitchenPrinter {
                Button {
                    Task {
                        await printKitchenTest()
                    }
                } label: {
                    HStack {
                        Image(systemName: "list.clipboard")
                        Text("printer_print_kitchen_test_button".localized)
                    }
                }
                .buttonStyle(SecondaryButtonStyle(isEnabled: printerManager.isConnected))
                .disabled(!printerManager.isConnected)
            }
        }
    }

    private var supportSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("printer_support_tools_title".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            NavigationLink(destination: PrintQueueView()) {
                settingsLinkCard(
                    icon: "tray.full.fill",
                    title: "accessibility_print_queue_label".localized,
                    subtitle: "printer_owner_queue_subtitle".localized,
                    trailingText: pendingJobsText
                )
            }
            .buttonStyle(.plain)

            Button {
                showingAllLogs = true
            } label: {
                settingsLinkCard(
                    icon: "text.justify.left",
                    title: "printer_view_all_logs_button".localized,
                    subtitle: "printer_logs_short_subtitle".localized
                )
            }
            .buttonStyle(.plain)
        }
    }

    private var pendingJobsText: String? {
        let count = PrintQueueManager.shared.pendingJobsCount
        guard count > 0 else { return nil }
        return "\(count)"
    }

    private func detailRow(title: String, value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Spacing.md) {
            Text(title)
                .font(.monoLabel)
                .foregroundColor(.appTextSecondary)

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .foregroundColor(.appTextPrimary)
                .multilineTextAlignment(.trailing)
        }
    }

    private func settingsLinkCard(
        icon: String,
        title: String,
        subtitle: String,
        trailingText: String? = nil
    ) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.appPrimary)
                .frame(width: 28)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(.bodyMedium.weight(.semibold))
                    .foregroundColor(.appTextPrimary)

                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.appTextSecondary)
            }

            Spacer()

            if let trailingText {
                Text(trailingText)
                    .font(.monoLabel)
                    .foregroundColor(.appHighlight)
                    .padding(.horizontal, Spacing.sm)
                    .padding(.vertical, Spacing.xs)
                    .background(
                        Capsule()
                            .fill(Color.appHighlightSoft.opacity(0.18))
                    )
            } else {
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundColor(.appTextSecondary)
            }
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
    }

    private func errorCard(_ message: String) -> some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.appError)

            Text(message)
                .font(.caption)
                .foregroundColor(.appError)
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appError.opacity(0.08))
    }

    private func testPrint() async {
        _ = await printerManager.printTestReceipt()
    }

    private func printKitchenTest() async {
        _ = await printerManager.printKitchenTestReceipt()
    }
}

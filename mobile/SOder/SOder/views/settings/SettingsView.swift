import SwiftUI

struct SettingsView: View {
    @EnvironmentObject private var printerManager: PrinterManager
    @EnvironmentObject private var orderManager: OrderManager
    @EnvironmentObject private var supabaseManager: SupabaseManager
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared

    @State private var autoPrintEnabled = false
    @State private var showingAllLogs = false
    @State private var showingSignOutConfirm = false

    var body: some View {
        NavigationStack {
            mainContent
        }
        .sheet(isPresented: $showingAllLogs) {
            AllPrintLogsView(printerManager: printerManager)
        }
        .onAppear {
            autoPrintEnabled = orderManager.autoPrintingEnabled
            printerManager.checkAvailablePrinters()
        }
    }

    private var mainContent: some View {
        ZStack {
            AppScreenBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    headerSection
                        .padding(.horizontal, -Spacing.md)
                    autoPrintSection
                    printingSection

                    if let errorMessage = printerManager.errorMessage, !errorMessage.isEmpty {
                        errorCard(errorMessage)
                    }

                    accountSection
                    versionFooter
                }
                .padding(.horizontal, Spacing.md)
                .padding(.bottom, Spacing.xl)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .alert("settings_sign_out_confirm_title".localized, isPresented: $showingSignOutConfirm) {
            Button("cancel".localized, role: .cancel) { }
            Button("settings_sign_out_button".localized, role: .destructive) {
                Task { await performSignOut() }
            }
        } message: {
            Text("settings_sign_out_confirm_message".localized)
        }
    }

    private var headerSection: some View {
        AppOperationsHeader(
            eyebrow: "system setup",
            title: "tab_settings".localized,
            compactTitle: "tab_settings".localized,
            subtitle: nil,
            isCompact: isCompactLayout
        ) {
            HStack(spacing: Spacing.xs) {
                if autoPrintEnabled {
                    if isCompactLayout {
                        Text("AUTO")
                            .font(.monoCaption)
                            .foregroundColor(.appTextSecondary)
                    } else {
                        AppHeaderPill("AUTO")
                    }
                }

                Image(systemName: printerManager.isConnected ? "checkmark.circle.fill" : "printer")
                    .font(.title3)
                    .foregroundColor(printerManager.isConnected ? .appSuccess : .appWarning)
                    .frame(width: 36, height: 36)
            }
        }
    }

    private var isCompactLayout: Bool {
        UIDevice.current.userInterfaceIdiom == .phone || horizontalSizeClass == .compact
    }

    // MARK: - Auto-Print (Prominent)

    private var autoPrintSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("settings_auto_print_title".localized)
                        .font(.sectionHeader)
                        .foregroundColor(.appTextPrimary)

                    Text("settings_auto_print_subtitle".localized)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Toggle("", isOn: Binding(
                    get: { autoPrintEnabled },
                    set: { newValue in
                        autoPrintEnabled = newValue
                        orderManager.setAutoPrintingEnabled(newValue)
                    }
                ))
                .labelsHidden()
                .toggleStyle(SwitchToggleStyle(tint: .appPrimary))
                .accessibilityLabel("settings_auto_print_toggle_label".localized)
            }

            if autoPrintEnabled && !printerManager.isConnected {
                HStack(spacing: Spacing.sm) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.appWarning)
                    Text("settings_no_printer_hint".localized)
                        .font(.caption)
                        .foregroundColor(.appWarning)
                }
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs)
                .background(Color.appWarningLight)
                .cornerRadius(CornerRadius.sm)
            }
        }
        .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.xl, surfaceColor: Color.appSurface.opacity(0.95))
    }

    // MARK: - Printing Section

    private var printingSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("settings_printing_section".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            printerStatusCard

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

    private var printerStatusCard: some View {
        HStack(alignment: .top, spacing: Spacing.md) {
            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text("printer_owner_setup_title".localized)
                    .font(.bodyMedium.weight(.semibold))
                    .foregroundColor(.appTextPrimary)

                Text(settingsManager.setupSummaryText)
                    .font(.caption)
                    .foregroundColor(.appTextSecondary)
            }

            Spacer()
            connectionBadge
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
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

    // MARK: - Account Section

    private var accountSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("settings_account_section".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            Button {
                showingSignOutConfirm = true
            } label: {
                HStack(spacing: Spacing.md) {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .font(.title3)
                        .foregroundColor(.appError)
                        .frame(width: 28)

                    Text("settings_sign_out_button".localized)
                        .font(.bodyMedium.weight(.semibold))
                        .foregroundColor(.appError)

                    Spacer()
                }
                .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("settings_sign_out_button".localized)
        }
    }

    // MARK: - Version Footer

    private var versionFooter: some View {
        HStack {
            Spacer()
            if let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String,
               let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String {
                Text("\("settings_app_version_label".localized) \(version) (\(build))")
                    .font(.captionRegular)
                    .foregroundColor(.appTextTertiary)
            }
            Spacer()
        }
        .padding(.top, Spacing.sm)
    }

    // MARK: - Helpers

    private var pendingJobsText: String? {
        let count = PrintQueueManager.shared.pendingJobsCount
        guard count > 0 else { return nil }
        return "\(count)"
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

    @MainActor
    private func performSignOut() async {
        do {
            try await supabaseManager.signOut()
        } catch {
            // signOut failure is rare; isAuthenticated change drives navigation automatically.
        }
    }
}

#Preview {
    SettingsView()
        .environmentObject(PrinterManager.shared)
        .environmentObject(OrderManager.shared)
        .environmentObject(SupabaseManager.shared)
}

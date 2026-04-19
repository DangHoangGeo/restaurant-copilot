import SwiftUI

struct UnifiedPrinterSetupView: View {
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared
    @EnvironmentObject private var printerManager: PrinterManager
    @Environment(\.dismiss) private var dismiss

    @State private var useSeparateKitchenPrinter = false
    @State private var showingAddPrinter = false
    @State private var editingPrinter: ConfiguredPrinter?
    @State private var printerToDelete: ConfiguredPrinter?
    @State private var showingDeleteAlert = false
    @State private var testingPrinter: ConfiguredPrinter?
    @State private var testResult: TestResult?
    @State private var showingTestResult = false
    @State private var isTesting = false
    @State private var showingConnectionOptions = false
    @State private var showingBluetoothSetup = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                introCard
                printerListSection
                printerAssignmentSection
                previewSection
                testSection
                advancedSection
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
        .background(Color.appBackground.ignoresSafeArea())
        .navigationTitle("printer_setup_title".localized)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("cancel".localized) {
                    dismiss()
                }
            }

            ToolbarItem(placement: .navigationBarTrailing) {
                Button("done".localized) {
                    saveAndDismiss()
                }
                .fontWeight(.semibold)
            }
        }
        .sheet(isPresented: $showingAddPrinter) {
            AddEditPrinterView(printer: nil) { printer in
                settingsManager.addPrinter(printer)
                if settingsManager.primaryReceiptPrinter == nil {
                    settingsManager.assignPrimaryReceiptPrinter(printer)
                }
                if useSeparateKitchenPrinter, settingsManager.kitchenPrinter == nil {
                    settingsManager.setKitchenPrinter(settingsManager.configuredPrinters.first(where: { $0.id != printer.id }))
                }
            }
        }
        .sheet(item: $editingPrinter) { printer in
            AddEditPrinterView(printer: printer) { updatedPrinter in
                settingsManager.updatePrinter(updatedPrinter)
            }
        }
        .sheet(isPresented: $showingBluetoothSetup) {
            NavigationView {
                BluetoothPrinterSetupView()
            }
        }
        .alert("delete_printer_title".localized, isPresented: $showingDeleteAlert) {
            Button("cancel".localized, role: .cancel) { }
            Button("delete".localized, role: .destructive) {
                if let printerToDelete {
                    settingsManager.removePrinter(id: printerToDelete.id)
                    if settingsManager.configuredPrinters.count < 2 {
                        useSeparateKitchenPrinter = false
                        settingsManager.setSeparateKitchenPrinterEnabled(false)
                    }
                }
            }
        } message: {
            Text("delete_printer_message".localized)
        }
        .alert("printer_test_result_title".localized, isPresented: $showingTestResult) {
            Button("ok".localized, role: .cancel) { }
        } message: {
            if let testResult {
                Text(testResult.message)
            }
        }
        .confirmationDialog("printer_connection_options_title".localized, isPresented: $showingConnectionOptions) {
            Button("printer_open_bluetooth_setup".localized) {
                showingBluetoothSetup = true
            }

            Button("cancel".localized, role: .cancel) { }
        } message: {
            Text("printer_connection_options_message".localized)
        }
        .onAppear {
            settingsManager.syncFromCurrentRestaurant()
            useSeparateKitchenPrinter = settingsManager.usesSeparateKitchenPrinter
        }
        .onChange(of: useSeparateKitchenPrinter) { _, newValue in
            guard settingsManager.configuredPrinters.count > 1 || !newValue else {
                useSeparateKitchenPrinter = false
                return
            }

            settingsManager.setSeparateKitchenPrinterEnabled(newValue)
        }
    }

    private var introCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("printer_setup_simple_title".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            Text("printer_setup_simple_subtitle".localized)
                .font(.bodyMedium)
                .foregroundColor(.appTextSecondary)

            HStack(alignment: .top, spacing: Spacing.sm) {
                Image(systemName: "network")
                    .foregroundColor(.appPrimary)

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text("printer_network_priority_title".localized)
                        .font(.bodyMedium.weight(.semibold))
                        .foregroundColor(.appTextPrimary)

                    Text("printer_network_priority_subtitle".localized)
                        .font(.caption)
                        .foregroundColor(.appTextSecondary)
                }
            }
            .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurfaceSecondary.opacity(0.78))

            Toggle(isOn: $useSeparateKitchenPrinter) {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text("printer_use_separate_kitchen_title".localized)
                        .font(.bodyMedium.weight(.semibold))
                        .foregroundColor(.appTextPrimary)

                    Text(
                        settingsManager.configuredPrinters.count > 1
                            ? "printer_use_separate_kitchen_subtitle".localized
                            : "printer_use_separate_kitchen_disabled".localized
                    )
                    .font(.caption)
                    .foregroundColor(.appTextSecondary)
                }
            }
            .toggleStyle(SwitchToggleStyle(tint: .appPrimary))
            .disabled(settingsManager.configuredPrinters.count < 2)
        }
        .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.xl, surfaceColor: Color.appSurface.opacity(0.94))
    }

    private var printerListSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            sectionHeader(
                title: "printer_saved_printers_title".localized,
                subtitle: "printer_saved_printers_subtitle".localized
            )

            if settingsManager.configuredPrinters.isEmpty {
                Button {
                    showingAddPrinter = true
                } label: {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        HStack(spacing: Spacing.sm) {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(.appPrimary)
                            Text("add_printer".localized)
                                .font(.bodyMedium.weight(.semibold))
                                .foregroundColor(.appTextPrimary)
                        }

                        Text("printer_add_first_hint".localized)
                            .font(.caption)
                            .foregroundColor(.appTextSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
                }
                .buttonStyle(.plain)
            } else {
                ForEach(settingsManager.configuredPrinters, id: \.id) { printer in
                    PrinterSetupCard(
                        printer: printer,
                        role: printerRoleDescription(for: printer),
                        connectionStatus: settingsManager.getConnectionStatus(for: printer.id),
                        onEdit: { editingPrinter = printer },
                        onTest: {
                            testingPrinter = printer
                            Task { await runPrinterTest(printer) }
                        },
                        onDelete: {
                            printerToDelete = printer
                            showingDeleteAlert = true
                        }
                    )
                }

                Button {
                    showingAddPrinter = true
                } label: {
                    HStack {
                        Image(systemName: "plus")
                        Text("add_printer".localized)
                    }
                }
                .buttonStyle(SecondaryButtonStyle())
            }
        }
    }

    private var printerAssignmentSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            sectionHeader(
                title: "assignments_title".localized,
                subtitle: "printer_assignment_subtitle_simple".localized
            )

            if settingsManager.configuredPrinters.isEmpty {
                assignmentPlaceholder
            } else {
                assignmentPickerCard(
                    title: "printer_receipt_printer_title".localized,
                    subtitle: "printer_receipt_printer_subtitle".localized,
                    selectedPrinter: settingsManager.primaryReceiptPrinter,
                    candidates: settingsManager.configuredPrinters,
                    onSelect: { printer in
                        settingsManager.assignPrimaryReceiptPrinter(printer)
                    }
                )

                if useSeparateKitchenPrinter {
                    assignmentPickerCard(
                        title: "printer_current_config_kitchen".localized,
                        subtitle: "printer_kitchen_printer_subtitle".localized,
                        selectedPrinter: settingsManager.kitchenPrinter,
                        candidates: settingsManager.configuredPrinters.filter { $0.id != settingsManager.primaryReceiptPrinter?.id },
                        onSelect: { printer in
                            settingsManager.setKitchenPrinter(printer)
                        }
                    )
                }
            }
        }
    }

    private var previewSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            sectionHeader(
                title: "printer_setup_preview_title".localized,
                subtitle: "printer_setup_preview_subtitle".localized
            )

            routingPreviewCard
            receiptPreviewCard

            if useSeparateKitchenPrinter {
                kitchenPreviewCard
            }
        }
    }

    private var assignmentPlaceholder: some View {
        Text("printer_assignment_empty".localized)
            .font(.caption)
            .foregroundColor(.appTextSecondary)
            .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
    }

    private var testSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            sectionHeader(
                title: "test_and_customize_title".localized,
                subtitle: "printer_test_section_subtitle_simple".localized
            )

            if let receiptPrinter = settingsManager.primaryReceiptPrinter {
                Button {
                    testingPrinter = receiptPrinter
                    Task { await runPrinterTest(receiptPrinter) }
                } label: {
                    HStack {
                        Image(systemName: isTesting && testingPrinter?.id == receiptPrinter.id ? "hourglass" : "doc.text")
                        Text("printer_test_receipt_button".localized)
                    }
                }
                .buttonStyle(PrimaryButtonStyle(isEnabled: !isTesting))
                .disabled(isTesting)
            }

            if useSeparateKitchenPrinter, let kitchenPrinter = settingsManager.kitchenPrinter {
                Button {
                    testingPrinter = kitchenPrinter
                    Task { await runPrinterTest(kitchenPrinter) }
                } label: {
                    HStack {
                        Image(systemName: isTesting && testingPrinter?.id == kitchenPrinter.id ? "hourglass" : "list.clipboard")
                        Text("printer_test_kitchen_button".localized)
                    }
                }
                .buttonStyle(SecondaryButtonStyle(isEnabled: !isTesting))
                .disabled(isTesting)
            }

            NavigationLink(destination: ReceiptCustomizationView()) {
                HStack {
                    Image(systemName: "doc.text.magnifyingglass")
                        .foregroundColor(.appPrimary)
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text("receipt_customization".localized)
                            .font(.bodyMedium.weight(.semibold))
                            .foregroundColor(.appTextPrimary)
                        Text("printer_standard_receipt_subtitle".localized)
                            .font(.caption)
                            .foregroundColor(.appTextSecondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption.weight(.semibold))
                        .foregroundColor(.appTextSecondary)
                }
                .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
            }
            .buttonStyle(.plain)
        }
    }

    private var advancedSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            sectionHeader(
                title: "advanced_title".localized,
                subtitle: "printer_advanced_subtitle_simple".localized
            )

            NavigationLink(destination: PrintLanguageConfigView()) {
                advancedRow(
                    icon: "textformat",
                    title: "language_diagnostics_title".localized,
                    subtitle: "language_diagnostics_subtitle".localized
                )
            }
            .buttonStyle(.plain)

            Button {
                showingConnectionOptions = true
            } label: {
                advancedRow(
                    icon: "questionmark.circle",
                    title: "printer_other_connection_title".localized,
                    subtitle: "printer_other_connection_subtitle".localized
                )
            }
            .buttonStyle(.plain)
        }
    }

    private var routingPreviewCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("printer_setup_preview_routing".localized)
                .font(.bodyMedium.weight(.semibold))
                .foregroundColor(.appTextPrimary)

            previewRouteRow(
                title: "printer_receipt_printer_title".localized,
                value: settingsManager.primaryReceiptPrinter?.name ?? "printer_select_placeholder".localized
            )

            previewRouteRow(
                title: "printer_current_config_kitchen".localized,
                value: useSeparateKitchenPrinter
                    ? (settingsManager.kitchenPrinter?.name ?? "printer_select_placeholder".localized)
                    : (settingsManager.primaryReceiptPrinter?.name ?? "printer_select_placeholder".localized)
            )
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
    }

    private var receiptPreviewCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("printer_setup_preview_receipt".localized)
                    .font(.bodyMedium.weight(.semibold))
                    .foregroundColor(.appTextPrimary)

                Spacer()

                previewLanguagePill(settingsManager.selectedReceiptLanguage)
            }

            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text(previewRestaurantName)
                    .font(.cardTitle)
                    .foregroundColor(.appTextPrimary)

                if !settingsManager.receiptHeader.address.isEmpty {
                    Text(settingsManager.receiptHeader.address)
                        .font(.caption)
                        .foregroundColor(.appTextSecondary)
                }

                if !settingsManager.receiptHeader.phone.isEmpty {
                    Text(settingsManager.receiptHeader.phone)
                        .font(.caption)
                        .foregroundColor(.appTextSecondary)
                }

                if settingsManager.receiptHeader.showTaxCode, !settingsManager.receiptHeader.taxCode.isEmpty {
                    Text("\("tax_code".localized): \(settingsManager.receiptHeader.taxCode)")
                        .font(.monoCaption)
                        .foregroundColor(.appTextSecondary)
                }

                Divider()

                previewLineItem(
                    title: "printer_setup_preview_sample_item".localized,
                    value: "¥1,280"
                )

                previewLineItem(
                    title: "subtotal".localized,
                    value: "¥1,280"
                )

                previewLineItem(
                    title: "printer_setup_preview_total".localized,
                    value: "¥1,408",
                    emphasized: true
                )

                if !settingsManager.receiptHeader.footerMessage.isEmpty {
                    Divider()

                    Text(settingsManager.receiptHeader.footerMessage)
                        .font(.caption)
                        .foregroundColor(.appTextSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurfaceSecondary.opacity(0.82))
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
    }

    private var kitchenPreviewCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("printer_setup_preview_kitchen".localized)
                    .font(.bodyMedium.weight(.semibold))
                    .foregroundColor(.appTextPrimary)

                Spacer()

                previewLanguagePill(settingsManager.selectedKitchenLanguage)
            }

            VStack(alignment: .leading, spacing: Spacing.sm) {
                Text("Table 5")
                    .font(.cardTitle)
                    .foregroundColor(.appTextPrimary)

                Text("2 x \( "printer_setup_preview_sample_item".localized)")
                    .font(.bodyMedium)
                    .foregroundColor(.appTextPrimary)

                Text("No onion")
                    .font(.caption)
                    .foregroundColor(.appInfo)

                Text("18m")
                    .font(.monoCaption)
                    .foregroundColor(.appWarning)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurfaceSecondary.opacity(0.82))
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
    }

    private func assignmentPickerCard(
        title: String,
        subtitle: String,
        selectedPrinter: ConfiguredPrinter?,
        candidates: [ConfiguredPrinter],
        onSelect: @escaping (ConfiguredPrinter?) -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text(title)
                .font(.bodyMedium.weight(.semibold))
                .foregroundColor(.appTextPrimary)

            Text(subtitle)
                .font(.caption)
                .foregroundColor(.appTextSecondary)

            Menu {
                ForEach(candidates, id: \.id) { printer in
                    Button(printer.name) {
                        onSelect(printer)
                    }
                }
            } label: {
                HStack {
                    Text(selectedPrinter?.name ?? "printer_select_placeholder".localized)
                        .foregroundColor(selectedPrinter == nil ? .appTextSecondary : .appTextPrimary)
                    Spacer()
                    Image(systemName: "chevron.up.chevron.down")
                        .foregroundColor(.appTextSecondary)
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.md)
                .background(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .fill(Color.appSurfaceSecondary)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(Color.appBorderLight, lineWidth: 1)
                )
            }
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
    }

    private func previewRouteRow(title: String, value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Spacing.md) {
            Text(title)
                .font(.monoCaption)
                .foregroundColor(.appTextSecondary)

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .foregroundColor(.appTextPrimary)
                .multilineTextAlignment(.trailing)
        }
    }

    private func previewLineItem(title: String, value: String, emphasized: Bool = false) -> some View {
        HStack {
            Text(title)
                .font(emphasized ? .bodyMedium.weight(.semibold) : .bodyMedium)
                .foregroundColor(emphasized ? .appTextPrimary : .appTextSecondary)

            Spacer()

            Text(value)
                .font(emphasized ? .cardTitle : .bodyMedium)
                .foregroundColor(.appTextPrimary)
        }
    }

    private func previewLanguagePill(_ language: PrintLanguage) -> some View {
        Text(language.nativeName)
            .font(.monoCaption)
            .foregroundColor(.appTextSecondary)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xs)
            .background(Color.appSurfaceSecondary)
            .cornerRadius(CornerRadius.sm)
    }

    private var previewRestaurantName: String {
        let headerName = settingsManager.receiptHeader.restaurantName.trimmingCharacters(in: .whitespacesAndNewlines)
        if !headerName.isEmpty {
            return headerName
        }

        let restaurantName = settingsManager.restaurantSettings.name.trimmingCharacters(in: .whitespacesAndNewlines)
        return restaurantName.isEmpty ? "SOder Restaurant" : restaurantName
    }

    private func advancedRow(icon: String, title: String, subtitle: String) -> some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: icon)
                .foregroundColor(.appPrimary)
                .frame(width: 24)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(title)
                    .font(.bodyMedium.weight(.semibold))
                    .foregroundColor(.appTextPrimary)
                Text(subtitle)
                    .font(.caption)
                    .foregroundColor(.appTextSecondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundColor(.appTextSecondary)
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
    }

    private func sectionHeader(title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xxs) {
            Text(title)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)
            Text(subtitle)
                .font(.caption)
                .foregroundColor(.appTextSecondary)
        }
    }

    private func printerRoleDescription(for printer: ConfiguredPrinter) -> String {
        if settingsManager.primaryReceiptPrinter?.id == printer.id {
            return "printer_role_receipt".localized
        }

        if settingsManager.kitchenPrinter?.id == printer.id {
            return "printer_role_kitchen".localized
        }

        return printer.printerType.displayName
    }

    private func runPrinterTest(_ printer: ConfiguredPrinter) async {
        await MainActor.run {
            isTesting = true
        }

        let target: PrinterSettingsManager.PrintTarget = settingsManager.kitchenPrinter?.id == printer.id ? .kitchen : .receipt
        let language = settingsManager.getSelectedLanguage(for: target)
        let success = await PrinterService.shared.testPrintSampleForPrinter(printer, language: language)

        await MainActor.run {
            isTesting = false
            settingsManager.updateConnectionStatus(for: printer.id, status: success ? .connected : .disconnected)
            testResult = TestResult(
                success: success,
                message: success
                    ? String(format: "printer_test_success_message".localized, printer.name)
                    : String(format: "printer_test_failed_message".localized, printer.name),
                suggestion: success ? nil : "printer_test_failed_suggestion".localized
            )
            showingTestResult = true
        }
    }

    private func saveAndDismiss() {
        dismiss()
    }
}

struct TestResult {
    let success: Bool
    let message: String
    let suggestion: String?
}

private struct PrinterSetupCard: View {
    let printer: ConfiguredPrinter
    let role: String
    let connectionStatus: ConnectionStatus
    let onEdit: () -> Void
    let onTest: () -> Void
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(printer.name)
                        .font(.bodyMedium.weight(.semibold))
                        .foregroundColor(.appTextPrimary)

                    Text(role)
                        .font(.monoLabel)
                        .foregroundColor(.appTextSecondary)
                }

                Spacer()

                HStack(spacing: Spacing.xs) {
                    Image(systemName: connectionStatus.icon)
                        .foregroundColor(connectionStatus.color)
                    Text(connectionStatus.displayName)
                        .font(.caption)
                        .foregroundColor(connectionStatus.color)
                }
            }

            Text("\(printer.ipAddress):\(printer.port)")
                .font(.caption)
                .foregroundColor(.appTextSecondary)

            HStack(spacing: Spacing.sm) {
                actionButton(icon: "pencil", title: "edit".localized, action: onEdit)
                actionButton(icon: "testtube.2", title: "test".localized, action: onTest)
                actionButton(icon: "trash", title: "delete".localized, action: onDelete, tint: .appError)
            }
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
    }

    private func actionButton(
        icon: String,
        title: String,
        action: @escaping () -> Void,
        tint: Color = .appPrimary
    ) -> some View {
        Button(action: action) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: icon)
                Text(title)
            }
            .font(.caption.weight(.semibold))
            .foregroundColor(tint)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xs)
            .background(
                Capsule()
                    .fill(tint.opacity(0.12))
            )
        }
        .buttonStyle(.plain)
    }
}

struct AddEditPrinterView: View {
    let printer: ConfiguredPrinter?
    let onSave: (ConfiguredPrinter) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var ipAddress = ""
    @State private var port = "9100"
    @State private var printerType: ConfiguredPrinterType = .receipt
    @State private var showAdvanced = false

    private var isEditing: Bool {
        printer != nil
    }

    private var canSave: Bool {
        !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !ipAddress.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        Int(port) != nil
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("printer_add_network_printer_button".localized)
                            .font(.sectionHeader)
                            .foregroundColor(.appTextPrimary)

                        Text("printer_add_network_printer_help".localized)
                            .font(.bodyMedium)
                            .foregroundColor(.appTextSecondary)
                    }
                    .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.xl, surfaceColor: Color.appSurface.opacity(0.94))

                    VStack(alignment: .leading, spacing: Spacing.md) {
                        TextField("printer_manual_setup_printer_name_label".localized, text: $name)
                            .textFieldStyle(RoundedBorderTextFieldStyle())

                        TextField("printer_manual_setup_ip_address_label".localized, text: $ipAddress)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.decimalPad)

                        DisclosureGroup(isExpanded: $showAdvanced) {
                            VStack(alignment: .leading, spacing: Spacing.md) {
                                TextField("printer_manual_setup_port_label".localized, text: $port)
                                    .textFieldStyle(RoundedBorderTextFieldStyle())
                                    .keyboardType(.numberPad)

                                Picker("printer_type_receipt_display_name".localized, selection: $printerType) {
                                    ForEach(ConfiguredPrinterType.allCases, id: \.self) { type in
                                        Text(type.displayName).tag(type)
                                    }
                                }
                                .pickerStyle(.menu)
                            }
                            .padding(.top, Spacing.sm)
                        } label: {
                            Text("printer_more_options_title".localized)
                                .font(.bodyMedium.weight(.semibold))
                                .foregroundColor(.appTextPrimary)
                        }
                    }
                    .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.xl, surfaceColor: Color.appSurface.opacity(0.92))
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.lg)
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle(isEditing ? "edit".localized : "add_printer".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("cancel".localized) {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("save".localized) {
                        savePrinter()
                    }
                    .disabled(!canSave)
                }
            }
        }
        .onAppear {
            if let printer {
                name = printer.name
                ipAddress = printer.ipAddress
                port = String(printer.port)
                printerType = printer.printerType
            }
        }
    }

    private func savePrinter() {
        guard let portInt = Int(port) else { return }

        let printerName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let newPrinter = ConfiguredPrinter(
            id: printer?.id ?? UUID().uuidString,
            name: printerName,
            ipAddress: ipAddress.trimmingCharacters(in: .whitespacesAndNewlines),
            port: portInt,
            printerType: printerType
        )

        onSave(newPrinter)
        dismiss()
    }
}

#Preview {
    NavigationView {
        UnifiedPrinterSetupView()
            .environmentObject(PrinterManager.shared)
    }
}

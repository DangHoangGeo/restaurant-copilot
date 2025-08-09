import SwiftUI

struct UnifiedPrinterSetupView: View {
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @EnvironmentObject private var printerManager: PrinterManager
    @Environment(\.dismiss) private var dismiss
    
    @State private var setupMode: PrinterMode = .single
    @State private var showingAddPrinter = false
    @State private var editingPrinter: ConfiguredPrinter?
    @State private var showingTestDialog = false
    @State private var testingPrinter: ConfiguredPrinter?
    @State private var showingDeleteAlert = false
    @State private var printerToDelete: ConfiguredPrinter?
    
    var body: some View {
        Form {
            // 1. Mode (primary)
            Section(header: sectionHeader(icon: "1.circle.fill", title: "printer_setup_title".localized, subtitle: "printer_setup_mode_subtitle".localized)) {
                printerModeSelection
            }
            
            // 2. Printers (add/configure)
            Section(header: sectionHeader(icon: "2.circle.fill", title: "printers".localized, subtitle: "add_or_configure_printers".localized)) {
                printersManagementSection
            }
            
            // 3. Assign roles (single/dual)
            Section(header: sectionHeader(icon: "3.circle.fill", title: "assignments_title".localized, subtitle: "assignments_subtitle".localized)) {
                if setupMode == .single {
                    singlePrinterSetup
                } else {
                    dualPrinterSetup
                }
            }
            
            // 4. Test & Customize
            Section(header: sectionHeader(icon: "4.circle.fill", title: "test_and_customize_title".localized, subtitle: "test_and_customize_subtitle".localized)) {
                testAndFinishSection
            }
            
            // Advanced (demoted)
            Section(header: sectionHeader(icon: "gear", title: "advanced_title".localized, subtitle: "advanced_subtitle".localized)) {
                advancedSettingsSection
            }
        }
        .navigationTitle("printer_setup_title".localized)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) { Button("cancel".localized) { dismiss() } }
            ToolbarItem(placement: .navigationBarTrailing) { Button("done".localized) { saveAndDismiss() }.fontWeight(.semibold) }
        }
        .sheet(isPresented: $showingAddPrinter) {
            AddEditPrinterView(printer: nil) { printer in
                settingsManager.addPrinter(printer)
                // Post-add behavior
                if setupMode == .single && settingsManager.activePrinter == nil {
                    settingsManager.setActivePrinter(printer)
                }
                if setupMode == .dual {
                    settingsManager.autoAssignDualPrinters()
                }
            }
        }
        .sheet(item: $editingPrinter) { printer in
            AddEditPrinterView(printer: printer) { updatedPrinter in
                settingsManager.updatePrinter(updatedPrinter)
            }
        }
        .alert("test_printer_title".localized, isPresented: $showingTestDialog) {
            Button("cancel".localized, role: .cancel) { }
            Button("test".localized) { if let printer = testingPrinter { Task { await testPrinter(printer) } } }
        } message: { Text("test_printer_message".localized) }
        .alert("delete_printer_title".localized, isPresented: $showingDeleteAlert) {
            Button("cancel".localized, role: .cancel) { }
            Button("delete".localized, role: .destructive) { if let printer = printerToDelete { settingsManager.removePrinter(id: printer.id) } }
        } message: { Text("delete_printer_message".localized) }
        .onAppear { setupMode = settingsManager.printerMode }
    }
    
    // MARK: - Printer Mode Selection
    private var printerModeSelection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("printer_mode_selection_header_subtitle".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)
            
            VStack(spacing: Spacing.sm) {
                PrinterModeCard(
                    mode: .single,
                    isSelected: setupMode == .single,
                    title: "printer_mode_single_display_name".localized,
                    description: "printer_mode_single_description".localized,
                    icon: "printer.fill"
                ) {
                    setupMode = .single
                    settingsManager.setPrinterMode(.single)
                }
                
                PrinterModeCard(
                    mode: .dual,
                    isSelected: setupMode == .dual,
                    title: "printer_mode_dual_display_name".localized,
                    description: "printer_mode_dual_description".localized,
                    icon: "printer.fill.and.paper.fill"
                ) {
                    setupMode = .dual
                    settingsManager.setPrinterMode(.dual)
                }
            }
        }
        .padding(.vertical, Spacing.sm)
    }
    
    // MARK: - Single/Dual Setup (unchanged blocks reused)
    private var singlePrinterSetup: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if let activePrinter = settingsManager.activePrinter {
                PrinterConfigCard(
                    printer: activePrinter,
                    role: "main_printer".localized,
                    onEdit: { editingPrinter = activePrinter },
                    onTest: { testingPrinter = activePrinter; showingTestDialog = true },
                    onRemove: { printerToDelete = activePrinter; showingDeleteAlert = true }
                )
            } else {
                EmptyPrinterCard(role: "main_printer".localized) { showingAddPrinter = true }
            }
        }
    }
    
    private var dualPrinterSetup: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if let kitchenPrinter = settingsManager.kitchenPrinter {
                PrinterConfigCard(
                    printer: kitchenPrinter,
                    role: "kitchen_printer".localized,
                    onEdit: { editingPrinter = kitchenPrinter },
                    onTest: { testingPrinter = kitchenPrinter; showingTestDialog = true },
                    onRemove: { printerToDelete = kitchenPrinter; showingDeleteAlert = true }
                )
            } else {
                EmptyPrinterCard(role: "kitchen_printer".localized) { showingAddPrinter = true }
            }
            if let checkoutPrinter = settingsManager.checkoutPrinter {
                PrinterConfigCard(
                    printer: checkoutPrinter,
                    role: "checkout_printer".localized,
                    onEdit: { editingPrinter = checkoutPrinter },
                    onTest: { testingPrinter = checkoutPrinter; showingTestDialog = true },
                    onRemove: { printerToDelete = checkoutPrinter; showingDeleteAlert = true }
                )
            } else {
                EmptyPrinterCard(role: "checkout_printer".localized) { showingAddPrinter = true }
            }
        }
    }
    
    // MARK: - Printers management
    private var printersManagementSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            Button(action: { showingAddPrinter = true }) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("add_printer".localized).fontWeight(.medium)
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption).foregroundColor(.appTextSecondary)
                }
            }
            .buttonStyle(PlainButtonStyle())
            .accessibilityLabel("add_printer".localized)
            
            if settingsManager.configuredPrinters.isEmpty {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text("no_printers_configured".localized)
                        .font(.caption)
                        .foregroundColor(.appTextSecondary)
                    Text("using_default_placeholder_printer".localized)
                        .font(.caption2)
                        .foregroundColor(.appTextSecondary)
                }
                .padding(.top, Spacing.xs)
            } else {
                configuredPrintersList
            }
        }
    }
    
    private var configuredPrintersList: some View {
        ForEach(settingsManager.configuredPrinters, id: \.id) { printer in
            HStack(alignment: .center, spacing: Spacing.sm) {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    HStack(spacing: 6) {
                        Text(printer.name).font(.headline)
                        if settingsManager.activePrinter?.id == printer.id && setupMode == .single {
                            Text("active".localized).font(.caption2).padding(.horizontal, 6).padding(.vertical, 2).background(Color.appSuccess.opacity(0.15)).cornerRadius(6)
                        }
                        if settingsManager.kitchenPrinter?.id == printer.id && setupMode == .dual {
                            Text("kitchen".localized).font(.caption2).padding(.horizontal, 6).padding(.vertical, 2).background(Color.appInfo.opacity(0.15)).cornerRadius(6)
                        }
                        if settingsManager.checkoutPrinter?.id == printer.id && setupMode == .dual {
                            Text("checkout".localized).font(.caption2).padding(.horizontal, 6).padding(.vertical, 2).background(Color.appWarning.opacity(0.15)).cornerRadius(6)
                        }
                    }
                    Text("\(printer.ipAddress):\(printer.port)")
                        .font(.caption)
                        .foregroundColor(.appTextSecondary)
                }
                Spacer()
                Menu {
                    Button("edit".localized) { editingPrinter = printer }
                    Button("test".localized) { testingPrinter = printer; showingTestDialog = true }
                    if setupMode == .single {
                        Button("set_active".localized) { settingsManager.setActivePrinter(printer) }
                    } else {
                        Button("assign_to_kitchen".localized) { settingsManager.setKitchenPrinter(printer) }
                        Button("assign_to_checkout".localized) { settingsManager.setCheckoutPrinter(printer) }
                    }
                    Divider()
                    Button("remove".localized, role: .destructive) { printerToDelete = printer; showingDeleteAlert = true }
                } label: {
                    Image(systemName: "ellipsis.circle").font(.title3)
                }
            }
            .padding(.vertical, Spacing.xs)
            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                Button(role: .destructive) { printerToDelete = printer; showingDeleteAlert = true } label: { Label("delete".localized, systemImage: "trash") }
                if setupMode == .single {
                    Button { settingsManager.setActivePrinter(printer) } label: { Label("set_active".localized, systemImage: "checkmark.circle") }.tint(.appSuccess)
                } else {
                    Button { settingsManager.setKitchenPrinter(printer) } label: { Label("kitchen".localized, systemImage: "fork.knife") }.tint(.appInfo)
                    Button { settingsManager.setCheckoutPrinter(printer) } label: { Label("checkout".localized, systemImage: "cart") }.tint(.appWarning)
                }
            }
        }
    }
    
    // MARK: - Test & Finish
    private var testAndFinishSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            if setupMode == .dual {
                HStack {
                    Button {
                        if let kitchen = settingsManager.kitchenPrinter { testingPrinter = kitchen; showingTestDialog = true }
                    } label: {
                        HStack {
                            Image(systemName: "fork.knife").foregroundColor(.appPrimary)
                            Text("test_kitchen_printer".localized)
                        }
                    }
                    .accessibilityLabel("test_kitchen_printer".localized)
                    Spacer(minLength: Spacing.sm)
                    Button {
                        if let checkout = settingsManager.checkoutPrinter { testingPrinter = checkout; showingTestDialog = true }
                    } label: {
                        HStack {
                            Image(systemName: "cart").foregroundColor(.appPrimary)
                            Text("test_checkout_printer".localized)
                        }
                    }
                    .accessibilityLabel("test_checkout_printer".localized)
                }
            } else {
                Button {
                    if let printer = settingsManager.activePrinter { testingPrinter = printer; showingTestDialog = true }
                } label: {
                    HStack {
                        Image(systemName: "testtube.2").foregroundColor(.appPrimary)
                        Text("test_assigned_printers".localized)
                    }
                }
                .accessibilityLabel("test_assigned_printers".localized)
            }
        }
    }
    
    // MARK: - Advanced (demoted)
    private var advancedSettingsSection: some View {
        VStack(spacing: Spacing.xs) {
            NavigationLink(destination: PrintLanguageConfigView()) {
                HStack {
                    Image(systemName: "textformat").foregroundColor(.appPrimary)
                    VStack(alignment: .leading) {
                        Text("language_diagnostics_title".localized)
                            .fontWeight(.medium)
                        Text("language_diagnostics_subtitle".localized)
                            .font(.caption)
                            .foregroundColor(.appTextSecondary)
                    }
                }
                .accessibilityLabel("language_diagnostics_title".localized)
            }
        }
    }
    
    // MARK: - Helper Views / Actions
    @ViewBuilder private func sectionHeader(icon: String, title: String, subtitle: String) -> some View {
        HStack { Image(systemName: icon).foregroundColor(.appPrimary).font(.title3)
            VStack(alignment: .leading, spacing: 2) { Text(title).font(.sectionHeader); Text(subtitle).font(.caption).foregroundColor(.appTextSecondary) } }
    }
    
    private func testPrinter(_ printer: ConfiguredPrinter) async {
        do {
            let isKitchen = settingsManager.kitchenPrinter?.id == printer.id
            let lang = isKitchen ? settingsManager.selectedKitchenLanguage : settingsManager.selectedReceiptLanguage
            let success = await PrinterService.shared.testPrintSampleForPrinter(printer, language: lang)
            await MainActor.run { print(success ? "printer_test_receipt_success_log".localized : "printer_test_print_failed_log".localized) }
        } catch {
            await MainActor.run { print("printer_test_print_failed_log".localized) }
        }
    }
    
    private func saveAndDismiss() { dismiss() }
}

// MARK: - Supporting Views
struct PrinterModeCard: View {
    let mode: PrinterMode
    let isSelected: Bool
    let title: String
    let description: String
    let icon: String
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .foregroundColor(isSelected ? .appSurface : .appPrimary)
                    .font(.title2)
                    .frame(width: 30)
                
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(isSelected ? .appSurface : .appTextPrimary)
                    Text(description)
                        .font(.caption)
                        .foregroundColor(isSelected ? .appSurface.opacity(0.8) : .appTextSecondary)
                        .multilineTextAlignment(.leading)
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.appSurface)
                        .font(.title3)
                }
            }
            .padding()
            .background(isSelected ? Color.appPrimary : Color.appBackground)
            .cornerRadius(CornerRadius.sm)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

struct PrinterConfigCard: View {
    let printer: ConfiguredPrinter
    let role: String
    let onEdit: () -> Void
    let onTest: () -> Void
    let onRemove: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(role)
                        .font(.caption)
                        .foregroundColor(.appTextSecondary)
                        .textCase(.uppercase)
                    Text(printer.name)
                        .font(.headline)
                    Text("\(printer.ipAddress):\(printer.port)")
                        .font(.caption)
                        .foregroundColor(.appTextSecondary)
                }
                
                Spacer()
                
                HStack(spacing: Spacing.xs) {
                    Button(action: onTest) {
                        Image(systemName: "testtube.2")
                            .foregroundColor(.appPrimary)
                    }
                    .buttonStyle(BorderlessButtonStyle())
                    .accessibilityLabel("test".localized)
                    
                    Button(action: onEdit) {
                        Image(systemName: "pencil")
                            .foregroundColor(.appWarning)
                    }
                    .buttonStyle(BorderlessButtonStyle())
                    .accessibilityLabel("edit".localized)
                    
                    Button(action: onRemove) {
                        Image(systemName: "trash")
                            .foregroundColor(.appError)
                    }
                    .buttonStyle(BorderlessButtonStyle())
                    .accessibilityLabel("remove".localized)
                }
            }
        }
        .padding()
        .background(Color.appSuccess.opacity(0.1))
        .cornerRadius(CornerRadius.xs)
    }
}

struct EmptyPrinterCard: View {
    let role: String
    let onAdd: () -> Void
    
    var body: some View {
        Button(action: onAdd) {
            VStack(spacing: Spacing.sm) {
                Image(systemName: "plus.circle.dashed")
                    .font(.largeTitle)
                    .foregroundColor(.appBorder)
                
                VStack(spacing: Spacing.xs) {
                    Text("add_role_format".localized(with: role))
                        .font(.headline)
                        .foregroundColor(.appTextPrimary)
                    Text("tap_to_configure_network_printer".localized)
                        .font(.caption)
                        .foregroundColor(.appTextSecondary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.appBackground)
            .cornerRadius(CornerRadius.xs)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.xs)
                    .stroke(Color.appBorder, style: StrokeStyle(lineWidth: 1, dash: [5]))
            )
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("add_printer".localized)
    }
}

// MARK: - Add/Edit Printer View
struct AddEditPrinterView: View {
    let printer: ConfiguredPrinter?
    let onSave: (ConfiguredPrinter) -> Void
    
    @Environment(\.dismiss) private var dismiss
    @State private var name: String = ""
    @State private var ipAddress: String = ""
    @State private var port: String = "9100"
    @State private var printerType: ConfiguredPrinterType = .receipt
    
    var isEditing: Bool { printer != nil }
    
    var body: some View {
        NavigationView {
            Form {
                Section("Printer Information") {
                    TextField("Printer Name", text: $name)
                    TextField("IP Address", text: $ipAddress)
                        .keyboardType(.decimalPad)
                    TextField("Port", text: $port)
                        .keyboardType(.numberPad)
                    
                    Picker("Printer Type", selection: $printerType) {
                        ForEach(ConfiguredPrinterType.allCases, id: \.self) { type in
                            Text(type.displayName).tag(type)
                        }
                    }
                }
                
                Section("Quick Setup") {
                    Button("Use Default Settings (192.168.1.100:9100)") {
                        ipAddress = "192.168.1.100"
                        port = "9100"
                        if name.isEmpty {
                            name = "Network Printer"
                        }
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Printer" : "Add Printer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        savePrinter()
                    }
                    .disabled(name.isEmpty || ipAddress.isEmpty || port.isEmpty)
                }
            }
        }
        .onAppear {
            if let printer = printer {
                name = printer.name
                ipAddress = printer.ipAddress
                port = String(printer.port)
                printerType = printer.printerType
            }
        }
    }
    
    private func savePrinter() {
        guard let portInt = Int(port) else { return }
        
        let newPrinter = ConfiguredPrinter(
            id: printer?.id ?? UUID().uuidString,
            name: name,
            ipAddress: ipAddress,
            port: portInt,
            printerType: printerType
        )
        
        onSave(newPrinter)
        dismiss()
    }
}

#Preview {
    UnifiedPrinterSetupView()
        .environmentObject(PrinterManager.shared)
}
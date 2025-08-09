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
            Section(header: sectionHeader(icon: "1.circle.fill", title: "Printer Setup", subtitle: "Mode")) {
                printerModeSelection
            }
            
            // 2. Printers (add/configure)
            Section(header: sectionHeader(icon: "2.circle.fill", title: "Printers", subtitle: "Add or configure printers")) {
                printersManagementSection
            }
            
            // 3. Assign roles (single/dual)
            Section(header: sectionHeader(icon: "3.circle.fill", title: "Assignments", subtitle: "Choose active or role printers")) {
                if setupMode == .single {
                    singlePrinterSetup
                } else {
                    dualPrinterSetup
                }
            }
            
            // 4. Test & Customize
            Section(header: sectionHeader(icon: "4.circle.fill", title: "Test & Customize", subtitle: "Verify and configure receipt")) {
                NavigationLink(destination: ReceiptCustomizationView()) {
                    HStack {
                        Image(systemName: "doc.badge.gearshape")
                            .foregroundColor(.blue)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("receipt_customization".localized)
                                .fontWeight(.medium)
                            Text("configure_header_footer_templates_languages".localized)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right").foregroundColor(.gray).font(.caption)
                    }
                }
                testAndFinishSection
            }
            
            // Advanced (demoted)
            Section(header: sectionHeader(icon: "gear", title: "Advanced", subtitle: "Queue and diagnostics")) {
                advancedSettingsSection
            }
        }
        .navigationTitle("Printer Setup")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) { Button("Cancel") { dismiss() } }
            ToolbarItem(placement: .navigationBarTrailing) { Button("Done") { saveAndDismiss() }.fontWeight(.semibold) }
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
        .alert("Test Printer", isPresented: $showingTestDialog) {
            Button("Cancel", role: .cancel) { }
            Button("Test") { if let printer = testingPrinter { Task { await testPrinter(printer) } } }
        } message: { Text("Send a test print to verify the connection?") }
        .alert("Delete Printer", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) { if let printer = printerToDelete { settingsManager.removePrinter(id: printer.id) } }
        } message: { Text("Are you sure you want to delete this printer configuration?") }
        .onAppear { setupMode = settingsManager.printerMode }
    }
    
    // MARK: - Printer Mode Selection
    private var printerModeSelection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("How do you want to handle printing?")
                .font(.headline)
                .foregroundColor(.primary)
            
            VStack(spacing: 12) {
                PrinterModeCard(
                    mode: .single,
                    isSelected: setupMode == .single,
                    title: "Single Printer",
                    description: "One printer handles both kitchen orders and customer receipts",
                    icon: "printer.fill"
                ) {
                    setupMode = .single
                    settingsManager.setPrinterMode(.single)
                }
                
                PrinterModeCard(
                    mode: .dual,
                    isSelected: setupMode == .dual,
                    title: "Dual Printers",
                    description: "Separate printers for kitchen orders and customer receipts",
                    icon: "printer.fill.and.paper.fill"
                ) {
                    setupMode = .dual
                    settingsManager.setPrinterMode(.dual)
                }
            }
        }
        .padding(.vertical, 8)
    }
    
    // MARK: - Single/Dual Setup (unchanged blocks reused)
    private var singlePrinterSetup: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let activePrinter = settingsManager.activePrinter {
                PrinterConfigCard(
                    printer: activePrinter,
                    role: "Main Printer",
                    onEdit: { editingPrinter = activePrinter },
                    onTest: { testingPrinter = activePrinter; showingTestDialog = true },
                    onRemove: { printerToDelete = activePrinter; showingDeleteAlert = true }
                )
            } else {
                EmptyPrinterCard(role: "Main Printer") { showingAddPrinter = true }
            }
        }
    }
    
    private var dualPrinterSetup: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let kitchenPrinter = settingsManager.kitchenPrinter {
                PrinterConfigCard(
                    printer: kitchenPrinter,
                    role: "Kitchen Printer",
                    onEdit: { editingPrinter = kitchenPrinter },
                    onTest: { testingPrinter = kitchenPrinter; showingTestDialog = true },
                    onRemove: { printerToDelete = kitchenPrinter; showingDeleteAlert = true }
                )
            } else {
                EmptyPrinterCard(role: "Kitchen Printer") { showingAddPrinter = true }
            }
            if let checkoutPrinter = settingsManager.checkoutPrinter {
                PrinterConfigCard(
                    printer: checkoutPrinter,
                    role: "Checkout Printer",
                    onEdit: { editingPrinter = checkoutPrinter },
                    onTest: { testingPrinter = checkoutPrinter; showingTestDialog = true },
                    onRemove: { printerToDelete = checkoutPrinter; showingDeleteAlert = true }
                )
            } else {
                EmptyPrinterCard(role: "Checkout Printer") { showingAddPrinter = true }
            }
        }
    }
    
    // MARK: - Printers management
    private var printersManagementSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button(action: { showingAddPrinter = true }) {
                HStack {
                    Image(systemName: "plus.circle.fill")
                    Text("Add Network Printer").fontWeight(.medium)
                    Spacer()
                    Image(systemName: "chevron.right").font(.caption).foregroundColor(.gray)
                }
            }
            .buttonStyle(PlainButtonStyle())
            
            if settingsManager.configuredPrinters.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("No printers configured.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Text("Using a default placeholder printer. Add a printer to save and edit settings.")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 4)
            } else {
                configuredPrintersList
            }
        }
    }
    
    private var configuredPrintersList: some View {
        ForEach(settingsManager.configuredPrinters, id: \.id) { printer in
            HStack(alignment: .center, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(printer.name).font(.headline)
                        if settingsManager.activePrinter?.id == printer.id && setupMode == .single {
                            Text("Active").font(.caption2).padding(.horizontal, 6).padding(.vertical, 2).background(Color.green.opacity(0.15)).cornerRadius(6)
                        }
                        if settingsManager.kitchenPrinter?.id == printer.id && setupMode == .dual {
                            Text("Kitchen").font(.caption2).padding(.horizontal, 6).padding(.vertical, 2).background(Color.blue.opacity(0.15)).cornerRadius(6)
                        }
                        if settingsManager.checkoutPrinter?.id == printer.id && setupMode == .dual {
                            Text("Checkout").font(.caption2).padding(.horizontal, 6).padding(.vertical, 2).background(Color.orange.opacity(0.15)).cornerRadius(6)
                        }
                    }
                    Text("\(printer.ipAddress):\(printer.port)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Menu {
                    Button("Edit") { editingPrinter = printer }
                    Button("Test") { testingPrinter = printer; showingTestDialog = true }
                    if setupMode == .single {
                        Button("Set Active") { settingsManager.setActivePrinter(printer) }
                    } else {
                        Button("Assign to Kitchen") { settingsManager.setKitchenPrinter(printer) }
                        Button("Assign to Checkout") { settingsManager.setCheckoutPrinter(printer) }
                    }
                    Divider()
                    Button("Remove", role: .destructive) { printerToDelete = printer; showingDeleteAlert = true }
                } label: {
                    Image(systemName: "ellipsis.circle").font(.title3)
                }
            }
            .padding(.vertical, 4)
            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                Button(role: .destructive) { printerToDelete = printer; showingDeleteAlert = true } label: { Label("Delete", systemImage: "trash") }
                if setupMode == .single {
                    Button { settingsManager.setActivePrinter(printer) } label: { Label("Set Active", systemImage: "checkmark.circle") }.tint(.green)
                } else {
                    Button { settingsManager.setKitchenPrinter(printer) } label: { Label("Kitchen", systemImage: "fork.knife") }.tint(.blue)
                    Button { settingsManager.setCheckoutPrinter(printer) } label: { Label("Checkout", systemImage: "cart") }.tint(.orange)
                }
            }
        }
    }
    
    // MARK: - Test & Finish
    private var testAndFinishSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                if setupMode == .single, let printer = settingsManager.activePrinter { testingPrinter = printer; showingTestDialog = true }
                if setupMode == .dual, let kitchen = settingsManager.kitchenPrinter { testingPrinter = kitchen; showingTestDialog = true }
            } label: {
                HStack {
                    Image(systemName: "testtube.2").foregroundColor(.blue)
                    Text("Test Assigned Printer(s)")
                }
            }
        }
    }
    
    // MARK: - Advanced (demoted)
    private var advancedSettingsSection: some View {
        VStack(spacing: 8) {
            NavigationLink(destination: PrintLanguageConfigView()) {
                HStack {
                    Image(systemName: "textformat").foregroundColor(.blue)
                    VStack(alignment: .leading) {
                        Text("Language Diagnostics")
                            .fontWeight(.medium)
                        Text("Check printer language support (EN/JA/VI)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").foregroundColor(.gray).font(.caption)
                }
            }
        }
    }
    
    // MARK: - Helper Views / Actions
    @ViewBuilder private func sectionHeader(icon: String, title: String, subtitle: String) -> some View {
        HStack { Image(systemName: icon).foregroundColor(.blue).font(.title3)
            VStack(alignment: .leading, spacing: 2) { Text(title).font(.headline); Text(subtitle).font(.caption).foregroundColor(.secondary) } }
    }
    
    private func testPrinter(_ printer: ConfiguredPrinter) async {
        do {
            let success = await PrinterService.shared.testPrintSampleForPrinter(printer, language: settingsManager.selectedReceiptLanguage)
            await MainActor.run { print(success ? "Test print successful!" : "Test print failed. Check printer connection.") }
        } catch {
            await MainActor.run { print("Test print failed: \(error.localizedDescription)") }
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
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .foregroundColor(isSelected ? .white : .blue)
                    .font(.title2)
                    .frame(width: 30)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.headline)
                        .foregroundColor(isSelected ? .white : .primary)
                    Text(description)
                        .font(.caption)
                        .foregroundColor(isSelected ? .white.opacity(0.8) : .secondary)
                        .multilineTextAlignment(.leading)
                }
                
                Spacer()
                
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.white)
                        .font(.title3)
                }
            }
            .padding()
            .background(isSelected ? Color.blue : Color.gray.opacity(0.1))
            .cornerRadius(12)
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
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(role)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .textCase(.uppercase)
                    Text(printer.name)
                        .font(.headline)
                    Text("\(printer.ipAddress):\(printer.port)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                HStack(spacing: 8) {
                    Button(action: onTest) {
                        Image(systemName: "testtube.2")
                            .foregroundColor(.blue)
                    }
                    .buttonStyle(BorderlessButtonStyle())
                    
                    Button(action: onEdit) {
                        Image(systemName: "pencil")
                            .foregroundColor(.orange)
                    }
                    .buttonStyle(BorderlessButtonStyle())
                    
                    Button(action: onRemove) {
                        Image(systemName: "trash")
                            .foregroundColor(.red)
                    }
                    .buttonStyle(BorderlessButtonStyle())
                }
            }
        }
        .padding()
        .background(Color.green.opacity(0.1))
        .cornerRadius(8)
    }
}

struct EmptyPrinterCard: View {
    let role: String
    let onAdd: () -> Void
    
    var body: some View {
        Button(action: onAdd) {
            VStack(spacing: 12) {
                Image(systemName: "plus.circle.dashed")
                    .font(.largeTitle)
                    .foregroundColor(.gray)
                
                VStack(spacing: 4) {
                    Text("Add \(role)")
                        .font(.headline)
                        .foregroundColor(.primary)
                    Text("Tap to configure a network printer")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.gray.opacity(0.1))
            .cornerRadius(8)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.gray.opacity(0.3), style: StrokeStyle(lineWidth: 1, dash: [5]))
            )
        }
        .buttonStyle(PlainButtonStyle())
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
import SwiftUI

struct PrinterSettingsView: View {
    @EnvironmentObject private var printerManager: PrinterManager
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @State private var showingConnectionAlert = false
    @State private var connectionMessage = ""
    @State private var isConnecting = false
    @State private var showingAllLogs = false // New state variable
    
    var body: some View {
        // Use NavigationStack for iOS 16+ or NavigationView with proper iPad handling
        if #available(iOS 16.0, *) {
            NavigationStack {
                mainContent
                    .navigationDestination(for: String.self) { destination in
                        if destination == "print-queue" {
                            PrintQueueView()
                        }
                    }
            }
            .navigationBarTitleDisplayMode(.inline) // Ensure inline title for consistency
        } else {
            NavigationView {
                mainContent
            }
            .navigationViewStyle(StackNavigationViewStyle()) // Force stack style on all devices
        }
    }
    
    private var mainContent: some View {
        List {
            // Quick Setup Section - Most important first
            Section(header: Text("printer_quick_setup_title".localized).font(.headline).foregroundColor(.primary)) {
                NavigationLink(destination: UnifiedPrinterSetupView().environmentObject(printerManager)) {
                    HStack {
                        Image(systemName: "gear.circle.fill")
                            .foregroundColor(.appPrimary)
                            .font(.title2)

                        VStack(alignment: .leading, spacing: 4) {
                            Text("printer_quick_setup_button".localized)
                                .font(.headline)
                                .fontWeight(.semibold)
                            Text("printer_quick_setup_subtitle".localized)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        setupStatusIndicator
                    }
                    .padding(.vertical, 4)
                }
            }

            // Current Configuration Section
            Section("printer_current_config_title".localized) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("printer_current_config_mode".localized)
                            .fontWeight(.medium)
                        Spacer()
                        Text(settingsManager.printerMode.displayName)
                            .foregroundColor(.secondary)
                    }

                    if settingsManager.printerMode == .dual {
                        HStack {
                            Text("printer_current_config_kitchen".localized)
                                .fontWeight(.medium)
                            Spacer()
                            Text(settingsManager.kitchenPrinter?.name ?? "printer_current_config_not_set".localized)
                                .foregroundColor(.secondary)
                        }

                        HStack {
                            Text("printer_current_config_checkout".localized)
                                .fontWeight(.medium)
                            Spacer()
                            Text(settingsManager.checkoutPrinter?.name ?? "printer_current_config_not_set".localized)
                                .foregroundColor(.secondary)
                        }
                    } else {
                        HStack {
                            Text("printer_current_config_active".localized)
                                .fontWeight(.medium)
                            Spacer()
                            Text(settingsManager.activePrinter?.name ?? "printer_current_config_not_set".localized)
                                .foregroundColor(.secondary)
                        }
                    }

                    HStack {
                        Text("printer_current_config_language".localized)
                            .fontWeight(.medium)
                        Spacer()
                        Text(settingsManager.printLanguage.displayName)
                            .foregroundColor(.secondary)
                    }
                }
                .padding(.vertical, 4)
            }

            // Printing format section
            Section("printer_printing_format_title".localized) {
                NavigationLink(destination: ReceiptCustomizationView()) {
                    HStack {
                        Image(systemName: "doc.badge.gearshape")
                            .foregroundColor(.appPrimary)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("receipt_customization".localized)
                                .font(.bodyMedium)
                                .fontWeight(.medium)
                            Text("configure_header_footer_templates_languages".localized)
                                .font(.caption)
                                .foregroundColor(.appTextSecondary)
                        }
                    }
                    .accessibilityLabel("receipt_customization".localized)
                }
            }
            
            // Print Queue Section
            Section("printer_print_queue_title".localized) {
                if #available(iOS 16.0, *) {
                    NavigationLink(value: "print-queue") {
                        HStack {
                            Image(systemName: "tray")
                                .foregroundColor(.appPrimary)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("accessibility_print_queue_label".localized)
                                    .font(.headline)
                                Text("printer_quick_setup_view_manage".localized)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            let queueManager = PrintQueueManager.shared
                            if queueManager.pendingJobsCount > 0 {
                                Text("\(queueManager.pendingJobsCount)")
                                    .font(.caption)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(Color.appWarning)
                                    .cornerRadius(10)
                            }
                        }
                    }
                    .accessibilityLabel("accessibility_print_queue_label".localized)
                    .accessibilityHint("accessibility_print_queue_hint".localized)
                } else {
                    NavigationLink(destination: PrintQueueView()) {
                        HStack {
                            Image(systemName: "tray")
                                .foregroundColor(.appPrimary)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("accessibility_print_queue_label".localized)
                                    .font(.headline)
                                Text("printer_quick_setup_view_manage".localized)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            let queueManager = PrintQueueManager.shared
                            if queueManager.pendingJobsCount > 0 {
                                Text("\(queueManager.pendingJobsCount)")
                                    .font(.caption)
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background(Color.appWarning)
                                    .cornerRadius(10)
                            }
                        }
                    }
                    .accessibilityLabel("accessibility_print_queue_label".localized)
                    .accessibilityHint("accessibility_print_queue_hint".localized)
                }
            }
            
            
            // Current Printer Status Section
            Section("printer_current_status_title".localized) {
                HStack {
                    Image(systemName: printerManager.isConnected ? "printer.fill" : "printer")
                        .foregroundColor(printerManager.isConnected ? .appSuccess : .appTextSecondary)
                        .accessibilityLabel(printerManager.isConnected ? "accessibility_printer_connected_label".localized : "accessibility_printer_disconnected_label".localized)
                    
                    VStack(alignment: .leading) {
                        Text("printer_status_label".localized)
                            .font(.headline)
                        Text(printerManager.printerStatus)
                            .font(.subheadline)
                            .foregroundColor(printerManager.isConnected ? .appSuccess : .appTextSecondary)
                    }
                    
                    Spacer()
                    
                    if printerManager.isConnected {
                        Button("printer_disconnect_button".localized) {
                            printerManager.disconnectPrinter()
                        }
                        .buttonStyle(.bordered)
                        .foregroundColor(.appError)
                        .accessibilityLabel("accessibility_disconnect_printer_label".localized)
                        .accessibilityHint("accessibility_disconnect_printer_hint".localized)
                    }
                }
                .padding(.vertical, 4)
            }
            
            // Test Printing Section (kept for convenience when connected)
            if printerManager.isConnected {
                Section("printer_test_printing_title".localized) {
                    Button(action: {
                        Task {
                            await testPrint()
                        }
                    }) {
                        HStack {
                            Image(systemName: "doc.text")
                            Text("printer_print_test_receipt_button".localized)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Button(action: {
                        Task {
                            await printKitchenTest()
                        }
                    }) {
                        HStack {
                            Image(systemName: "list.clipboard")
                            Text("printer_print_kitchen_test_button".localized)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
            
            // Print Logs Section
            if !printerManager.printLogs.isEmpty {
                Section("printer_print_logs_title".localized) {
                    ForEach(Array(printerManager.printLogs.suffix(5).enumerated()), id: \.offset) { index, log in
                        Text(log)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    if printerManager.printLogs.count > 5 {
                        Button("printer_view_all_logs_button".localized) {
                            showingAllLogs = true // Show the all logs view
                        }
                        .font(.caption)
                        .foregroundColor(.blue)
                    }
                }
            }
            
            
            // Error Message
            if let errorMessage = printerManager.errorMessage {
                Section("printer_error_title".localized) {
                    Text(errorMessage)
                        .foregroundColor(.red)
                        .font(.caption)
                }
            }
        }
        .navigationTitle("printer_settings_title".localized)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("printer_view_all_logs_button".localized) {
                    showingAllLogs = true // Show the all logs view
                }
                .fontWeight(.semibold)
            }
        }
        .alert("printer_connection_alert_title".localized, isPresented: $showingConnectionAlert) {
            Button("printer_alert_ok_button".localized) { }
        } message: {
            Text(connectionMessage)
        }
        .onAppear{
            // Keep discovery solely inside setup flow to reduce duplication
            // printerManager.checkAvailablePrinters()
        }
        .sheet(isPresented: $showingAllLogs) { // Add sheet modifier
            AllPrintLogsView(printerManager: printerManager)
        }
    }
    
    // MARK: - Computed Properties
    
    private var setupStatusIndicator: some View {
        let hasPrinters = !settingsManager.configuredPrinters.isEmpty
        let hasActivePrinter = settingsManager.activePrinter != nil

        return Group {
            if hasActivePrinter {
                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.appSuccess)
                        .font(.caption)
                    Text("printer_setup_complete".localized)
                        .font(.caption)
                        .foregroundColor(.appSuccess)
                        .fontWeight(.medium)
                }
            } else if hasPrinters {
                HStack(spacing: 4) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.appWarning)
                        .font(.caption)
                    Text("printer_setup_needs_setup".localized)
                        .font(.caption)
                        .foregroundColor(.appWarning)
                        .fontWeight(.medium)
                }
            } else {
                HStack(spacing: 4) {
                    Image(systemName: "plus.circle.fill")
                        .foregroundColor(.appInfo)
                        .font(.caption)
                    Text("printer_setup_get_started".localized)
                        .font(.caption)
                        .foregroundColor(.appInfo)
                        .fontWeight(.medium)
                }
            }
        }
    }
    
    private var printerModeRow: some View {
        HStack {
            Image(systemName: "gear")
                .foregroundColor(.blue)
            
            VStack(alignment: .leading, spacing: 2) {
                Text("printer_mode_title".localized)
                    .font(.headline)
                Text(settingsManager.printerMode.displayName)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if settingsManager.printerMode == .dual {
                dualModeInfo
            } else {
                Text("printer_mode_single_display".localized)
                    .font(.caption)
                    .foregroundColor(.orange)
            }
        }
    }
    
    private var dualModeInfo: some View {
        VStack(alignment: .trailing, spacing: 2) {
            Text("printer_mode_dual".localized)
                .font(.caption)
                .foregroundColor(.green)
            
            let kitchenPrinterName = settingsManager.kitchenPrinter?.name.prefix(8).description ?? "printer_mode_dual_none".localized
            Text(String(format: "printer_mode_dual_kitchen_prefix".localized, kitchenPrinterName))
                .font(.caption2)
                .foregroundColor(.secondary)
            
            let checkoutPrinterName = settingsManager.checkoutPrinter?.name.prefix(8).description ?? "printer_mode_dual_none".localized
            Text(String(format: "printer_mode_dual_checkout_prefix".localized, checkoutPrinterName))
                .font(.caption2)
                .foregroundColor(.secondary)
        }
    }
    
    // MARK: - Helper Functions
    
    private func connectToPrinter(_ printer: PrinterInfo) {
        isConnecting = true
        Task {
            await printerManager.connectToPrinter(printer)
            
            await MainActor.run {
                isConnecting = false
                connectionMessage = printerManager.isConnected
                    ? String(format: "printer_connection_success_message".localized, printer.name)
                    : String(format: "printer_connection_failed_message".localized, printer.name)
                showingConnectionAlert = true
            }
        }
    }
    
    private func testPrint() async {
        let success = await printerManager.printTestReceipt()
        
        await MainActor.run {
            connectionMessage = success
                ? "printer_test_receipt_success_alert".localized
                : "printer_test_receipt_failed_alert".localized
            showingConnectionAlert = true
        }
    }
    
    private func printKitchenTest() async {
        let success = await printerManager.printKitchenTestReceipt()
        
        await MainActor.run {
            connectionMessage = success
                ? "printer_kitchen_test_success_alert".localized
                : "printer_kitchen_test_failed_alert".localized
            showingConnectionAlert = true
        }
    }
}

struct PrinterRowView: View {
    let printer: PrinterInfo
    let isSelected: Bool
    let isConnecting: Bool
    let onConnect: () -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(printer.name)
                    .font(.headline)
                
                HStack {
                    Image(systemName: printer.type.icon)
                        .font(.caption)
                    Text(printer.type.displayName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if printer.type == .network {
                        Text("• \(printer.address)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Spacer()
            
            if isSelected && printer.isConnected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            } else if isConnecting {
                ProgressView()
                    .scaleEffect(0.8)
            }
            else {
                Button("printer_connect_button") {
                    onConnect()
                }
                .buttonStyle(.bordered)
                .foregroundColor(.appPrimary)
            }
        }
        .padding(.vertical, 4)
    }
}

struct ManualPrinterSetupView: View {
    let printerManager: PrinterManager
    
    @State private var printerName = ""
    @State private var ipAddress = ""
    @State private var port = "9100"
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        content
        .navigationTitle("manual_printer_setup_title".localized)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("printer_cancel_button".localized) {
                    presentationMode.wrappedValue.dismiss()
                }
            }
        }
    }

    private var content: some View {
        Form {
            Section("manual_printer_setup_printer_info_title".localized) {
                TextField("manual_printer_setup_printer_name_label".localized, text: $printerName)
                TextField("manual_printer_setup_ip_address_label".localized, text: $ipAddress)
                    .keyboardType(.numbersAndPunctuation)
                TextField("manual_printer_setup_port_label".localized, text: $port)
                    .keyboardType(.numberPad)
            }
            
            Section("manual_printer_setup_connection_title".localized) {
                Button("manual_printer_setup_add_button".localized) {
                    addNetworkPrinter()
                }
                .disabled(printerName.isEmpty || ipAddress.isEmpty)
            }
            
            Section {
                Text("manual_printer_setup_help_text".localized)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
    
    private func addNetworkPrinter() {
        let newPrinter = PrinterInfo(
            id: ipAddress,
            name: printerName,
            type: .network,
            address: "\(ipAddress):\(port)",
            isConnected: false
        )
        
        // In a real app, you would add this to the printer manager's available printers
        // and save it to UserDefaults or another persistence mechanism
        
        presentationMode.wrappedValue.dismiss()
    }
}

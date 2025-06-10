import SwiftUI

struct PrinterSettingsView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @StateObject private var printerManager = PrinterManager()
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @State private var showingConnectionAlert = false
    @State private var connectionMessage = ""
    @State private var isConnecting = false
    
    var body: some View {
        // Use NavigationStack for iOS 16+ or NavigationView with proper iPad handling
        if #available(iOS 16.0, *) {
            NavigationStack {
                mainContent
            }
        } else {
            NavigationView {
                // Empty sidebar for iPad to force content to main area
                if UIDevice.current.userInterfaceIdiom == .pad {
                    Text("printer_settings".localized)
                        .navigationBarHidden(true)
                }
                
                mainContent
                    .navigationViewStyle(StackNavigationViewStyle()) // Force stack style
            }
            .navigationViewStyle(StackNavigationViewStyle()) // Ensure stack style on iPad
        }
    }
    
    private var mainContent: some View {
        List {
            // Printer Mode Selection Section - NEW
            Section("printer_config_title".localized) {
                NavigationLink(destination: PrinterModeSelectionView()) {
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
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("printer_mode_dual".localized)
                                    .font(.caption)
                                    .foregroundColor(.green)
                                Text(String(format: "printer_mode_dual_kitchen_prefix".localized, settingsManager.kitchenPrinter?.name.prefix(8) ?? "printer_mode_dual_none".localized))
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                                Text(String(format: "printer_mode_dual_checkout_prefix".localized, settingsManager.checkoutPrinter?.name.prefix(8) ?? "printer_mode_dual_none".localized))
                                    .font(.caption2)
                                    .foregroundColor(.secondary)
                            }
                        } else {
                            Text("printer_mode_single".localized)
                                .font(.caption)
                                .foregroundColor(.orange)
                        }
                    }
                }
            }
            
            // Current Printer Status Section
            Section("printer_current_status_title".localized) {
                HStack {
                    Image(systemName: printerManager.isConnected ? "printer.fill" : "printer")
                        .foregroundColor(printerManager.isConnected ? .green : .gray)
                    
                    VStack(alignment: .leading) {
                        Text("printer_status_title".localized)
                            .font(.headline)
                        Text(printerManager.printerStatus)
                            .font(.subheadline)
                            .foregroundColor(printerManager.isConnected ? .green : .secondary)
                    }
                    
                    Spacer()
                    
                    if printerManager.isConnected {
                        Button("printer_disconnect_button".localized) {
                            printerManager.disconnectPrinter()
                        }
                        .buttonStyle(.bordered)
                        .foregroundColor(.red)
                    }
                }
                .padding(.vertical, 4)
            }
            
            // Available Printers Section
            Section("printer_available_printers_title".localized) {
                if printerManager.availablePrinters.isEmpty {
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.gray)
                        Text("printer_no_printers_found".localized)
                            .foregroundColor(.secondary)
                        
                        Spacer()
                        
                        Button("printer_scan_button".localized) {
                            printerManager.checkAvailablePrinters()
                        }
                        .buttonStyle(.bordered)
                    }
                    .padding(.vertical, 4)
                } else {
                    ForEach(printerManager.availablePrinters) { printer in
                        PrinterRowView(
                            printer: printer,
                            isSelected: printerManager.selectedPrinter?.id == printer.id,
                            isConnecting: isConnecting
                        ) {
                            connectToPrinter(printer)
                        }
                    }
                }
                
                Button("printer_refresh_printers_button".localized) {
                    printerManager.checkAvailablePrinters()
                }
                .foregroundColor(.blue)
            }
            
            // Test Printing Section
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
                    ForEach(printerManager.printLogs.suffix(5), id: \.self) { log in
                        Text(log)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    
                    if printerManager.printLogs.count > 5 {
                        Button("printer_view_all_logs_button".localized) {
                            // Show all logs in a separate view
                        }
                        .font(.caption)
                        .foregroundColor(.blue)
                    }
                }
            }
            
            // Manual Printer Setup Section
            Section("printer_manual_setup_title".localized) {
                if #available(iOS 16.0, *) {
                    NavigationLink(value: "manual-setup") {
                        HStack {
                            Image(systemName: "plus")
                            Text("printer_add_network_printer_button".localized)
                        }
                    }
                } else {
                    NavigationLink(destination: ManualPrinterSetupView(printerManager: printerManager)) {
                        HStack {
                            Image(systemName: "plus")
                            Text("printer_add_network_printer_button".localized)
                        }
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
        .navigationTitle("printer_settings".localized)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("done".localized) {
                    // This would dismiss the view in a navigation context
                }
            }
        }
        .alert("printer_connection_alert_title".localized, isPresented: $showingConnectionAlert) {
            Button("ok".localized) { }
        } message: {
            Text(connectionMessage)
        }
        .onAppear {
            printerManager.checkAvailablePrinters()
        }
        .navigationDestination(for: String.self) { destination in
            if destination == "manual-setup" {
                ManualPrinterSetupView(printerManager: printerManager)
            }
        }
    }
    
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
    @EnvironmentObject private var localizationManager: LocalizationManager
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
            
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            } else if isConnecting {
                ProgressView()
                    .scaleEffect(0.8)
            } else {
                Button("printer_connect_button".localized) {
                    onConnect()
                }
                .buttonStyle(.bordered)
                .foregroundColor(.blue)
            }
        }
        .padding(.vertical, 4)
    }
}

struct ManualPrinterSetupView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    let printerManager: PrinterManager
    
    @State private var printerName = ""
    @State private var ipAddress = ""
    @State private var port = "9100"
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            Form {
                Section("printer_manual_setup_printer_info_title".localized) {
                    TextField("printer_manual_setup_printer_name_label".localized, text: $printerName)
                    TextField("printer_manual_setup_ip_address_label".localized, text: $ipAddress)
                        .keyboardType(.numbersAndPunctuation)
                    TextField("printer_manual_setup_port_label".localized, text: $port)
                        .keyboardType(.numberPad)
                }
                
                Section("printer_connecting_status".localized) { // Assuming this key is appropriate for the section title
                    Button("printer_manual_setup_add_button".localized) {
                        addNetworkPrinter()
                    }
                    .disabled(printerName.isEmpty || ipAddress.isEmpty)
                }
                
                Section {
                    Text("printer_manual_setup_help_text".localized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("printer_add_network_printer_button".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("cancel".localized) {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
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

#Preview {
    PrinterSettingsView()
}
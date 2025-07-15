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
                        if destination == "manual-setup" {
                            ManualPrinterSetupView(printerManager: printerManager)
                        } else if destination == "receipt-header" {
                            ReceiptHeaderConfigView()
                        } else if destination == "print-language" {
                            PrintLanguageConfigView()
                        }
                    }
            }
            .navigationBarTitleDisplayMode(.inline) // Ensure inline title for consistency
        } else {
            NavigationView {
                // Empty sidebar for iPad to force content to main area
                if UIDevice.current.userInterfaceIdiom == .pad {
                    Text("printer_settings_title")
                        .navigationBarHidden(true)
                }
                
                mainContent
            }
            .navigationViewStyle(StackNavigationViewStyle()) // Ensure stack style on iPad
        }
    }
    
    private var mainContent: some View {
        List {
            // Printer Mode Selection Section
            Section("printer_configuration_title".localized) {
                NavigationLink(destination: PrinterModeSelectionView()) {
                    printerModeRow
                }
            }
            
            // Receipt Header Configuration Section
            Section("receipt_header_title".localized) {
                if #available(iOS 16.0, *) {
                    NavigationLink(value: "receipt-header") {
                        HStack {
                            Image(systemName: "doc.text")
                                .foregroundColor(.blue)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("receipt_header_title".localized)
                                    .font(.headline)
                                Text(settingsManager.receiptHeader.restaurantName.isEmpty ? "receipt_header_restaurant_name_label".localized : settingsManager.receiptHeader.restaurantName)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                } else {
                    NavigationLink(destination: ReceiptHeaderConfigView()) {
                        HStack {
                            Image(systemName: "doc.text")
                                .foregroundColor(.blue)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("receipt_header_title".localized)
                                    .font(.headline)
                                Text(settingsManager.receiptHeader.restaurantName.isEmpty ? "receipt_header_restaurant_name_label".localized : settingsManager.receiptHeader.restaurantName)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
            }
            
            // Print Language Configuration Section
            Section("print_language_title".localized) {
                if #available(iOS 16.0, *) {
                    NavigationLink(value: "print-language") {
                        HStack {
                            Image(systemName: "textformat")
                                .foregroundColor(.blue)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("print_language_selection_label".localized)
                                    .font(.headline)
                                Text(settingsManager.printLanguage.displayName)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            if !settingsManager.printLanguage.isPrinterSupported {
                                Image(systemName: "exclamationmark.triangle")
                                    .foregroundColor(.orange)
                                    .font(.caption)
                            }
                        }
                    }
                } else {
                    NavigationLink(destination: PrintLanguageConfigView()) {
                        HStack {
                            Image(systemName: "textformat")
                                .foregroundColor(.blue)
                            
                            VStack(alignment: .leading, spacing: 2) {
                                Text("print_language_selection_label".localized)
                                    .font(.headline)
                                Text(settingsManager.printLanguage.displayName)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            
                            Spacer()
                            
                            if !settingsManager.printLanguage.isPrinterSupported {
                                Image(systemName: "exclamationmark.triangle")
                                    .foregroundColor(.orange)
                                    .font(.caption)
                            }
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
                        Text("printer_status_label".localized)
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
                    VStack(alignment: .center) {
                        Image(systemName: "magnifyingglass")
                            .font(.largeTitle)
                            .foregroundColor(.gray)
                            .padding(.bottom, 2)
                        Text("printer_no_printers_found".localized)
                            .foregroundColor(.secondary)
                        Text("printer_scans_for_network_and_bluetooth".localized) // New localized string
                            .font(.caption)
                            .foregroundColor(.gray)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
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
                
                // Unified and styled refresh button
                HStack {
                    Spacer()
                    Button(action: {
                        printerManager.checkAvailablePrinters()
                    }) {
                        Label("printer_refresh_printers_button".localized, systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.bordered)
                    .foregroundColor(.blue)
                    Spacer()
                }
                .padding(.top, printerManager.availablePrinters.isEmpty ? 4 : 8) // Adjust padding based on content
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
            printerManager.checkAvailablePrinters()
        }
        .sheet(isPresented: $showingAllLogs) { // Add sheet modifier
            AllPrintLogsView(printerManager: printerManager)
        }
    }
    
    // MARK: - Computed Properties
    
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
                .foregroundColor(.blue)
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

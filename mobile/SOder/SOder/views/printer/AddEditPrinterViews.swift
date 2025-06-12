import SwiftUI

struct AddPrinterView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @Environment(\.presentationMode) var presentationMode
    
    @State private var printerName = ""
    @State private var ipAddress = ""
    @State private var port = "9100"
    @State private var printerType: ConfiguredPrinterType = .receipt
    @State private var connectionTimeout = 5.0
    @State private var maxRetries = 3
    @State private var notes = ""
    @State private var isTestingConnection = false
    @State private var testResult: String?
    @State private var validationErrors: [String] = []
    
    var body: some View {
        NavigationView {
            Form {
                Section("printer_add_edit_info_title".localized) {
                    TextField("printer_add_edit_name_label".localized, text: $printerName)
                        .autocorrectionDisabled()
                    
                    Picker("printer_add_edit_type_label".localized, selection: $printerType) {
                        ForEach(ConfiguredPrinterType.allCases, id: \.self) { type in
                            HStack {
                                Image(systemName: type.icon)
                                Text(type.displayName)
                            }
                            .tag(type)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
                
                Section("printer_add_edit_network_settings_title".localized) {
                    TextField("printer_add_edit_ip_address_label".localized, text: $ipAddress)
                        .keyboardType(.decimalPad)
                        .autocorrectionDisabled()
                    
                    TextField("printer_add_edit_port_label".localized, text: $port)
                        .keyboardType(.numberPad)
                }
                
                Section("printer_add_edit_advanced_settings_title".localized) {
                    VStack(alignment: .leading) {
                        Text(String(format: "printer_add_edit_connection_timeout_label".localized, Int(connectionTimeout)))
                            .font(.caption)
                        Slider(value: $connectionTimeout, in: 1...30, step: 1)
                    }
                    
                    VStack(alignment: .leading) {
                        Text(String(format: "printer_add_edit_max_retries_label".localized, maxRetries))
                            .font(.caption)
                        Slider(value: .init(
                            get: { Double(maxRetries) },
                            set: { maxRetries = Int($0) }
                        ), in: 1...10, step: 1)
                    }
                }
                
                Section("printer_add_edit_notes_title".localized) {
                    TextField("printer_add_edit_notes_placeholder".localized, text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }
                
                // Validation Errors
                if !validationErrors.isEmpty {
                    Section("printer_add_edit_issues_title".localized) {
                        ForEach(validationErrors, id: \.self) { error in
                            Text(error)
                                .foregroundColor(.red)
                                .font(.caption)
                        }
                    }
                }
                
                // Test Connection
                Section("printer_add_edit_test_connection_title".localized) {
                    Button(action: testConnection) {
                        HStack {
                            if isTestingConnection {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("printer_add_edit_testing_button".localized)
                            } else {
                                Image(systemName: "network")
                                Text("printer_add_edit_test_connection_button".localized)
                            }
                        }
                    }
                    .disabled(isTestingConnection || ipAddress.isEmpty || port.isEmpty)
                    
                    if let testResult = testResult {
                        Text(testResult)
                            .font(.caption)
                            .foregroundColor(testResult.contains("✅") ? .green : .red)
                    }
                }
                
                Section {
                    Text("printer_add_edit_help_text".localized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("printer_add_title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("cancel".localized) {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("save".localized) {
                        savePrinter()
                    }
                    .disabled(!isValidInput())
                }
            }
        }
    }
    
    private func isValidInput() -> Bool {
        !printerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !ipAddress.isEmpty &&
        !port.isEmpty &&
        validationErrors.isEmpty
    }
    
    private func validateInput() {
        let printer = ConfiguredPrinter(
            name: printerName.trimmingCharacters(in: .whitespacesAndNewlines),
            ipAddress: ipAddress.trimmingCharacters(in: .whitespacesAndNewlines),
            port: Int(port) ?? 9100,
            connectionTimeout: connectionTimeout,
            maxRetries: maxRetries,
            printerType: printerType,
            notes: notes.isEmpty ? nil : notes
        )
        
        validationErrors = settingsManager.validatePrinterConfig(printer)
    }
    
    private func testConnection() {
        guard !ipAddress.isEmpty, let portInt = Int(port) else { return }
        
        isTestingConnection = true
        testResult = nil
        
        Task {
            let printerConfig = PrinterConfig.Hardware(
                ipAddress: ipAddress.trimmingCharacters(in: .whitespacesAndNewlines),
                port: portInt,
                name: printerName.trimmingCharacters(in: .whitespacesAndNewlines),
                connectionTimeout: connectionTimeout,
                maxRetries: maxRetries
            )
            
            let success = await PrinterService.shared.testConnection(to: printerConfig)
            
            await MainActor.run {
                isTestingConnection = false
                testResult = success ? "printer_add_edit_connection_success_alert".localized : "printer_add_edit_connection_failed_alert".localized
            }
        }
    }
    
    private func savePrinter() {
        validateInput()
        guard validationErrors.isEmpty else { return }
        
        let printer = ConfiguredPrinter(
            name: printerName.trimmingCharacters(in: .whitespacesAndNewlines),
            ipAddress: ipAddress.trimmingCharacters(in: .whitespacesAndNewlines),
            port: Int(port) ?? 9100,
            connectionTimeout: connectionTimeout,
            maxRetries: maxRetries,
            printerType: printerType,
            notes: notes.isEmpty ? nil : notes
        )
        
        settingsManager.addPrinter(printer)
        
        // If this is the first printer, make it active
        if settingsManager.configuredPrinters.count == 1 {
            settingsManager.setActivePrinter(printer)
        }
        
        presentationMode.wrappedValue.dismiss()
    }
}

struct EditPrinterView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @Environment(\.presentationMode) var presentationMode
    
    let originalPrinter: ConfiguredPrinter
    
    @State private var printerName: String
    @State private var ipAddress: String
    @State private var port: String
    @State private var printerType: ConfiguredPrinterType
    @State private var connectionTimeout: Double
    @State private var maxRetries: Int
    @State private var notes: String
    @State private var isTestingConnection = false
    @State private var testResult: String?
    @State private var validationErrors: [String] = []
    
    init(printer: ConfiguredPrinter) {
        self.originalPrinter = printer
        self._printerName = State(initialValue: printer.name)
        self._ipAddress = State(initialValue: printer.ipAddress)
        self._port = State(initialValue: String(printer.port))
        self._printerType = State(initialValue: printer.printerType)
        self._connectionTimeout = State(initialValue: printer.connectionTimeout)
        self._maxRetries = State(initialValue: printer.maxRetries)
        self._notes = State(initialValue: printer.notes ?? "")
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("printer_add_edit_info_title".localized) {
                    TextField("printer_add_edit_name_label".localized, text: $printerName)
                        .autocorrectionDisabled()
                    
                    Picker("printer_add_edit_type_label".localized, selection: $printerType) {
                        ForEach(ConfiguredPrinterType.allCases, id: \.self) { type in
                            HStack {
                                Image(systemName: type.icon)
                                Text(type.displayName)
                            }
                            .tag(type)
                        }
                    }
                    .pickerStyle(SegmentedPickerStyle())
                }
                
                Section("printer_add_edit_network_settings_title".localized) {
                    TextField("printer_add_edit_ip_address_label".localized, text: $ipAddress)
                        .keyboardType(.decimalPad)
                        .autocorrectionDisabled()
                    
                    TextField("printer_add_edit_port_label".localized, text: $port)
                        .keyboardType(.numberPad)
                }
                
                Section("printer_add_edit_advanced_settings_title".localized) {
                    VStack(alignment: .leading) {
                        Text(String(format: "printer_add_edit_connection_timeout_label".localized, Int(connectionTimeout)))
                            .font(.caption)
                        Slider(value: $connectionTimeout, in: 1...30, step: 1)
                    }
                    
                    VStack(alignment: .leading) {
                        Text(String(format: "printer_add_edit_max_retries_label".localized, maxRetries))
                            .font(.caption)
                        Slider(value: .init(
                            get: { Double(maxRetries) },
                            set: { maxRetries = Int($0) }
                        ), in: 1...10, step: 1)
                    }
                }
                
                Section("printer_add_edit_notes_title".localized) {
                    TextField("printer_add_edit_notes_placeholder".localized, text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }
                
                // Validation Errors
                if !validationErrors.isEmpty {
                    Section("printer_add_edit_issues_title".localized) {
                        ForEach(validationErrors, id: \.self) { error in
                            Text(error)
                                .foregroundColor(.red)
                                .font(.caption)
                        }
                    }
                }
                
                // Test Connection
                Section("printer_add_edit_test_connection_title".localized) {
                    Button(action: testConnection) {
                        HStack {
                            if isTestingConnection {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("printer_add_edit_testing_button".localized)
                            } else {
                                Image(systemName: "network")
                                Text("printer_add_edit_test_connection_button".localized)
                            }
                        }
                    }
                    .disabled(isTestingConnection || ipAddress.isEmpty || port.isEmpty)
                    
                    if let testResult = testResult {
                        Text(testResult)
                            .font(.caption)
                            .foregroundColor(testResult.contains("✅") ? .green : .red)
                    }
                }
            }
            .navigationTitle("printer_edit_title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("cancel".localized) {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("save".localized) {
                        savePrinter()
                    }
                    .disabled(!isValidInput())
                }
            }
        }
    }
    
    private func isValidInput() -> Bool {
        !printerName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !ipAddress.isEmpty &&
        !port.isEmpty &&
        validationErrors.isEmpty
    }
    
    private func validateInput() {
        let printer = ConfiguredPrinter(
            id: originalPrinter.id,
            name: printerName.trimmingCharacters(in: .whitespacesAndNewlines),
            ipAddress: ipAddress.trimmingCharacters(in: .whitespacesAndNewlines),
            port: Int(port) ?? 9100,
            connectionTimeout: connectionTimeout,
            maxRetries: maxRetries,
            printerType: printerType,
            notes: notes.isEmpty ? nil : notes
        )
        
        validationErrors = settingsManager.validatePrinterConfig(printer)
    }
    
    private func testConnection() {
        guard !ipAddress.isEmpty, let portInt = Int(port) else { return }
        
        isTestingConnection = true
        testResult = nil
        
        Task {
            let printerConfig = PrinterConfig.Hardware(
                ipAddress: ipAddress.trimmingCharacters(in: .whitespacesAndNewlines),
                port: portInt,
                name: printerName.trimmingCharacters(in: .whitespacesAndNewlines),
                connectionTimeout: connectionTimeout,
                maxRetries: maxRetries
            )
            
            let success = await PrinterService.shared.testConnection(to: printerConfig)
            
            await MainActor.run {
                isTestingConnection = false
                testResult = success ? "printer_add_edit_connection_success_alert".localized : "printer_add_edit_connection_failed_alert".localized
            }
        }
    }
    
    private func savePrinter() {
        validateInput()
        guard validationErrors.isEmpty else { return }
        
        let updatedPrinter = ConfiguredPrinter(
            id: originalPrinter.id,
            name: printerName.trimmingCharacters(in: .whitespacesAndNewlines),
            ipAddress: ipAddress.trimmingCharacters(in: .whitespacesAndNewlines),
            port: Int(port) ?? 9100,
            connectionTimeout: connectionTimeout,
            maxRetries: maxRetries,
            printerType: printerType,
            notes: notes.isEmpty ? nil : notes
        )
        
        settingsManager.updatePrinter(updatedPrinter)
        presentationMode.wrappedValue.dismiss()
    }
}

struct RestaurantSettingsView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @Environment(\.presentationMode) var presentationMode
    
    @State private var restaurantName: String
    @State private var address: String
    @State private var phone: String
    @State private var website: String
    @State private var dateTimeFormat: String
    
    init() {
        let settings = PrinterSettingsManager.shared.restaurantSettings
        self._restaurantName = State(initialValue: settings.name)
        self._address = State(initialValue: settings.address)
        self._phone = State(initialValue: settings.phone)
        self._website = State(initialValue: settings.website)
        self._dateTimeFormat = State(initialValue: settings.dateTimeFormat)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section("restaurant_settings_info_title".localized) {
                    TextField("restaurant_settings_name_label".localized, text: $restaurantName)
                        .autocorrectionDisabled()
                    
                    TextField("restaurant_settings_address_label".localized, text: $address, axis: .vertical)
                        .lineLimit(2...3)
                        .autocorrectionDisabled()
                    
                    TextField("restaurant_settings_phone_label".localized, text: $phone)
                        .keyboardType(.phonePad)
                        .autocorrectionDisabled()
                    
                    TextField("restaurant_settings_website_label".localized, text: $website)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
                
                Section("restaurant_settings_receipt_title".localized) {
                    TextField("restaurant_settings_datetime_format_label".localized, text: $dateTimeFormat)
                        .autocorrectionDisabled()
                    
                    Text(String(format: "restaurant_settings_datetime_format_current".localized, formatExample))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section("restaurant_settings_preview_title".localized) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(restaurantName.isEmpty ? "restaurant_settings_preview_name_placeholder".localized : restaurantName)
                            .font(.headline)
                        if !address.isEmpty {
                            Text(address)
                                .font(.caption)
                        }
                        if !phone.isEmpty {
                            Text(String(format: "restaurant_settings_preview_phone_prefix".localized, phone))
                                .font(.caption)
                        }
                        if !website.isEmpty {
                            Text(website)
                                .font(.caption)
                        }
                    }
                    .padding(.vertical, 4)
                    .foregroundColor(.secondary)
                }
                
                Section {
                    Text("restaurant_settings_help_text".localized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("restaurant_settings_title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("cancel".localized) {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("save".localized) {
                        saveSettings()
                    }
                }
            }
        }
    }
    
    private var formatExample: String {
        let formatter = DateFormatter()
        formatter.dateFormat = dateTimeFormat.isEmpty ? "yyyy-MM-dd HH:mm:ss" : dateTimeFormat
        return formatter.string(from: Date())
    }
    
    private func saveSettings() {
        let newSettings = RestaurantSettings(
            name: restaurantName.trimmingCharacters(in: .whitespacesAndNewlines),
            address: address.trimmingCharacters(in: .whitespacesAndNewlines),
            phone: phone.trimmingCharacters(in: .whitespacesAndNewlines),
            website: website.trimmingCharacters(in: .whitespacesAndNewlines),
            dateTimeFormat: dateTimeFormat.isEmpty ? "yyyy-MM-dd HH:mm:ss" : dateTimeFormat
        )
        
        settingsManager.updateRestaurantSettings(newSettings)
        presentationMode.wrappedValue.dismiss()
    }
}

#Preview("Add Printer") {
    AddPrinterView()
}

#Preview("Restaurant Settings") {
    RestaurantSettingsView()
}
import SwiftUI

struct AddPrinterView: View {
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
                Section("Printer Information") {
                    TextField("Printer Name", text: $printerName)
                        .autocorrectionDisabled()
                    
                    Picker("Printer Type", selection: $printerType) {
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
                
                Section("Network Settings") {
                    TextField("IP Address", text: $ipAddress)
                        .keyboardType(.decimalPad)
                        .autocorrectionDisabled()
                    
                    TextField("Port", text: $port)
                        .keyboardType(.numberPad)
                }
                
                Section("Advanced Settings") {
                    VStack(alignment: .leading) {
                        Text("Connection Timeout: \(Int(connectionTimeout)) seconds")
                            .font(.caption)
                        Slider(value: $connectionTimeout, in: 1...30, step: 1)
                    }
                    
                    VStack(alignment: .leading) {
                        Text("Max Retries: \(maxRetries)")
                            .font(.caption)
                        Slider(value: .init(
                            get: { Double(maxRetries) },
                            set: { maxRetries = Int($0) }
                        ), in: 1...10, step: 1)
                    }
                }
                
                Section("Notes (Optional)") {
                    TextField("Add notes about this printer...", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }
                
                // Validation Errors
                if !validationErrors.isEmpty {
                    Section("Issues") {
                        ForEach(validationErrors, id: \.self) { error in
                            Text(error)
                                .foregroundColor(.red)
                                .font(.caption)
                        }
                    }
                }
                
                // Test Connection
                Section("Test Connection") {
                    Button(action: testConnection) {
                        HStack {
                            if isTestingConnection {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Testing...")
                            } else {
                                Image(systemName: "network")
                                Text("Test Connection")
                            }
                        }
                    }
                    .disabled(isTestingConnection || ipAddress.isEmpty || port.isEmpty)
                    
                    if let testResult = testResult {
                        Text(testResult)
                            .font(.caption)
                            .foregroundColor(testResult.contains("Success") ? .green : .red)
                    }
                }
                
                Section {
                    Text("Make sure your printer is connected to the same network and supports ESC/POS commands. Most thermal receipt printers use port 9100.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Add Printer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
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
                testResult = success ? "✅ Connection successful!" : "❌ Connection failed"
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
                Section("Printer Information") {
                    TextField("Printer Name", text: $printerName)
                        .autocorrectionDisabled()
                    
                    Picker("Printer Type", selection: $printerType) {
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
                
                Section("Network Settings") {
                    TextField("IP Address", text: $ipAddress)
                        .keyboardType(.decimalPad)
                        .autocorrectionDisabled()
                    
                    TextField("Port", text: $port)
                        .keyboardType(.numberPad)
                }
                
                Section("Advanced Settings") {
                    VStack(alignment: .leading) {
                        Text("Connection Timeout: \(Int(connectionTimeout)) seconds")
                            .font(.caption)
                        Slider(value: $connectionTimeout, in: 1...30, step: 1)
                    }
                    
                    VStack(alignment: .leading) {
                        Text("Max Retries: \(maxRetries)")
                            .font(.caption)
                        Slider(value: .init(
                            get: { Double(maxRetries) },
                            set: { maxRetries = Int($0) }
                        ), in: 1...10, step: 1)
                    }
                }
                
                Section("Notes (Optional)") {
                    TextField("Add notes about this printer...", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }
                
                // Validation Errors
                if !validationErrors.isEmpty {
                    Section("Issues") {
                        ForEach(validationErrors, id: \.self) { error in
                            Text(error)
                                .foregroundColor(.red)
                                .font(.caption)
                        }
                    }
                }
                
                // Test Connection
                Section("Test Connection") {
                    Button(action: testConnection) {
                        HStack {
                            if isTestingConnection {
                                ProgressView()
                                    .scaleEffect(0.8)
                                Text("Testing...")
                            } else {
                                Image(systemName: "network")
                                Text("Test Connection")
                            }
                        }
                    }
                    .disabled(isTestingConnection || ipAddress.isEmpty || port.isEmpty)
                    
                    if let testResult = testResult {
                        Text(testResult)
                            .font(.caption)
                            .foregroundColor(testResult.contains("Success") ? .green : .red)
                    }
                }
            }
            .navigationTitle("Edit Printer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
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
                testResult = success ? "✅ Connection successful!" : "❌ Connection failed"
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
                Section("Restaurant Information") {
                    TextField("Restaurant Name", text: $restaurantName)
                        .autocorrectionDisabled()
                    
                    TextField("Address", text: $address, axis: .vertical)
                        .lineLimit(2...3)
                        .autocorrectionDisabled()
                    
                    TextField("Phone Number", text: $phone)
                        .keyboardType(.phonePad)
                        .autocorrectionDisabled()
                    
                    TextField("Website", text: $website)
                        .keyboardType(.URL)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                }
                
                Section("Receipt Settings") {
                    TextField("Date/Time Format", text: $dateTimeFormat)
                        .autocorrectionDisabled()
                    
                    Text("Current format: \(formatExample)")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section("Preview") {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(restaurantName.isEmpty ? "Restaurant Name" : restaurantName)
                            .font(.headline)
                        if !address.isEmpty {
                            Text(address)
                                .font(.caption)
                        }
                        if !phone.isEmpty {
                            Text("Tel: \(phone)")
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
                    Text("This information will appear on printed receipts and kitchen orders.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Restaurant Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
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
import Foundation
import Network
import ExternalAccessory

@MainActor
class PrinterManager: ObservableObject {
    @Published var isConnected = false
    @Published var printerStatus = "Disconnected"
    @Published var availablePrinters: [PrinterInfo] = []
    @Published var selectedPrinter: PrinterInfo?
    @Published var errorMessage: String?
    @Published var printLogs: [String] = []
    @Published var printedOrders: [Order] = []
    
    private let printerService = PrinterService.shared
    private let settingsManager = PrinterSettingsManager.shared
    private var networkMonitor: NWPathMonitor?
    private var bluetoothAccessory: EAAccessory?
    
    init() {
        checkAvailablePrinters()
        startNetworkMonitoring()
        loadSavedPrinter()
    }
    
    // MARK: - Printer Discovery
    func checkAvailablePrinters() {
        availablePrinters = []
        
        // Add user-configured printers first
        for configuredPrinter in settingsManager.configuredPrinters {
            let printerInfo = PrinterInfo(
                id: configuredPrinter.id,
                name: configuredPrinter.name,
                type: .network,
                address: "\(configuredPrinter.ipAddress):\(configuredPrinter.port)",
                isConnected: false
            )
            availablePrinters.append(printerInfo)
        }
        
        // Add default printer only if no user-configured printers exist
        if !settingsManager.hasUserConfiguredPrinters() {
            let config = PrinterConfig.shared.defaultPrinter
            let defaultPrinter = PrinterInfo(
                id: "default-\(config.ipAddress)",
                name: "\(config.name) (Default)",
                type: .network,
                address: "\(config.ipAddress):\(config.port)",
                isConnected: false
            )
            availablePrinters.append(defaultPrinter)
            addLog("Using default printer configuration - configure your own printer in settings")
        }
        
        // Check for Bluetooth printers
        checkBluetoothPrinters()
    }
    
    private func checkBluetoothPrinters() {
        let accessories = EAAccessoryManager.shared().connectedAccessories
        
        for accessory in accessories {
            // Look for printer accessories
            if accessory.protocolStrings.contains(where: { $0.contains("com.star-m") || $0.contains("bluetooth") }) {
                let printerInfo = PrinterInfo(
                    id: accessory.serialNumber,
                    name: accessory.name,
                    type: .bluetooth,
                    address: accessory.serialNumber,
                    isConnected: accessory.isConnected
                )
                availablePrinters.append(printerInfo)
            }
        }
    }
    
    // MARK: - Printer Connection
    func connectToPrinter(_ printer: PrinterInfo) async {
        selectedPrinter = printer
        printerStatus = "Connecting..."
        errorMessage = nil
        
        do {
            switch printer.type {
            case .network:
                try await connectNetworkPrinter(printer)
            case .bluetooth:
                try await connectBluetoothPrinter(printer)
            }
            
            isConnected = true
            printerStatus = "Connected to \(printer.name)"
            savePrinter(printer)
            addLog("Connected to \(printer.name)")
            
            // Update settings manager if this is a configured printer
            if let configuredPrinter = settingsManager.configuredPrinters.first(where: { $0.id == printer.id }) {
                settingsManager.setActivePrinter(configuredPrinter)
            }
        } catch {
            isConnected = false
            printerStatus = "Failed to connect"
            errorMessage = error.localizedDescription
            addLog("Connection failed: \(error.localizedDescription)")
        }
    }
    
    private func connectNetworkPrinter(_ printer: PrinterInfo) async throws {
        let components = printer.address.components(separatedBy: ":")
        guard components.count == 2,
              let port = Int(components[1]) else {
            throw PrinterError.configurationError("Invalid printer address format")
        }
        
        // Use configured printer settings if available, otherwise use defaults
        let printerConfig: PrinterConfig.Hardware
        if let configuredPrinter = settingsManager.configuredPrinters.first(where: { $0.id == printer.id }) {
            printerConfig = PrinterConfig.Hardware(
                ipAddress: configuredPrinter.ipAddress,
                port: configuredPrinter.port,
                name: configuredPrinter.name,
                connectionTimeout: configuredPrinter.connectionTimeout,
                maxRetries: configuredPrinter.maxRetries
            )
        } else {
            printerConfig = PrinterConfig.Hardware(
                ipAddress: components[0],
                port: port,
                name: printer.name,
                connectionTimeout: 5.0,
                maxRetries: 3
            )
        }
        
        let isReachable = await printerService.testConnection(to: printerConfig)
        if !isReachable {
            throw PrinterError.connectionFailed(NSError(domain: "PrinterManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unable to reach printer"]))
        }
    }
    
    private func connectBluetoothPrinter(_ printer: PrinterInfo) async throws {
        // Simulate connection delay for Bluetooth
        try await Task.sleep(nanoseconds: 2_000_000_000)
        
        // In a real implementation, you would:
        // 1. Find the EAAccessory matching the printer
        // 2. Open a session with the accessory
        // 3. Configure the printer communication
        
        if printer.name.contains("Printer") {
            return // Simulate successful connection
        } else {
            throw PrinterError.connectionFailed(NSError(domain: "PrinterManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Bluetooth connection failed"]))
        }
    }
    
    func disconnectPrinter() {
        isConnected = false
        printerStatus = "Disconnected"
        selectedPrinter = nil
        bluetoothAccessory = nil
        UserDefaults.standard.removeObject(forKey: "selectedPrinter")
        addLog("Disconnected from printer")
    }
    
    // MARK: - Printing Functions
    func printTestReceipt() async -> Bool {
        guard isConnected, let printer = selectedPrinter else {
            errorMessage = "No printer connected"
            return false
        }
        
        do {
            try await printerService.printTestReceipt()
            addLog("Test receipt printed successfully")
            return true
        } catch {
            errorMessage = "Test print failed: \(error.localizedDescription)"
            addLog("Test print failed: \(error.localizedDescription)")
            return false
        }
    }
    
    func printOrderReceipt(_ order: Order) async -> Bool {
        guard isConnected, let printer = selectedPrinter else {
            errorMessage = "No printer connected"
            return false
        }
        
        do {
            try await printerService.printCustomerReceipt(order)
            printedOrders.append(order)
            addLog("Order receipt printed for order \(order.id.prefix(8))")
            return true
        } catch {
            errorMessage = "Receipt print failed: \(error.localizedDescription)"
            addLog("Receipt print failed: \(error.localizedDescription)")
            return false
        }
    }
    
    func printKitchenSummary(_ group: GroupedItem) async -> Bool {
        guard isConnected, let printer = selectedPrinter else {
            errorMessage = "No printer connected"
            return false
        }
        
        do {
            let formatter = PrintFormatter()
            let printData = formatter.formatKitchenSummary(group)
            try await printerService.connectAndSendData(data: printData)
            addLog("Kitchen summary printed for \(group.itemName)")
            return true
        } catch {
            errorMessage = "Kitchen summary print failed: \(error.localizedDescription)"
            addLog("Kitchen summary print failed: \(error.localizedDescription)")
            return false
        }
    }
    
    func printKitchenTestReceipt() async -> Bool {
        guard isConnected, let printer = selectedPrinter else {
            errorMessage = "No printer connected"
            return false
        }
        
        do {
            // Create a mock order for testing kitchen printing
            let mockOrder = createMockKitchenOrder()
            try await printerService.printKitchenOrder(mockOrder)
            addLog("Kitchen test receipt printed successfully")
            return true
        } catch {
            errorMessage = "Kitchen test print failed: \(error.localizedDescription)"
            addLog("Kitchen test print failed: \(error.localizedDescription)")
            return false
        }
    }
    
    private func createMockKitchenOrder() -> Order {
        // Create a simple mock order for testing
        let mockMenuItem1 = MenuItem(
            id: UUID().uuidString,
            restaurant_id: "test-restaurant",
            category_id: "test-category",
            name_en: "Test Burger",
            name_ja: "テストバーガー",
            name_vi: "Bánh Burger Thử Nghiệm",
            code: "BURGER001",
            description_en: "Test menu item",
            description_ja: "テストメニューアイテム",
            description_vi: "Mục menu thử nghiệm",
            price: 1200,
            tags: ["test", "burger"],
            image_url: nil,
            stock_level: 10,
            available: true,
            position: 1,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )

        

        let mockOrderItem1 = OrderItem(
            id: UUID().uuidString,
            restaurant_id: "test-restaurant",
            order_id: "test-order",
            menu_item_id: mockMenuItem1.id,
            quantity: 1,
            notes: "No pickles",
            status: .served,
            created_at: ISO8601DateFormatter().string(from: Date()),
        )

        let mockOrderItem2 = OrderItem(
            id: UUID().uuidString,
            restaurant_id: "test-restaurant",
            order_id: "test-order",
            menu_item_id: mockMenuItem1.id,
            quantity: 2,
            notes: "No pickles",
            status: .served,
            created_at: ISO8601DateFormatter().string(from: Date()),
        )

        

        let mockTable = Table(
            id: UUID().uuidString,
            restaurant_id: "test-restaurant",
            name: "Table 5",
            status: .available,
            capacity: 4,
            is_outdoor: false,
            is_accessible: false,
            notes: "Near the window",
            qr_code: "QR-TEST-\(UUID().uuidString.prefix(8))",
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )

        return Order(
            id: "TEST-\(UUID().uuidString.prefix(8))",
            restaurant_id: "test-restaurant",
            table_id: mockTable.id,
            session_id: "test-session",
            guest_count: 3,
            status: .preparing,
            total_amount: 2900,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date()),
            table: mockTable,
            order_items: [mockOrderItem1, mockOrderItem2]
        )
    }
    
    func reprintOrder(_ order: Order) async -> Bool {
        return await printOrderReceipt(order)
    }
    
    // MARK: - Helper Functions
    private func startNetworkMonitoring() {
        networkMonitor = NWPathMonitor()
        networkMonitor?.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                if path.status == .satisfied {
                    self?.checkAvailablePrinters()
                }
            }
        }
        
        let queue = DispatchQueue(label: "NetworkMonitor")
        networkMonitor?.start(queue: queue)
    }
    
    private func loadSavedPrinter() {
        if let data = UserDefaults.standard.data(forKey: "selectedPrinter"),
           let printer = try? JSONDecoder().decode(PrinterInfo.self, from: data) {
            selectedPrinter = printer
            // Don't automatically set as connected - require manual connection
            printerStatus = "Saved: \(printer.name)"
        }
    }
    
    private func savePrinter(_ printer: PrinterInfo) {
        if let data = try? JSONEncoder().encode(printer) {
            UserDefaults.standard.set(data, forKey: "selectedPrinter")
        }
    }
    
    private func addLog(_ message: String) {
        let timestamp = DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .medium)
        printLogs.append("[\(timestamp)] \(message)")
        
        // Keep only last 50 log entries
        if printLogs.count > 50 {
            printLogs.removeFirst(printLogs.count - 50)
        }
    }
    
    private func isValidIPAddress(_ ip: String) -> Bool {
        let ipRegex = "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$"
        return NSPredicate(format: "SELF MATCHES %@", ipRegex).evaluate(with: ip)
    }
}

// MARK: - Models (Updated)
struct PrinterInfo: Identifiable, Codable {
    let id: String
    let name: String
    let type: PrinterType
    let address: String
    let isConnected: Bool
}

enum PrinterType: String, Codable, CaseIterable {
    case bluetooth = "bluetooth"
    case network = "network"
    
    var displayName: String {
        switch self {
        case .bluetooth: return "Bluetooth"
        case .network: return "Network"
        }
    }
    
    var icon: String {
        switch self {
        case .bluetooth: return "bluetooth"
        case .network: return "network"
        }
    }
}

import Foundation
import SwiftUICore
import Network
import ExternalAccessory

@MainActor
class PrinterManager: ObservableObject {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @Published var isConnected = false
    @Published var printerStatus = "printer_disconnected_status".localized
    @Published var availablePrinters: [PrinterInfo] = []
    @Published var selectedPrinter: PrinterInfo?
    @Published var errorMessage: String?
    @Published var printLogs: [String] = []
    @Published var printedOrders: [Order] = []
    @Published var failedJobs: [PrintJob] = []
    
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
                name: "\(config.name)\("printer_default_suffix".localized)",
                type: .network,
                address: "\(config.ipAddress):\(config.port)",
                isConnected: false
            )
            availablePrinters.append(defaultPrinter)
            addLog("printer_default_config_log".localized)
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
        printerStatus = "printer_connecting_status".localized
        errorMessage = nil
        
        do {
            switch printer.type {
            case .network:
                try await connectNetworkPrinter(printer)
            case .bluetooth:
                try await connectBluetoothPrinter(printer)
            }
            
            isConnected = true
            printerStatus = String(format: "printer_connected_to_printer_status".localized, printer.name)
            savePrinter(printer)
            addLog(String(format: "printer_connected_to_printer_status".localized, printer.name))
            
            // Update settings manager if this is a configured printer
            if let configuredPrinter = settingsManager.configuredPrinters.first(where: { $0.id == printer.id }) {
                settingsManager.setActivePrinter(configuredPrinter)
            }
        } catch {
            isConnected = false
            printerStatus = "printer_failed_to_connect_status".localized
            errorMessage = error.localizedDescription
            addLog(String(format: "printer_test_print_failed_log".localized, error.localizedDescription))
        }
    }
    
    private func connectNetworkPrinter(_ printer: PrinterInfo) async throws {
        let components = printer.address.components(separatedBy: ":")
        guard components.count == 2,
              let port = Int(components[1]) else {
            throw PrinterError.configurationError("printer_invalid_address_format_error".localized)
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
            throw PrinterError.connectionFailed(NSError(domain: "PrinterManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "printer_unable_to_reach_error".localized]))
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
            throw PrinterError.connectionFailed(NSError(domain: "PrinterManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "printer_bluetooth_connection_failed_error".localized]))
        }
    }
    
    func disconnectPrinter() {
        isConnected = false
        printerStatus = "printer_disconnected_status".localized
        selectedPrinter = nil
        bluetoothAccessory = nil
        UserDefaults.standard.removeObject(forKey: "selectedPrinter")
        addLog("printer_disconnected_log".localized)
    }
    
    // MARK: - Printing Functions
    func printTestReceipt() async -> Bool {
        guard isConnected, let printer = selectedPrinter else {
            errorMessage = "printer_no_printer_connected_error".localized
            return false
        }
        
        do {
            try await printerService.printTestReceipt()
            addLog("printer_test_receipt_success_log".localized)
            return true
        } catch {
            errorMessage = String(format: "printer_test_print_failed_log".localized, error.localizedDescription)
            addLog(String(format: "printer_test_print_failed_log".localized, error.localizedDescription))
            queueFailedJob(description: "Test Receipt") { [weak self] in
                await self?.printTestReceipt() ?? false
            }
            return false
        }
    }
    
    func printOrderReceipt(_ order: Order) async -> Bool {
        guard isConnected, let printer = selectedPrinter else {
            errorMessage = "printer_no_printer_connected_error".localized
            return false
        }
        
        do {
            try await printerService.printCustomerReceipt(order)
            printedOrders.append(order)
            addLog(String(format: "printer_order_receipt_success_log".localized, order.id.prefix(8) as CVarArg))
            return true
        } catch {
            errorMessage = String(format: "printer_receipt_print_failed_log".localized, error.localizedDescription)
            addLog(String(format: "printer_receipt_print_failed_log".localized, error.localizedDescription))
            queueFailedJob(description: "Order \(order.id.prefix(8))") { [weak self] in
                await self?.printOrderReceipt(order) ?? false
            }
            return false
        }
    }
    
    func printKitchenSummary(_ group: GroupedItem) async -> Bool {
        guard isConnected, let printer = selectedPrinter else {
            errorMessage = "printer_no_printer_connected_error".localized
            return false
        }
        
        do {
            let formatter = PrintFormatter()
            let printData = formatter.formatKitchenSummary(group)
            try await printerService.connectAndSendData(data: printData)
            addLog(String(format: "printer_kitchen_summary_success_log".localized, group.itemName))
            return true
        } catch {
            errorMessage = String(format: "printer_kitchen_summary_failed_log".localized, error.localizedDescription)
            addLog(String(format: "printer_kitchen_summary_failed_log".localized, error.localizedDescription))
            queueFailedJob(description: "Kitchen Summary \(group.itemName)") { [weak self] in
                await self?.printKitchenSummary(group) ?? false
            }
            return false
        }
    }
    
    func printKitchenTestReceipt() async -> Bool {
        guard isConnected, let printer = selectedPrinter else {
            errorMessage = "printer_no_printer_connected_error".localized
            return false
        }
        
        do {
            // Create a mock order for testing kitchen printing
            let mockOrder = createMockKitchenOrder()
            try await printerService.printKitchenOrder(mockOrder)
            addLog("printer_kitchen_test_receipt_success_log".localized)
            return true
        } catch {
            errorMessage = String(format: "printer_kitchen_test_print_failed_log".localized, error.localizedDescription)
            addLog(String(format: "printer_kitchen_test_print_failed_log".localized, error.localizedDescription))
            queueFailedJob(description: "Kitchen Test Receipt") { [weak self] in
                await self?.printKitchenTestReceipt() ?? false
            }
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
            menu_item_size_id: "L",
            topping_ids: nil,
            price_at_order: 900,
            status: .served,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date()),
        )

        let mockOrderItem2 = OrderItem(
            id: UUID().uuidString,
            restaurant_id: "test-restaurant",
            order_id: "test-order",
            menu_item_id: mockMenuItem1.id,
            quantity: 2,
            notes: "No pickles",
            menu_item_size_id: "M",
            topping_ids: nil,
            price_at_order: 900,
            status: .served,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date()),
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
            status: .serving,
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
            printerStatus = String(format: "printer_saved_printer_status".localized, printer.name)
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

    // Queue a failed print job for retry
    private func queueFailedJob(description: String, action: @escaping @Sendable () async -> Bool) {
        let job = PrintJob(description: description, retryAction: action)
        failedJobs.append(job)
        addLog(String(format: "printer_job_queued_log".localized, description))
    }

    // Retry a previously failed job
    func retry(job: PrintJob) async -> Bool {
        let success = await job.retryAction()
        if success {
            if let index = failedJobs.firstIndex(where: { $0.id == job.id }) {
                failedJobs.remove(at: index)
            }
            addLog(String(format: "printer_job_retry_success_log".localized, job.description))
        } else {
            addLog(String(format: "printer_job_retry_failed_log".localized, job.description))
        }
        return success
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
        case .bluetooth: return "printer_type_bluetooth".localized
        case .network: return "printer_type_network".localized
        }
    }
    
    var icon: String {
        switch self {
        case .bluetooth: return "bluetooth"
        case .network: return "network"
        }
    }
}

// Represents a failed print job that can be retried
struct PrintJob: Identifiable {
    let id = UUID()
    let description: String
    let retryAction: @Sendable () async -> Bool
    let timestamp = Date()
}

// MARK: - PrinterManager Extension for Checkout
extension PrinterManager {
    // MARK: - Checkout Receipt Printing
    func printCheckoutReceipt(_ receiptData: CheckoutReceiptData) async throws {
        let formatter = PrintFormatter()
        let printData = formatter.formatCheckoutReceipt(receiptData)
        
        // Use the appropriate printer based on current mode
        let settingsManager = PrinterSettingsManager.shared
        
        switch settingsManager.printerMode {
        case .single:
            // Use the active printer for both kitchen and checkout
            try await printerService.connectAndSendData(data: printData)
            
        case .dual:
            // Use the checkout printer specifically
            if let checkoutConfig = settingsManager.getCheckoutPrinterConfig() {
                try await printerService.connectAndSendData(data: printData, to: checkoutConfig)
            } else {
                // Fallback to any available printer
                try await printerService.connectAndSendData(data: printData)
            }
        }
        
        addLog(String(format: "printer_checkout_receipt_success_log".localized, String(format: "%.0f", receiptData.totalAmount)))
    }
    
    func printKitchenSlip(for order: Order) async throws {
        let formatter = PrintFormatter()
        guard let printData = formatter.formatOrderForKitchen(order: order) else {
            throw PrinterError.dataEncodingError("printer_failed_to_format_kitchen_slip_error".localized)
        }
        
        let settingsManager = PrinterSettingsManager.shared
        
        switch settingsManager.printerMode {
        case .single:
            // Use the active printer
            try await printerService.connectAndSendData(data: printData)
            
        case .dual:
            // Use the kitchen printer specifically
            if let kitchenConfig = settingsManager.getKitchenPrinterConfig() {
                try await printerService.connectAndSendData(data: printData, to: kitchenConfig)
            } else {
                // Fallback to any available printer
                try await printerService.connectAndSendData(data: printData)
            }
        }
        
        addLog(String(format: "printer_kitchen_slip_success_log".localized, order.id.prefix(8) as CVarArg))
    }
}

// MARK: - PrinterManager Extension for Kitchen Board
extension PrinterManager {
    func printKitchenBoardSummary(_ items: [GroupedItem]) async throws {
        guard isConnected, let printer = selectedPrinter else {
            throw PrinterError.notConnected
        }
        
        do {
            let formatter = PrintFormatter()
            
            // Create a summary text for all items
            var summaryText = "\("printer_kitchen_board_summary_title".localized)\n"
            summaryText += String(repeating: "=", count: 32) + "\n"
            summaryText += String(format: "printer_kitchen_board_items".localized, items.count) + "\n"
            summaryText += String(format: "printer_kitchen_board_time".localized, DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short)) + "\n"
            summaryText += String(repeating: "-", count: 32) + "\n"
            
            for item in items {
                summaryText += "\(item.itemName) x\(item.quantity)\n"
                summaryText += String(format: "printer_kitchen_board_tables".localized, Array(item.tables).joined(separator: ", ")) + "\n"
                summaryText += String(format: "printer_kitchen_board_status".localized, item.status.displayName) + "\n"
                if let notes = item.notes, !notes.isEmpty {
                    summaryText += String(format: "printer_kitchen_board_notes".localized, notes) + "\n"
                }
                summaryText += "-\n"
            }
            
            summaryText += String(repeating: "=", count: 32) + "\n"
            summaryText += "\("printer_kitchen_board_end_of_summary".localized)\n\n\n"
            
            let printData = Data(summaryText.utf8)
            try await printerService.connectAndSendData(data: printData)
            addLog(String(format: "printer_kitchen_board_summary_success_log".localized, items.count))
        } catch {
            addLog(String(format: "printer_kitchen_board_summary_failed_log".localized, error.localizedDescription))
            throw error
        }
    }
    
    func printKitchenItemSummary(_ item: GroupedItem) async throws {
        guard isConnected, let printer = selectedPrinter else {
            throw PrinterError.notConnected
        }
        
        do {
            let formatter = PrintFormatter()
            let printData = formatter.formatKitchenSummary(item)
            try await printerService.connectAndSendData(data: printData)
            addLog(String(format: "printer_kitchen_item_summary_success_log".localized, item.itemName))
        } catch {
            addLog(String(format: "printer_kitchen_item_summary_failed_log".localized, error.localizedDescription))
            throw error
        }
    }
    
    func printKitchenSlip(_ item: GroupedItem) async throws {
        guard isConnected, let printer = selectedPrinter else {
            throw PrinterError.notConnected
        }
        
        do {
            // Create a kitchen slip for this grouped item
            var slipText = "\("printer_kitchen_slip_title".localized)\n"
            slipText += String(repeating: "=", count: 32) + "\n"
            slipText += String(format: "printer_kitchen_slip_item".localized, item.itemName) + "\n"
            slipText += String(format: "printer_kitchen_slip_quantity".localized, item.quantity) + "\n"
            slipText += String(format: "printer_kitchen_slip_category".localized, item.categoryName) + "\n"
            slipText += String(format: "printer_kitchen_board_tables".localized, Array(item.tables).joined(separator: ", ")) + "\n"
            slipText += String(format: "printer_kitchen_board_status".localized, item.status.displayName) + "\n"
            slipText += String(format: "printer_kitchen_board_time".localized, DateFormatter.localizedString(from: item.orderTime, dateStyle: .none, timeStyle: .short)) + "\n"
            
            if let notes = item.notes, !notes.isEmpty {
                slipText += String(format: "printer_kitchen_slip_special_notes".localized, notes) + "\n"
            }
            
            slipText += String(repeating: "-", count: 32) + "\n"
            slipText += String(format: "printer_kitchen_slip_priority".localized, item.priority >= 4 ? "printer_priority_urgent".localized : "printer_priority_normal".localized) + "\n"
            slipText += String(repeating: "=", count: 32) + "\n\n\n"
            
            let printData = Data(slipText.utf8)
            try await printerService.connectAndSendData(data: printData)
            addLog(String(format: "printer_kitchen_item_summary_success_log".localized, item.itemName))
        } catch {
            addLog(String(format: "printer_kitchen_item_summary_failed_log".localized, error.localizedDescription))
            throw error
        }
    }
}

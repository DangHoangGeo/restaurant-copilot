import Foundation
import Network
import ExternalAccessory

class PrinterManager: ObservableObject {
    @Published var isConnected = false
    @Published var printerStatus = "Disconnected"
    @Published var availablePrinters: [PrinterInfo] = []
    @Published var selectedPrinter: PrinterInfo?
    @Published var errorMessage: String?
    
    private var networkMonitor: NWPathMonitor?
    private var bluetoothAccessory: EAAccessory?
    
    init() {
        checkAvailablePrinters()
        startNetworkMonitoring()
    }
    
    // MARK: - Printer Discovery
    func checkAvailablePrinters() {
        availablePrinters = []
        
        // Check for Bluetooth printers (using External Accessory framework)
        checkBluetoothPrinters()
        
        // Check for network printers (basic network discovery)
        checkNetworkPrinters()
    }
    
    private func checkBluetoothPrinters() {
        let accessories = EAAccessoryManager.shared().connectedAccessories
        
        for accessory in accessories {
            // Look for printer accessories (you may need to adjust protocol strings based on your printer)
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
    
    private func checkNetworkPrinters() {
        // For demonstration, add some common network printer IPs
        // In a real app, you would implement network discovery
        let commonPrinterIPs = ["192.168.1.100", "192.168.1.101", "192.168.1.102"]
        
        for ip in commonPrinterIPs {
            // You would ping or check if the printer is available at this IP
            let printerInfo = PrinterInfo(
                id: ip,
                name: "Network Printer (\(ip))",
                type: .network,
                address: ip,
                isConnected: false
            )
            // For demo purposes, we'll add it as available
            // In a real implementation, you'd check connectivity first
        }
    }
    
    // MARK: - Printer Connection
    func connectToPrinter(_ printer: PrinterInfo) async {
        await MainActor.run {
            selectedPrinter = printer
            printerStatus = "Connecting..."
            errorMessage = nil
        }
        
        do {
            switch printer.type {
            case .bluetooth:
                try await connectBluetoothPrinter(printer)
            case .network:
                try await connectNetworkPrinter(printer)
            }
            
            await MainActor.run {
                isConnected = true
                printerStatus = "Connected to \(printer.name)"
            }
        } catch {
            await MainActor.run {
                isConnected = false
                printerStatus = "Failed to connect"
                errorMessage = error.localizedDescription
            }
        }
    }
    
    private func connectBluetoothPrinter(_ printer: PrinterInfo) async throws {
        // Simulate connection delay
        try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
        
        // In a real implementation, you would:
        // 1. Find the EAAccessory matching the printer
        // 2. Open a session with the accessory
        // 3. Configure the printer communication
        
        // For now, we'll simulate a successful connection
        if printer.name.contains("Printer") {
            // Simulate successful connection
            return
        } else {
            throw PrinterError.connectionFailed
        }
    }
    
    private func connectNetworkPrinter(_ printer: PrinterInfo) async throws {
        // Simulate connection delay
        try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds
        
        // In a real implementation, you would:
        // 1. Create a TCP connection to the printer IP
        // 2. Send initialization commands
        // 3. Verify the printer responds correctly
        
        // For now, we'll simulate a successful connection
        if isValidIPAddress(printer.address) {
            // Simulate successful connection
            return
        } else {
            throw PrinterError.connectionFailed
        }
    }
    
    func disconnectPrinter() {
        isConnected = false
        printerStatus = "Disconnected"
        selectedPrinter = nil
        bluetoothAccessory = nil
    }
    
    // MARK: - Printing Functions
    func printTestReceipt() async -> Bool {
        guard isConnected, let printer = selectedPrinter else {
            await MainActor.run {
                errorMessage = "No printer connected"
            }
            return false
        }
        
        let testReceipt = generateTestReceipt()
        return await printData(testReceipt, to: printer)
    }
    
    func printOrderReceipt(_ order: Order) async -> Bool {
        guard isConnected, let printer = selectedPrinter else {
            await MainActor.run {
                errorMessage = "No printer connected"
            }
            return false
        }
        
        let receiptData = generateOrderReceipt(order)
        return await printData(receiptData, to: printer)
    }
    
    func printKitchenSummary(_ group: GroupedItem) async -> Bool {
        guard isConnected, let printer = selectedPrinter else {
            await MainActor.run {
                errorMessage = "No printer connected"
            }
            return false
        }
        
        let summaryData = generateKitchenSummary(group)
        return await printData(summaryData, to: printer)
    }
    
    private func printData(_ data: Data, to printer: PrinterInfo) async -> Bool {
        do {
            switch printer.type {
            case .bluetooth:
                return try await printViaBluetooth(data)
            case .network:
                return try await printViaNetwork(data, to: printer.address)
            }
        } catch {
            await MainActor.run {
                errorMessage = "Print failed: \(error.localizedDescription)"
            }
            return false
        }
    }
    
    private func printViaBluetooth(_ data: Data) async throws -> Bool {
        // Simulate printing delay
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        
        // In a real implementation, you would:
        // 1. Send data to the Bluetooth accessory
        // 2. Wait for confirmation
        // 3. Handle any errors
        
        return true // Simulate successful print
    }
    
    private func printViaNetwork(_ data: Data, to address: String) async throws -> Bool {
        // Simulate printing delay
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        
        // In a real implementation, you would:
        // 1. Open TCP connection to printer
        // 2. Send the print data
        // 3. Wait for acknowledgment
        // 4. Close connection
        
        return true // Simulate successful print
    }
    
    // MARK: - Receipt Generation
    private func generateTestReceipt() -> Data {
        let testReceipt = """
        ================================
              SOder Test Receipt
        ================================
        
        Date: \(DateFormatter.localizedString(from: Date(), dateStyle: .short, timeStyle: .short))
        
        This is a test print to verify
        your printer connection.
        
        If you can read this, your
        printer is working correctly!
        
        ================================
        
        
        """
        
        return testReceipt.data(using: .utf8) ?? Data()
    }
    
    private func generateOrderReceipt(_ order: Order) -> Data {
        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        
        var receipt = """
        ================================
               ORDER RECEIPT
        ================================
        
        Order ID: \(order.id.prefix(8))
        Table: \(order.table?.name ?? "Unknown")
        Guests: \(order.guest_count)
        Status: \(order.status.displayName)
        Date: \(formatter.string(from: Date()))
        
        --------------------------------
        ITEMS:
        --------------------------------
        
        """
        
        if let items = order.order_items {
            for item in items {
                let itemName = item.menu_item?.displayName ?? "Unknown Item"
                let price = item.menu_item?.price ?? 0
                let subtotal = price * Double(item.quantity)
                
                receipt += String(format: "%-20s %2dx %6.0f\n", 
                                String(itemName.prefix(20)), 
                                item.quantity, 
                                subtotal)
                
                if let notes = item.notes, !notes.isEmpty {
                    receipt += "  Note: \(notes)\n"
                }
                receipt += "\n"
            }
        }
        
        receipt += "--------------------------------\n"
        
        if let total = order.total_amount {
            receipt += String(format: "TOTAL: ¥%.0f\n", total)
        }
        
        receipt += """
        
        ================================
        Thank you for using SOder!
        ================================
        
        
        """
        
        return receipt.data(using: .utf8) ?? Data()
    }
    
    private func generateKitchenSummary(_ group: GroupedItem) -> Data {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        
        var summary = """
        ================================
             KITCHEN SUMMARY
        ================================
        
        Time: \(formatter.string(from: Date()))
        
        ITEM: \(group.itemName)
        TOTAL QUANTITY: \(group.quantity)
        
        --------------------------------
        TABLES:
        --------------------------------
        
        """
        
        for table in group.tables.sorted() {
            summary += "\(table)\n"
        }
        
        summary += """
        
        --------------------------------
        STATUS: COMPLETED
        ================================
        
        
        """
        
        return summary.data(using: .utf8) ?? Data()
    }
    
    // MARK: - Helper Functions
    private func startNetworkMonitoring() {
        networkMonitor = NWPathMonitor()
        networkMonitor?.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                if path.status == .satisfied {
                    self?.checkAvailablePrinters()
                }
            }
        }
        
        let queue = DispatchQueue(label: "NetworkMonitor")
        networkMonitor?.start(queue: queue)
    }
    
    private func isValidIPAddress(_ ip: String) -> Bool {
        let ipRegex = "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$"
        return NSPredicate(format: "SELF MATCHES %@", ipRegex).evaluate(with: ip)
    }
}

// MARK: - Models
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

enum PrinterError: LocalizedError {
    case connectionFailed
    case printFailed
    case noPrinterSelected
    
    var errorDescription: String? {
        switch self {
        case .connectionFailed:
            return "Failed to connect to printer"
        case .printFailed:
            return "Failed to print document"
        case .noPrinterSelected:
            return "No printer selected"
        }
    }
}
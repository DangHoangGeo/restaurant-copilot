import Foundation
import Network

// MARK: - Printer Errors
enum PrinterError: Error, LocalizedError {
    case connectionFailed(Error)
    case sendFailed(Error)
    case notConnected
    case configurationError(String)
    case dataEncodingError(String)
    case timeout
    
    var errorDescription: String? {
        switch self {
        case .connectionFailed(let err):
            return "Printer connection failed: \(err.localizedDescription)"
        case .sendFailed(let err):
            return "Failed to send data to printer: \(err.localizedDescription)"
        case .notConnected:
            return "Not connected to the printer"
        case .configurationError(let msg):
            return "Printer configuration error: \(msg)"
        case .dataEncodingError(let msg):
            return "Data encoding error: \(msg)"
        case .timeout:
            return "Connection timeout"
        }
    }
}

// MARK: - Printer Service
class PrinterService {
    static let shared = PrinterService()
    
    private var connection: NWConnection?
    private let config = PrinterConfig.shared
    private let settingsManager = PrinterSettingsManager.shared
    private let queue = DispatchQueue(label: "printer.service", qos: .userInitiated)
    
    private init() {}
    
    // MARK: - Public Methods
    func connectAndSendData(data: Data, to printerConfig: PrinterConfig.Hardware? = nil) async throws {
        let printer = printerConfig ?? settingsManager.getCurrentPrinterConfig()
        
        guard !printer.ipAddress.isEmpty, printer.port > 0 else {
            throw PrinterError.configurationError("Printer IP Address or Port is not configured")
        }
        
        let host = NWEndpoint.Host(printer.ipAddress)
        guard let port = NWEndpoint.Port(rawValue: UInt16(printer.port)) else {
            throw PrinterError.configurationError("Invalid printer port number")
        }
        
        // Create a new connection for each print job
        let newConnection = NWConnection(host: host, port: port, using: .tcp)
        self.connection = newConnection
        
        print("PrinterService: Connecting to \(printer.ipAddress):\(printer.port)")
        
        return try await withCheckedThrowingContinuation { continuation in
            var hasResumed = false
            
            newConnection.stateUpdateHandler = { [weak self] newState in
                guard let self = self, !hasResumed else { return }
                
                switch newState {
                case .ready:
                    print("PrinterService: Connected successfully")
                    self.sendData(connection: newConnection, data: data) { error in
                        if !hasResumed {
                            hasResumed = true
                            if let error = error {
                                continuation.resume(throwing: error)
                            } else {
                                continuation.resume(returning: ())
                            }
                        }
                        self.disconnect(connection: newConnection)
                    }
                    
                case .failed(let error):
                    if !hasResumed {
                        hasResumed = true
                        print("PrinterService: Connection failed - \(error.localizedDescription)")
                        continuation.resume(throwing: PrinterError.connectionFailed(error))
                    }
                    self.connection = nil
                    
                case .cancelled:
                    if !hasResumed {
                        hasResumed = true
                        print("PrinterService: Connection cancelled")
                        continuation.resume(throwing: PrinterError.timeout)
                    }
                    self.connection = nil
                    
                default:
                    break
                }
            }
            
            newConnection.start(queue: queue)
            
            // Set timeout
            DispatchQueue.global(qos: .userInitiated).asyncAfter(deadline: .now() + printer.connectionTimeout) {
                if !hasResumed {
                    hasResumed = true
                    print("PrinterService: Connection timeout")
                    newConnection.cancel()
                    continuation.resume(throwing: PrinterError.timeout)
                }
            }
        }
    }
    
    func testConnection(to printerConfig: PrinterConfig.Hardware? = nil) async -> Bool {
        let printer = printerConfig ?? settingsManager.getCurrentPrinterConfig()
        let testData = "Test connection".data(using: .utf8) ?? Data()
        do {
            try await connectAndSendData(data: testData, to: printer)
            return true
        } catch {
            print("Connection test failed: \(error.localizedDescription)")
            return false
        }
    }
    
    // MARK: - Private Methods
    private func sendData(connection: NWConnection, data: Data, completion: @escaping (PrinterError?) -> Void) {
        guard connection.state == .ready else {
            completion(PrinterError.notConnected)
            return
        }
        
        connection.send(content: data, completion: .contentProcessed { error in
            if let error = error {
                print("PrinterService: Send failed - \(error.localizedDescription)")
                completion(PrinterError.sendFailed(error))
            } else {
                print("PrinterService: Data sent successfully (\(data.count) bytes)")
                completion(nil)
            }
        })
    }
    
    private func disconnect(connection: NWConnection) {
        connection.cancel()
        if self.connection === connection {
            self.connection = nil
        }
        print("PrinterService: Connection closed")
    }
}

// MARK: - Print Job Extensions
extension PrinterService {
    func printKitchenOrder(_ order: Order) async throws {
        let formatter = PrintFormatter()
        guard let printData = formatter.formatOrderForKitchen(order: order) else {
            throw PrinterError.dataEncodingError("Failed to format kitchen order")
        }
        
        // Use kitchen printer if configured, otherwise fallback to default
        let printerConfig = PrinterSettingsManager.shared.getKitchenPrinterConfig()
        try await connectAndSendData(data: printData, to: printerConfig)
    }
    
    func printCustomerReceipt(_ order: Order, isOfficial: Bool = false) async throws {
        let formatter = PrintFormatter()
        guard let printData = formatter.formatCustomerReceipt(order: order, isOfficial: isOfficial) else {
            throw PrinterError.dataEncodingError("Failed to format customer receipt")
        }
        
        // Use checkout printer if configured, otherwise fallback to default
        let printerConfig = PrinterSettingsManager.shared.getCheckoutPrinterConfig()
        try await connectAndSendData(data: printData, to: printerConfig)
    }
    
    func printTestReceipt() async throws {
        let formatter = PrintFormatter()
        let printData = formatter.formatTestReceipt()
        try await connectAndSendData(data: printData)
    }
    
    // MARK: - Dual Printer Test Functions
    func testKitchenPrinter() async throws {
        guard let kitchenConfig = PrinterSettingsManager.shared.getKitchenPrinterConfig() else {
            throw PrinterError.configurationError("No kitchen printer configured")
        }
        
        let formatter = PrintFormatter()
        let testData = formatter.formatKitchenTestReceipt()
        try await connectAndSendData(data: testData, to: kitchenConfig)
    }
    
    func testCheckoutPrinter() async throws {
        guard let checkoutConfig = PrinterSettingsManager.shared.getCheckoutPrinterConfig() else {
            throw PrinterError.configurationError("No checkout printer configured")
        }
        
        let formatter = PrintFormatter()
        let testData = formatter.formatCheckoutTestReceipt()
        try await connectAndSendData(data: testData, to: checkoutConfig)
    }
    
    // MARK: - Dual Printer Order Processing
    func printOrderToBothPrinters(_ order: Order) async throws {
        let settingsManager = PrinterSettingsManager.shared
        
        switch settingsManager.printerMode {
        case .single:
            // Single printer mode: print both kitchen and receipt to the same printer
            let formatter = PrintFormatter()
            
            // Print kitchen order first
            if let kitchenData = formatter.formatOrderForKitchen(order: order) {
                try await connectAndSendData(data: kitchenData)
            }
            
            // Then print customer receipt
            if let receiptData = formatter.formatCustomerReceipt(order: order, isOfficial: false) {
                try await connectAndSendData(data: receiptData)
            }
            
        case .dual:
            // Dual printer mode: print to separate printers
            var kitchenError: Error?
            var checkoutError: Error?
            
            // Print to kitchen printer if configured
            if settingsManager.hasKitchenPrinter() {
                do {
                    try await printKitchenOrder(order)
                } catch {
                    kitchenError = error
                }
            }
            
            // Print to checkout printer if configured
            if settingsManager.hasCheckoutPrinter() {
                do {
                    try await printCustomerReceipt(order, isOfficial: false)
                } catch {
                    checkoutError = error
                }
            }
            
            // Throw error if both failed
            if let kitchenError = kitchenError, let checkoutError = checkoutError {
                throw PrinterError.sendFailed(NSError(domain: "PrinterService", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Both printers failed - Kitchen: \(kitchenError.localizedDescription), Checkout: \(checkoutError.localizedDescription)"
                ]))
            } else if let kitchenError = kitchenError {
                throw PrinterError.sendFailed(NSError(domain: "PrinterService", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Kitchen printer failed: \(kitchenError.localizedDescription)"
                ]))
            } else if let checkoutError = checkoutError {
                throw PrinterError.sendFailed(NSError(domain: "PrinterService", code: -1, userInfo: [
                    NSLocalizedDescriptionKey: "Checkout printer failed: \(checkoutError.localizedDescription)"
                ]))
            }
        }
    }
}
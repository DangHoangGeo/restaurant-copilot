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
    case jobFailed(String)
    case queueFull
    case invalidJobData
    case printerOffline
    case paperOut
    case printerBusy
    
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
        case .jobFailed(let msg):
            return "Print job failed: \(msg)"
        case .queueFull:
            return "Print queue is full"
        case .invalidJobData:
            return "Invalid print job data"
        case .printerOffline:
            return "Printer is offline"
        case .paperOut:
            return "Printer is out of paper"
        case .printerBusy:
            return "Printer is busy"
        }
    }
    
    var recoverySuggestion: String? {
        switch self {
        case .connectionFailed:
            return "Check printer connection and network settings"
        case .sendFailed:
            return "Try printing again or check printer status"
        case .notConnected:
            return "Connect to a printer first"
        case .configurationError:
            return "Check printer configuration in settings"
        case .dataEncodingError:
            return "Check print data format and encoding"
        case .timeout:
            return "Check network connection and try again"
        case .jobFailed:
            return "Check printer status and try again"
        case .queueFull:
            return "Wait for current jobs to complete or clear the queue"
        case .invalidJobData:
            return "Check the print job data format"
        case .printerOffline:
            return "Check if printer is powered on and connected"
        case .paperOut:
            return "Replace printer paper and try again"
        case .printerBusy:
            return "Wait for printer to become available"
        }
    }
}

// MARK: - Printer Service
class PrinterService {
    static let shared = PrinterService()
    
    private let config = PrinterConfig.shared
    private let settingsManager = PrinterSettingsManager.shared
    private let queue = DispatchQueue(label: "printer.service", qos: .userInitiated)
    
    // Connection management
    private var lastConnectionTime: Date = Date.distantPast
    private var connectionAttempts: Int = 0
    private let minimumConnectionInterval: TimeInterval = 1.0 // Minimum 1 second between connections
    private let maxConnectionAttempts: Int = 3
    private let connectionResetInterval: TimeInterval = 60.0 // Reset attempt counter after 1 minute
    
    private init() {}
    
    // MARK: - Public Methods
    func connectAndSendData(data: Data, to printerConfig: PrinterConfig.Hardware? = nil) async throws {
        let printer = printerConfig ?? settingsManager.getCurrentPrinterConfig()
        
        guard !printer.ipAddress.isEmpty, printer.port > 0 else {
            throw PrinterError.configurationError("Printer IP Address or Port is not configured")
        }
        
        // Implement rate limiting
        try await enforceRateLimit()
        
        let host = NWEndpoint.Host(printer.ipAddress)
        guard let port = NWEndpoint.Port(rawValue: UInt16(printer.port)) else {
            throw PrinterError.configurationError("Invalid printer port number")
        }
        
        // Create a new connection for each print job
        let newConnection = NWConnection(host: host, port: port, using: .tcp)
        // Don't store connection reference to avoid retain cycles
        
        print("PrinterService: Connecting to \(printer.ipAddress):\(printer.port)")
        
        return try await withCheckedThrowingContinuation { continuation in
            var hasResumed = false
            
            newConnection.stateUpdateHandler = { [weak self] newState in
                guard let self = self, !hasResumed else { return }
                
                switch newState {
                case .ready:
                    print("PrinterService: Connected successfully")
                    self.sendData(connection: newConnection, data: data) { [weak self] error in
                        if !hasResumed {
                            hasResumed = true
                            if let error = error {
                                continuation.resume(throwing: error)
                            } else {
                                // Reset connection attempts on successful print
                                self?.connectionAttempts = 0
                                continuation.resume(returning: ())
                            }
                        }
                        // Add longer delay before disconnecting to ensure data is fully transmitted
                        DispatchQueue.global().asyncAfter(deadline: .now() + 1.0) { [weak self] in
                            // Disconnect first, then clear handler
                            self?.disconnect(connection: newConnection)
                        }
                    }
                    
                case .failed(let error):
                    if !hasResumed {
                        hasResumed = true
                        print("PrinterService: Connection failed - \(error.localizedDescription)")
                        continuation.resume(throwing: PrinterError.connectionFailed(error))
                    }
                    newConnection.cancel()
                    
                case .cancelled:
                    if !hasResumed {
                        hasResumed = true
                        print("PrinterService: Connection cancelled")
                        continuation.resume(throwing: PrinterError.timeout)
                    }
                    
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
        
        // Prepend UTF-8 initialization and charset commands
        let enhancedData = prepareDataWithEncoding(data)
        
        connection.send(content: enhancedData, completion: .contentProcessed { error in
            if let error = error {
                print("PrinterService: Send failed - \(error.localizedDescription)")
                completion(PrinterError.sendFailed(error))
            } else {
                print("PrinterService: Data sent successfully (\(enhancedData.count) bytes)")
                completion(nil)
            }
        })
    }
    
    private func prepareDataWithEncoding(_ originalData: Data) -> Data {
        var enhancedData = Data()
        
        // Get current language and encoding strategy
        let language = settingsManager.printLanguage
        let strategy = settingsManager.encodingStrategy ?? .utf8Primary
        
        // Add initialization commands based on strategy
        switch strategy {
        case .utf8Primary, .utf8Fallback:
            // Use enhanced UTF-8 initialization sequence
            enhancedData.append(Data(PrinterConfig.Commands.initializeUTF8))
            // Add an additional charset reset to ensure UTF-8 is properly set
            enhancedData.append(Data(PrinterConfig.Commands.setCharsetUTF8))
            
        case .legacyEncoding:
            // Use legacy initialization and charset commands
            enhancedData.append(Data(PrinterConfig.Commands.initialize))
            enhancedData.append(Data(PrinterConfig.EncodingUtils.getLegacyCharsetCommand(for: language)))
        }
        
        // Append the original formatted data
        enhancedData.append(originalData)
        
        return enhancedData
    }
    
    private func disconnect(connection: NWConnection) {
        // Clear the state update handler to break retain cycles
        connection.stateUpdateHandler = nil
        connection.cancel()
        print("PrinterService: Connection closed")
    }
    
    // MARK: - Rate Limiting
    private func enforceRateLimit() async throws {
        let now = Date()
        
        // Reset connection attempts if enough time has passed
        if now.timeIntervalSince(lastConnectionTime) > connectionResetInterval {
            connectionAttempts = 0
        }
        
        // Check if we've exceeded maximum attempts
        if connectionAttempts >= maxConnectionAttempts {
            throw PrinterError.printerBusy
        }
        
        // Check minimum interval between connections
        let timeSinceLastConnection = now.timeIntervalSince(lastConnectionTime)
        if timeSinceLastConnection < minimumConnectionInterval {
            let waitTime = minimumConnectionInterval - timeSinceLastConnection
            print("PrinterService: Rate limiting - waiting \(waitTime) seconds")
            try await Task.sleep(nanoseconds: UInt64(waitTime * 1_000_000_000))
        }
        
        // Update tracking variables
        lastConnectionTime = Date()
        connectionAttempts += 1
        
        print("PrinterService: Connection attempt \(connectionAttempts) of \(maxConnectionAttempts)")
    }
}

// MARK: - Print Job Extensions
extension PrinterService {
    // MARK: - Queue-based Print Methods
    func queueKitchenOrder(_ order: Order) async throws {
        let formatter = PrintFormatter()
        guard let printData = formatter.formatOrderForKitchen(order: order) else {
            throw PrinterError.dataEncodingError("Failed to format kitchen order")
        }
        
        try await MainActor.run {
            try PrintQueueManager.shared.enqueue(
                data: printData,
                jobType: .kitchenOrder,
                description: "Kitchen Order #\(order.id)"
            )
        }
    }
    
    func queueCustomerReceipt(_ order: Order, isOfficial: Bool = false) async throws {
        let formatter = PrintFormatter()
        guard let printData = formatter.formatCustomerReceipt(order: order, isOfficial: isOfficial) else {
            throw PrinterError.dataEncodingError("Failed to format customer receipt")
        }
        
        try await MainActor.run {
            try PrintQueueManager.shared.enqueue(
                data: printData,
                jobType: .customerReceipt,
                description: "Receipt #\(order.id)"
            )
        }
    }
    
    func queueTestReceipt() async throws {
        let formatter = PrintFormatter()
        let printData = formatter.formatTestReceipt()
        
        try await MainActor.run {
            try PrintQueueManager.shared.enqueue(
                data: printData,
                jobType: .testReceipt,
                description: "Test Receipt"
            )
        }
    }
    
    // MARK: - Legacy Direct Print Methods (for backward compatibility)
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
    
    // MARK: - Language Capability Testing
    func testPrintSample(language: PrintLanguage, printerConfig: PrinterConfig.Hardware? = nil) async -> Bool {
        do {
            let testString = PrinterConfig.EncodingUtils.testStrings[language.rawValue] ?? "Test Receipt 123"
            let testData = createLanguageTestData(text: testString, language: language)
            try await connectAndSendData(data: testData, to: printerConfig)
            return true
        } catch {
            print("Language test failed for \(language.rawValue): \(error.localizedDescription)")
            return false
        }
    }
    
    func testPrintSampleForPrinter(_ printer: ConfiguredPrinter, language: PrintLanguage) async -> Bool {
        let hardwareConfig = PrinterConfig.Hardware(
            ipAddress: printer.ipAddress,
            port: printer.port,
            name: printer.name,
            connectionTimeout: 5.0,
            maxRetries: 3
        )
        return await testPrintSample(language: language, printerConfig: hardwareConfig)
    }
    
    func testAllLanguagesForPrinter(_ printer: ConfiguredPrinter) async -> [PrintLanguage: Bool] {
        var results: [PrintLanguage: Bool] = [:]
        
        for language in PrintLanguage.allCases {
            results[language] = await testPrintSampleForPrinter(printer, language: language)
            // Add small delay between tests to avoid overwhelming the printer
            try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        }
        
        return results
    }
    
    private func createLanguageTestData(text: String, language: PrintLanguage) -> Data {
        var testData = Data()
        
        // Get current encoding strategy
        let strategy = settingsManager.encodingStrategy ?? .utf8Primary
        
        // Add initialization commands
        switch strategy {
        case .utf8Primary, .utf8Fallback:
            testData.append(Data(PrinterConfig.Commands.initializeUTF8))
        case .legacyEncoding:
            testData.append(Data(PrinterConfig.Commands.initialize))
            testData.append(Data(PrinterConfig.EncodingUtils.getLegacyCharsetCommand(for: language)))
        }
        
        // Add header
        testData.append("\n\n".data(using: .utf8) ?? Data())
        testData.append(Data(PrinterConfig.Commands.alignCenter))
        testData.append(Data(PrinterConfig.Commands.boldOn))
        testData.append("Language Test\n".data(using: .utf8) ?? Data())
        testData.append(Data(PrinterConfig.Commands.boldOff))
        testData.append("\n".data(using: .utf8) ?? Data())
        
        // Add test content with encoding based on strategy
        let encoding = PrinterConfig.EncodingUtils.getEncoding(for: language, strategy: strategy)
        let contentText = "\(language.displayName)\n\(text)\n"
        
        if let contentData = contentText.data(using: encoding) {
            testData.append(contentData)
        } else {
            // Fallback to ASCII if encoding fails
            let fallbackText = PrinterConfig.EncodingUtils.toASCIISafe(contentText)
            testData.append(fallbackText.data(using: .ascii) ?? Data())
        }
        
        // Add footer and cut
        testData.append("\n".data(using: .utf8) ?? Data())
        testData.append(Data(PrinterConfig.Commands.alignLeft))
        testData.append(Data(PrinterConfig.Commands.paperFeed))
        testData.append(Data(PrinterConfig.Commands.cutPaperPartial))
        
        return testData
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
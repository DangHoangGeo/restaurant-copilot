## The key components for IP-based printing are:

1.  **Configuration (parts of `AppConfig.swift`):**
    *   Printer connection details (IP, Port).
    *   Printer commands (ESC/POS).
    *   Restaurant details (for receipt headers/footers).
2.  **`Services/PrinterService.swift`:** Handles the actual network communication with the IP printer.
3.  **`Helpers/PrintFormatter.swift`:** Formats order data into the raw byte commands for the printer.
4.  **Models (`Order.swift`, `OrderItem.swift`):** The `PrintFormatter` will need these (or similar structures) to know what to print. I'll assume you'll bring these models into your new app as well.

Here's the extracted and organized code:

---

**1. Printer Configuration (to be part of your new app's `AppConfig.swift` or a similar config file)**

```swift
// In your AppConfig.swift (or a new PrinterConfig.swift)

// class AppConfig { // Assuming you have a similar structure
//    static let shared = AppConfig()
//    // ... other configs ...

    // MARK: - Printer Configuration
    struct Printer {
        let ipAddress: String
        let port: Int
        let name: String // Optional: For identifying the printer type or for Bluetooth
    }

    // Instance for your kitchen printer
    // This should ideally be user-configurable in the app's settings
    let kitchenPrinter: Printer = Printer(
        ipAddress: "192.168.3.7", // <<< IMPORTANT: Make this configurable
        port: 9100,               // <<< IMPORTANT: Make this configurable
        name: "KitchenPrinter001"   // Example name
    )

    // MARK: - Printer Commands (ESC/POS)
    // These are highly printer-specific. Verify with your printer's manual.
    struct PrinterCommands {
        static let initialize: [UInt8] = [0x1B, 0x40] // ESC @ (Reset printer)

        // Text Formatting
        static let fontSizeNormal: [UInt8] = [0x1D, 0x21, 0x00] // ESC ! n (Normal size) - Check your printer manual
        static let fontSizeDoubleWidth: [UInt8] = [0x1D, 0x21, 0x10] // GS ! n (Double width)
        static let fontSizeDoubleHeight: [UInt8] = [0x1D, 0x21, 0x01] // GS ! n (Double height)
        static let fontSizeDoubleWidthAndHeight: [UInt8] = [0x1D, 0x21, 0x11] // GS ! n (Double W+H)
        // Old commands (might work for some printers):
        // static let fontSize24: [UInt8] = [27, 33, 16]  // Double W, Double H
        // static let fontSize12: [UInt8] = [27, 33, 0]   // Normal size

        static let boldOn: [UInt8] = [0x1B, 0x45, 0x01] // ESC E n (n=1 for on)
        static let boldOff: [UInt8] = [0x1B, 0x45, 0x00] // ESC E n (n=0 for off)
        static let underlineOn: [UInt8] = [0x1B, 0x2D, 0x01] // ESC - n (n=1 for on)
        static let underlineOff: [UInt8] = [0x1B, 0x2D, 0x00] // ESC - n (n=0 for off)
        static let resetTextStyles: [UInt8] = [0x1B, 0x21, 0x00] // ESC ! n (Reset font size, equivalent to normal)

        // Alignment
        static let alignLeft: [UInt8] = [0x1B, 0x61, 0x00] // ESC a n (n=0 Left)
        static let alignCenter: [UInt8] = [0x1B, 0x61, 0x01] // ESC a n (n=1 Center)
        static let alignRight: [UInt8] = [0x1B, 0x61, 0x02] // ESC a n (n=2 Right)

        // Paper Control
        static let lineFeed: [UInt8] = [0x0A] // LF
        static let formFeed: [UInt8] = [0x0C] // FF (Usually for page printers, but sometimes used)
        static let cutPaperFull: [UInt8] = [0x1D, 0x56, 0x00] // GS V m (m=0 or 48 for full cut)
        static let cutPaperPartial: [UInt8] = [0x1D, 0x56, 0x01] // GS V m (m=1 or 49 for partial)
        // Alternative cut commands:
        // static let cutPaperFull_alt: [UInt8] = [29, 86, 65, 0]
        // static let cutPaperPartial_alt: [UInt8] = [29, 86, 66, 0]

        // QR Code Commands (Highly printer-specific - consult manual)
        // These are simplified examples; actual implementation might need more steps or different commands.
        // Model 2 is common (0x32). Size (e.g., 3-8). Error Correction L, M, Q, H (0x30-0x33).
        static func setQRCodeModel(_ model: UInt8 = 0x32) -> [UInt8] { // Model 2
             [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, model, 0x00]
        }
        static func setQRCodeSize(_ size: UInt8 = 6) -> [UInt8] { // Size 1-16 (printer specific)
            [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size]
        }
        static func setQRCodeErrorCorrection(_ level: UInt8 = 0x31) -> [UInt8] { // Level M
            [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, level]
        }
        static func storeQRCodeData(_ data: Data) -> [UInt8] {
            let length = data.count + 3
            let pL = UInt8(length & 0xFF)
            let pH = UInt8((length >> 8) & 0xFF)
            return [0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30] + data
        }
        static func printStoredQRCode: [UInt8] = [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]
    }

    // MARK: - Restaurant Details (for receipt headers etc.)
    struct RestaurantDetails {
        let name: String
        let address: String
        let phone: String
        let website: String
        // Add other details your receipt might need
        let defaultDateTimeFormat: String = "yyyy-MM-dd HH:mm:ss" // From your AppConfig
    }

    let restaurantDetails: RestaurantDetails = RestaurantDetails(
        name: "YOUR RESTAURANT NAME",         // <<< Configure
        address: "Your Restaurant Address",    // <<< Configure
        phone: "Your Phone Number",            // <<< Configure
        website: "your-website.com"            // <<< Configure
    )
// } // End of AppConfig
```

---

**2. Printer Service (`Services/PrinterService.swift`)**

This file seems well-structured from your "newest code" for IP-based printing.

```swift
// Services/PrinterService.swift
import Foundation
import Network // For NWConnection

enum PrinterError: Error, LocalizedError {
    case connectionFailed(Error)
    case sendFailed(Error)
    case notConnected
    case configurationError(String)
    case dataEncodingError(String)

    var errorDescription: String? {
        switch self {
        case .connectionFailed(let err): return "Printer connection failed: \(err.localizedDescription)"
        case .sendFailed(let err): return "Failed to send data to printer: \(err.localizedDescription)"
        case .notConnected: return "Not connected to the printer."
        case .configurationError(let msg): return "Printer configuration error: \(msg)"
        case .dataEncodingError(let msg): return "Data encoding error: \(msg)"
        }
    }
}

class PrinterService {
    static let shared = PrinterService() // Singleton
    private var connection: NWConnection?
    // Assuming AppConfig.shared.kitchenPrinter is available
    private let printerConfig = AppConfig.shared.kitchenPrinter

    private init() {} // Private init for singleton

    func connectAndSendData(data: Data) async throws {
        guard !printerConfig.ipAddress.isEmpty, printerConfig.port > 0 else {
            throw PrinterError.configurationError("Printer IP Address or Port is not configured.")
        }
        
        let host = NWEndpoint.Host(printerConfig.ipAddress)
        guard let port = NWEndpoint.Port(rawValue: UInt16(printerConfig.port)) else {
            throw PrinterError.configurationError("Invalid printer port number.")
        }

        // Create a new connection for each print job to ensure fresh state
        let newConnection = NWConnection(host: host, port: port, using: .tcp)
        self.connection = newConnection
        
        print("PrinterService: Attempting to connect to \(printerConfig.ipAddress):\(printerConfig.port)")

        return try await withCheckedThrowingContinuation { continuation in
            newConnection.stateUpdateHandler = { [weak self] newState in
                guard let self = self else { return }
                
                switch newState {
                case .ready:
                    print("PrinterService: Connected to printer.")
                    self.send(connection: newConnection, data: data) { error in
                        if let error = error {
                            continuation.resume(throwing: error)
                        } else {
                            continuation.resume(returning: ())
                        }
                        self.disconnect(connection: newConnection) // Disconnect after sending
                    }
                case .failed(let error):
                    print("PrinterService: Connection failed: \(error.localizedDescription)")
                    continuation.resume(throwing: PrinterError.connectionFailed(error))
                    self.connection = nil // Clear connection on failure
                case .cancelled:
                    print("PrinterService: Connection cancelled.")
                    // If cancellation wasn't intended as success, you might throw an error.
                    self.connection = nil
                default:
                    print("PrinterService: Connection state changed to \(newState)")
                    break
                }
            }
            newConnection.start(queue: .global(qos: .background))
            
            // Timeout for connection attempt (e.g., 5 seconds)
            DispatchQueue.global(qos: .background).asyncAfter(deadline: .now() + 5) {
                if newConnection.state != .ready && newConnection.state != .failed && newConnection.state != .cancelled {
                    print("PrinterService: Connection attempt timed out.")
                    newConnection.cancel() // Cancel the connection
                    // Resume continuation with a timeout error only if it hasn't been resumed yet.
                    // This is tricky with withCheckedThrowingContinuation as it can only be resumed once.
                    // A more robust solution might involve a custom Combine publisher or a flag.
                    // For now, the .failed state handler should catch most OS-level timeouts.
                }
            }
        }
    }

    private func send(connection: NWConnection, data: Data, completion: @escaping (PrinterError?) -> Void) {
        // Note: State check might be redundant if called only from .ready, but good for safety.
        guard connection.state == .ready else {
            completion(PrinterError.notConnected)
            return
        }

        connection.send(content: data, completion: .contentProcessed { error in
            if let error = error {
                print("PrinterService: Send failed: \(error.localizedDescription)")
                completion(PrinterError.sendFailed(error))
            } else {
                print("PrinterService: Data sent successfully.")
                completion(nil)
            }
        })
    }

    private func disconnect(connection: NWConnection) {
        connection.cancel()
        if self.connection === connection { // Only nil out if it's the current one
            self.connection = nil
        }
        print("PrinterService: Connection disconnected/cancelled.")
    }
}
```

---

**3. Print Formatter (`Helpers/PrintFormatter.swift`)**

This file is responsible for taking your `Order` data and converting it into the byte commands. Your existing `PrintFormatter.swift` is a good base.

```swift
// Helpers/PrintFormatter.swift
import Foundation

// Assume Order, OrderItem, AppConfig.OrderStatus, AppConfig.RestaurantDetails, AppConfig.PrinterCommands are defined
// For example:
// struct Order { var id: String?; var orderNumber: String; var tableDisplayString: String; var items: [OrderItem]; ... }
// struct OrderItem { var name: String; var namePrint: String?; var quantity: Int; var unitPrice: Double; var totalPrice: Double; var notes: String?; var status: String; ... }


class PrintFormatter {
    // Assuming AppConfig is a singleton or accessible
    private let config = AppConfig.shared
    private let printerCmd = AppConfig.PrinterCommands.self
    private let numberFormatter: NumberFormatter

    init() {
        numberFormatter = NumberFormatter()
        numberFormatter.numberStyle = .decimal // Use .currency for currency symbols
        numberFormatter.locale = Locale(identifier: "ja_JP") // Or your app's locale
        numberFormatter.currencySymbol = "¥"
        numberFormatter.maximumFractionDigits = 0 // For whole numbers like Yen
    }

    private func stringToShiftJISData(_ string: String) -> Data? {
        // IMPORTANT: Ensure your printer actually uses Shift_JIS.
        // Many modern thermal printers support UTF-8 or other encodings.
        // If your printer supports UTF-8, use: string.data(using: .utf8)
        // Test thoroughly with Japanese and special characters.
        guard let data = string.data(using: .shiftJIS, allowLossyConversion: false) else {
            print("Warning: Could not encode string to Shift-JIS: \(string.prefix(50))")
            // Fallback or error handling if critical characters are lost
            return string.data(using: .ascii, allowLossyConversion: true) // Basic fallback
        }
        return data
    }
    
    private func append(_ data: Data?, to commandData: inout Data) {
        if let data = data {
            commandData.append(data)
        }
    }
    
    private func append(_ string: String, to commandData: inout Data, encoding: String.Encoding = .shiftJIS) {
        if let data = string.data(using: encoding, allowLossyConversion: false) {
            commandData.append(data)
        } else {
            print("Warning: Could not encode string to \(encoding): \(string.prefix(50))")
            if let asciiData = string.data(using: .ascii, allowLossyConversion: true) {
                commandData.append(asciiData) // Fallback to ASCII
            }
        }
    }


    // MARK: - Kitchen Docket / Order Slip
    func formatOrderForKitchen(order: Order) -> Data? {
        var command = Data()
        command.append(Data(printerCmd.initialize))

        // Header: Table Number, Order Number
        command.append(Data(printerCmd.alignCenter))
        command.append(Data(printerCmd.fontSizeDoubleWidthAndHeight)) // Large for table
        command.append(Data(printerCmd.boldOn))
        append("\nTable: \(order.tableDisplayString)\n", to: &command)
        command.append(Data(printerCmd.fontSizeNormal)) // Normal for order number
        append("Order #: \(order.orderNumber)\n", to: &command)
        command.append(Data(printerCmd.boldOff))
        command.append(Data(printerCmd.resetTextStyles)) // Reset to normal
        
        let separator = "----------------------------------------\n" // Adjust width as needed
        append(separator, to: &command)

        // Items
        command.append(Data(printerCmd.alignLeft))
        for item in order.items where item.status != AppConfig.OrderStatus.cancelled && item.status != AppConfig.OrderStatus.removed {
            command.append(Data(printerCmd.boldOn))
            let itemName = item.namePrint ?? item.name // Use print name if available
            append("\(itemName)\n", to: &command)
            command.append(Data(printerCmd.boldOff))

            var itemDetailsLine = "  Qty: \(item.quantity)"
            append("\(itemDetailsLine)\n", to: &command)

            if let notes = item.notes, !notes.isEmpty {
                command.append(Data(printerCmd.boldOn)) // Emphasize notes
                append("    NOTES: \(notes)\n", to: &command)
                command.append(Data(printerCmd.boldOff))
            }
            append("-\n", to: &command) // Small separator between items
        }
        
        append(separator, to: &command)

        // Footer: Timestamp
        command.append(Data(printerCmd.alignLeft))
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = config.restaurantDetails.defaultDateTimeFormat
        append("Printed: \(dateFormatter.string(from: Date()))\n", to: &command)
        
        command.append(Data(printerCmd.lineFeed))
        command.append(Data(printerCmd.lineFeed))
        command.append(Data(printerCmd.cutPaperPartial)) // Or full cut

        return command
    }

    // MARK: - Customer Receipt
    func formatOrderForCustomerReceipt(order: Order, isOfficialReceipt: Bool) -> Data? {
        var command = Data()
        command.append(Data(printerCmd.initialize))

        // Restaurant Header
        command.append(Data(printerCmd.alignCenter))
        command.append(Data(printerCmd.boldOn))
        command.append(Data(printerCmd.fontSizeDoubleHeight)) // Larger for name
        append("\(config.restaurantDetails.name)\n", to: &command)
        command.append(Data(printerCmd.resetTextStyles)) // Back to normal size
        command.append(Data(printerCmd.boldOff))
        append("\(config.restaurantDetails.address)\n", to: &command)
        if !config.restaurantDetails.phone.isEmpty {
            append("Tel: \(config.restaurantDetails.phone)\n", to: &command)
        }
        
        if isOfficialReceipt {
            command.append(Data(printerCmd.lineFeed))
            command.append(Data(printerCmd.boldOn))
            // Use a font size that fits well, maybe double width
            command.append(Data(printerCmd.fontSizeDoubleWidth))
            append("領 収 証\n", to: &command) // "Receipt" in Japanese
            command.append(Data(printerCmd.resetTextStyles))
            command.append(Data(printerCmd.boldOff))
        }

        let separator = "----------------------------------------\n"
        append(separator, to: &command)

        // Order Info
        command.append(Data(printerCmd.alignLeft))
        append("Order #: \(order.orderNumber)\n", to: &command)
        append("Table: \(order.tableDisplayString)\n", to: &command)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = config.restaurantDetails.defaultDateTimeFormat
        append("Date: \(dateFormatter.string(from: order.orderedAt.dateValue()))\n", to: &command) // Assuming order.orderedAt is Timestamp
        
        append(separator, to: &command)
        // Column headers - adjust spacing based on your printer's characters per line
        // Example: "ItemNameHere       Qty  Price   Amount"
        let itemColWidth = 18
        let qtyColWidth = 4
        let priceColWidth = 8
        let amountColWidth = 8
        let headerLine = "Item".padding(toLength: itemColWidth, withPad: " ", startingAt: 0) +
                         "Qty".padding(toLength: qtyColWidth, withPad: " ", startingAt: 0) +
                         "Price".padding(toLength: priceColWidth, withPad: " ", startingAt: 0) +
                         "Total".padding(toLength: amountColWidth, withPad: " ", startingAt: 0) + "\n"
        append(headerLine, to: &command)
        append(separator, to: &command)

        // Items
        for item in order.items where item.status != AppConfig.OrderStatus.cancelled && item.status != AppConfig.OrderStatus.removed {
            let itemName = item.namePrint ?? item.name
            let qtyStr = String(item.quantity)
            let priceStr = numberFormatter.string(from: NSNumber(value: item.unitPrice)) ?? ""
            let totalStr = numberFormatter.string(from: NSNumber(value: item.totalPrice)) ?? ""
            
            var line = itemName.truncate(toLength: itemColWidth-1).padding(toLength: itemColWidth, withPad: " ", startingAt: 0)
            line += qtyStr.leftPad(toLength: qtyColWidth)
            line += priceStr.leftPad(toLength: priceColWidth)
            line += totalStr.leftPad(toLength: amountColWidth)
            line += "\n"
            
            append(line, to: &command)
            
            if let notes = item.notes, !notes.isEmpty {
                append("  Notes: \(notes.truncate(toLength: 30))\n", to: &command) // Indent notes
            }
        }
        append(separator, to: &command)

        // Totals Section
        command.append(Data(printerCmd.alignRight)) // Right align totals
        command.append(Data(printerCmd.boldOn))
        append("Subtotal: \(numberFormatter.string(from: NSNumber(value: order.subtotalAmount)) ?? "")\n", to: &command)
        if order.discountAmount > 0 {
            append("Discount (\(String(format: "%.0f%%", order.discountPercentage))): -\(numberFormatter.string(from: NSNumber(value: order.discountAmount)) ?? "")\n", to: &command)
        }
        // Add Tax, Service Charge lines if applicable in your Order model
        // append("Tax: \(numberFormatter.string(from: NSNumber(value: order.taxAmount)) ?? "")\n", to: &command)

        command.append(Data(printerCmd.fontSizeDoubleWidth)) // Make total amount stand out
        append("Total: \(numberFormatter.string(from: NSNumber(value: order.totalAmount)) ?? "")\n", to: &command)
        command.append(Data(printerCmd.resetTextStyles)) // Reset to normal
        command.append(Data(printerCmd.boldOff))

        // Payment Details
        if order.paymentStatus == .paid || order.paymentStatus == .partiallyPaid {
            if let paymentMethod = order.paymentMethod, !paymentMethod.isEmpty {
                 append("Paid by: \(paymentMethod.capitalized)\n", to: &command)
            }
            if order.amountPaid > 0 { // amountPaid is what the customer handed over
                 append("Amount Received: \(numberFormatter.string(from: NSNumber(value: order.amountPaid)) ?? "")\n", to: &command)
                let changeDue = order.amountPaid - order.totalAmount // totalAmount is what they *should* pay
                if changeDue >= 0 { // Only show change if it's not negative
                    append("Change Due: \(numberFormatter.string(from: NSNumber(value: changeDue)) ?? "")\n", to: &command)
                }
            }
        }
        append(separator, to: &command)

        // Footer Message
        command.append(Data(printerCmd.alignCenter))
        append("Thank you for your visit!\n", to: &command)
        append("お問い合わせはレシート持参の上、お願いします。\n", to: &command) // "Please bring your receipt for inquiries."
        if !config.restaurantDetails.website.isEmpty {
             append("\(config.restaurantDetails.website)\n", to: &command)
        }
        
        // QR Code for order link (optional)
        if let secret = order.secretCode, let orderId = order.id { // Assuming you have a way to build this link
            let orderLink = "\(AppConfig.shared.webAppBaseURL)/order/\(orderId)?secret=\(secret)"
            if let qrData = formatQRCodeForPrinting(dataString: orderLink) {
                command.append(Data(printerCmd.lineFeed))
                command.append(qrData) // This function itself should include print and cut commands
            }
        } else { // If no QR, ensure paper cut
            command.append(Data(printerCmd.lineFeed))
            command.append(Data(printerCmd.lineFeed))
            command.append(Data(printerCmd.cutPaperFull))
        }

        return command
    }
    
    // MARK: - QR Code Generation for Printing
    // This is a basic QR code generation. Refer to your printer's manual for exact commands.
    func formatQRCodeForPrinting(dataString: String, size: UInt8 = 6) -> Data? {
        guard let contentData = dataString.data(using: .ascii) else { // QR content typically ASCII/ISO-8859-1
            print("Error: Could not encode QR data string to ASCII.")
            return nil
        }
        
        var qrCommands = Data()
        // Some printers need initialization before QR, others don't.
        // qrCommands.append(Data(printerCmd.initialize)) // Optional: re-initialize if needed
        
        qrCommands.append(Data(printerCmd.alignCenter)) // Center the QR code

        // 1. Set QR Code Model (usually Model 2)
        qrCommands.append(Data(printerCmd.setQRCodeModel()))
        // 2. Set QR Code Cell Size
        qrCommands.append(Data(printerCmd.setQRCodeSize(size))) // size: e.g., 1-16, typical 4-8
        // 3. Set QR Code Error Correction Level (e.g., L, M, Q, H) - Level M (0x31) is common
        qrCommands.append(Data(printerCmd.setQRCodeErrorCorrection(0x31)))
        // 4. Store QR Code Data
        qrCommands.append(Data(printerCmd.storeQRCodeData(contentData)))
        // 5. Print Stored QR Code
        qrCommands.append(Data(printerCmd.printStoredQRCode))
        
        // Add some line feeds and cut paper
        qrCommands.append(Data(printerCmd.lineFeed))
        qrCommands.append(Data(printerCmd.lineFeed))
        qrCommands.append(Data(printerCmd.cutPaperFull)) // Or partial cut
        
        return qrCommands
    }
}

// Helper String extensions for padding and truncation
extension String {
    func leftPad(toLength length: Int, withPad character: Character = " ") -> String {
        let stringLength = self.count
        if stringLength < length {
            return String(repeating: character, count: length - stringLength) + self
        } else {
            return String(self.suffix(length))
        }
    }

    func truncate(toLength length: Int, trailing: String = "…") -> String {
        if self.count > length {
            return String(self.prefix(length - trailing.count)) + trailing
        } else {
            return self
        }
    }
}
```

---

**4. Optional: Bluetooth Printing (`Helpers/BluetoothManager.swift` from old code)**

If you might need Bluetooth printing later, you can extract this. It's more complex due to CoreBluetooth delegate methods.

```swift
// Helpers/BluetoothManager.swift (Optional, for Bluetooth printing)
import CoreBluetooth

// NOTE: This is a basic implementation. Robust Bluetooth printing requires:
// - Proper error handling for all delegate methods.
// - Discovering the correct writable characteristic for your printer.
// - Handling disconnections and reconnections.
// - Managing print data chunking if it exceeds characteristic's max write length.
// - UI for selecting the printer if multiple are found.

class BluetoothPrinterManager: NSObject, ObservableObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    private var centralManager: CBCentralManager?
    private var printerPeripheral: CBPeripheral?
    private var writableCharacteristic: CBCharacteristic?

    @Published var isScanning = false
    @Published var isConnected = false
    @Published var printerName: String? = "Not Connected"
    @Published var discoveredPeripherals: [CBPeripheral] = [] // For UI selection

    // Store the printer's name or identifier from AppConfig or user settings
    private let targetPrinterNameSubstring = AppConfig.shared.kitchenPrinter.name // e.g., "Printer001"

    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }

    func startScan() {
        guard centralManager?.state == .poweredOn else {
            print("Bluetooth is not powered on.")
            // Optionally, trigger an alert to the user
            return
        }
        print("Starting scan for peripherals...")
        isScanning = true
        discoveredPeripherals.removeAll()
        // Scan for peripherals that advertise services (nil for all, or specific service UUIDs if known)
        centralManager?.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        
        // Stop scan after a timeout to save power
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
            if self?.isScanning == true {
                self?.stopScan()
                print("Scan timed out.")
            }
        }
    }

    func stopScan() {
        centralManager?.stopScan()
        isScanning = false
        print("Scan stopped.")
    }

    func connect(to peripheral: CBPeripheral) {
        if printerPeripheral != peripheral && printerPeripheral?.state == .connected {
            centralManager?.cancelPeripheralConnection(printerPeripheral!)
        }
        printerPeripheral = peripheral
        centralManager?.connect(peripheral, options: nil)
        print("Connecting to \(peripheral.name ?? "unknown peripheral")...")
    }
    
    func disconnect() {
        if let peripheral = printerPeripheral, peripheral.state == .connected {
            centralManager?.cancelPeripheralConnection(peripheral)
        }
    }

    func printData(_ data: Data) {
        guard let peripheral = printerPeripheral,
              peripheral.state == .connected,
              let characteristic = writableCharacteristic else {
            print("Not connected to a printer or writable characteristic not found.")
            // TODO: Handle error - e.g., try to reconnect or alert user
            return
        }

        // Determine write type (with or without response)
        let writeType: CBCharacteristicWriteType = characteristic.properties.contains(.write) ? .withResponse : .withoutResponse
        
        // Max write length (common values, but printer-specific)
        let maxWriteLength = peripheral.maximumWriteValueLength(for: writeType)
        
        var offset = 0
        while offset < data.count {
            let chunkSize = min(maxWriteLength, data.count - offset)
            let chunk = data.subdata(in: offset..<(offset + chunkSize))
            peripheral.writeValue(chunk, for: characteristic, type: writeType)
            offset += chunkSize
            print("Sent chunk of size \(chunkSize)")
        }
        print("Finished sending data to Bluetooth printer.")
    }

    // MARK: - CBCentralManagerDelegate Methods
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("Bluetooth is On.")
            // Optionally start scanning automatically if a printer was previously connected/configured
            // startScan()
        case .poweredOff:
            print("Bluetooth is Off.")
            isConnected = false
            printerName = "Bluetooth Off"
        case .resetting:
            print("Bluetooth is resetting.")
        case .unauthorized:
            print("Bluetooth use is not authorized.")
        case .unknown:
            print("Bluetooth state is unknown.")
        case .unsupported:
            print("Bluetooth is not supported on this device.")
        @unknown default:
            print("A new CBCentralManager.State case has been added.")
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        print("Discovered: \(peripheral.name ?? "No Name") (RSSI: \(RSSI))")
        if !discoveredPeripherals.contains(where: { $0.identifier == peripheral.identifier }) {
            discoveredPeripherals.append(peripheral)
        }

        // Example: Auto-connect if name matches
        if let name = peripheral.name, name.contains(targetPrinterNameSubstring) {
            stopScan() // Stop scanning once target is found
            connect(to: peripheral)
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        print("Connected to: \(peripheral.name ?? "No Name")")
        isConnected = true
        printerName = peripheral.name ?? "Unknown Printer"
        printerPeripheral = peripheral
        peripheral.delegate = self
        // Discover services - use specific service UUIDs if known for your printer (e.g., for printing service)
        peripheral.discoverServices(nil) 
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        print("Failed to connect to \(peripheral.name ?? "No Name"): \(error?.localizedDescription ?? "Unknown error")")
        isConnected = false
        printerName = "Connection Failed"
    }
    
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        print("Disconnected from \(peripheral.name ?? "No Name"): \(error?.localizedDescription ?? "No error")")
        isConnected = false
        printerName = "Disconnected"
        writableCharacteristic = nil
        printerPeripheral = nil
        // Optionally try to rescan or alert user
    }

    // MARK: - CBPeripheralDelegate Methods
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        if let error = error {
            print("Error discovering services: \(error.localizedDescription)")
            return
        }
        guard let services = peripheral.services else { return }
        print("Found \(services.count) services for \(peripheral.name ?? "")")
        for service in services {
            print("Discovering characteristics for service: \(service.uuid)")
            // Discover characteristics - use specific characteristic UUIDs if known (e.g., for writable print characteristic)
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        if let error = error {
            print("Error discovering characteristics for service \(service.uuid): \(error.localizedDescription)")
            return
        }
        guard let characteristics = service.characteristics else { return }
        print("Found \(characteristics.count) characteristics for service \(service.uuid)")

        for characteristic in characteristics {
            print("Characteristic: \(characteristic.uuid), Properties: \(characteristic.properties)")
            // Check if this characteristic is the one for printing (writable)
            // This often requires knowing the specific UUID from printer documentation, or experimenting.
            // Common properties for a writable characteristic: .write, .writeWithoutResponse
            if characteristic.properties.contains(.write) || characteristic.properties.contains(.writeWithoutResponse) {
                // Heuristic: Choose the first writable characteristic found.
                // For robust solutions, you might need to identify the correct one by its UUID.
                if writableCharacteristic == nil { // Take the first one
                    print("Found writable characteristic: \(characteristic.uuid)")
                    writableCharacteristic = characteristic
                    // You might notify your UI that the printer is ready to print
                    // If you have data queued, you can send it now.
                }
            }
        }
    }

    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            print("Error writing value to characteristic \(characteristic.uuid): \(error.localizedDescription)")
            // Handle write error
            return
        }
        print("Successfully wrote value to characteristic \(characteristic.uuid)")
        // If you're chunking data, send the next chunk here or confirm completion.
    }
}

// Helper to print characteristic properties (for debugging)
extension CBCharacteristicProperties {
    var names: [String] {
        var names = [String]()
        if contains(.broadcast) { names.append("Broadcast") }
        if contains(.read) { names.append("Read") }
        if contains(.writeWithoutResponse) { names.append("WriteWithoutResponse") }
        if contains(.write) { names.append("Write") }
        if contains(.notify) { names.append("Notify") }
        if contains(.indicate) { names.append("Indicate") }
        if contains(.authenticatedSignedWrites) { names.append("AuthenticatedSignedWrites") }
        if contains(.extendedProperties) { names.append("ExtendedProperties") }
        if contains(.notifyEncryptionRequired) { names.append("NotifyEncryptionRequired") }
        if contains(.indicateEncryptionRequired) { names.append("IndicateEncryptionRequired") }
        return names
    }
}
```

---

**How to Use in Your New App:**

1.  **Configuration:**
    *   Ensure your new app has an `AppConfig.swift` (or similar) with the `Printer`, `PrinterCommands`, and `RestaurantDetails` structs and instances populated with your specific values.
2.  **Services:**
    *   Add `PrinterService.swift` to your `Services` folder.
    *   Add `PrintFormatter.swift` to your `Helpers` or `Services` folder.
3.  **Models:**
    *   Make sure your new app has `Order` and `OrderItem` models that `PrintFormatter` can use. The structure should be compatible with how `PrintFormatter` accesses properties (e.g., `order.orderNumber`, `item.name`, `item.quantity`, etc.).
4.  **ViewModel Integration (Example):**
    ```swift
    // In your ViewModel that handles printing (e.g., an OrdersViewModel)
    // @MainActor
    class YourViewModel: ObservableObject {
        private let printerService = PrinterService.shared
        private let printFormatter = PrintFormatter()
        @Published var isPrinting = false
        @Published var printError: String?

        func printOrderToKitchen(order: Order) async {
            isPrinting = true
            printError = nil
            
            guard let printData = printFormatter.formatOrderForKitchen(order: order) else {
                printError = "Failed to format order data for printing."
                isPrinting = false
                return
            }

            do {
                try await printerService.connectAndSendData(data: printData)
                // Handle success (e.g., update order status in Firestore)
                print("Order sent to kitchen printer successfully.")
            } catch {
                print("Printing failed: \(error.localizedDescription)")
                printError = "Printing failed: \(error.localizedDescription)"
            }
            isPrinting = false
        }
        
        func printCustomerReceipt(order: Order, isOfficial: Bool) async {
            isPrinting = true
            printError = nil
            
            guard let printData = printFormatter.formatOrderForCustomerReceipt(order: order, isOfficialReceipt: isOfficial) else {
                printError = "Failed to format receipt data for printing."
                isPrinting = false
                return
            }
            // ... similar try/catch block as printOrderToKitchen ...
            do {
                try await printerService.connectAndSendData(data: printData)
                print("Receipt sent to printer successfully.")
            } catch {
                print("Receipt printing failed: \(error.localizedDescription)")
                printError = "Receipt printing failed: \(error.localizedDescription)"
            }
            isPrinting = false
        }
    }
    ```
5.  **Bluetooth (If using `BluetoothPrinterManager`):**
    *   Add `BluetoothPrinterManager.swift` to your project.
    *   Your app will need to request Bluetooth permissions in `Info.plist`:
        *   `Privacy - Bluetooth Always Usage Description`
        *   `Privacy - Bluetooth Peripheral Usage Description`
    *   You'll need UI elements to trigger `startScan()`, display `discoveredPeripherals`, allow the user to `connect(to: peripheral)`, and then call `printData(_:)`. This is a more involved UI setup than IP printing.

Remember to **thoroughly test** with your actual printer, especially the ESC/POS commands and character encoding in `PrintFormatter`. Printer behavior can vary significantly.
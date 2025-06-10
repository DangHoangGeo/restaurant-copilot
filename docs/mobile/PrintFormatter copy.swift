import Foundation

// MARK: - Print Formatter
class PrintFormatter {
    private let config = PrinterConfig.shared
    private let settingsManager = PrinterSettingsManager.shared
    private let commands = PrinterConfig.Commands.self
    private let layout = PrinterConfig.Layout.self
    private let numberFormatter: NumberFormatter
    
    init() {
        numberFormatter = NumberFormatter()
        numberFormatter.numberStyle = .decimal
        numberFormatter.locale = Locale(identifier: "ja_JP")
        numberFormatter.currencySymbol = "¥"
        numberFormatter.maximumFractionDigits = 0
    }
    
    // MARK: - String Encoding Helper
    private func stringToData(_ string: String) -> Data? {
        // Use UTF-8 for modern thermal printers, fallback to Shift_JIS if needed
        guard let data = string.data(using: .utf8) else {
            print("Warning: Could not encode string to UTF-8: \(string.prefix(50))")
            return string.data(using: .ascii, allowLossyConversion: true)
        }
        return data
    }
    
    private func append(_ data: Data?, to commandData: inout Data) {
        if let data = data {
            commandData.append(data)
        }
    }
    
    private func append(_ string: String, to commandData: inout Data) {
        if let data = stringToData(string) {
            commandData.append(data)
        }
    }
    
    // MARK: - Kitchen Order Formatting
    func formatOrderForKitchen(order: Order) -> Data? {
        var command = Data()
        command.append(Data(commands.initialize))
        
        // Header: Table Number and Order Info
        command.append(Data(commands.alignCenter))
        command.append(Data(commands.fontSizeDoubleWidthAndHeight))
        command.append(Data(commands.boldOn))
        
        let tableInfo = order.table?.name ?? "Table \(order.table?.name ?? "T00")"
        append("\n\(tableInfo)\n", to: &command)
        
        command.append(Data(commands.fontSizeNormal))
        append("Order #: \(order.id.prefix(8))\n", to: &command)
        append("Guests: \(order.guest_count)\n", to: &command)
        command.append(Data(commands.boldOff))
        command.append(Data(commands.resetTextStyles))
        
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        append(separator, to: &command)
        
        // Items for Kitchen
        command.append(Data(commands.alignLeft))
        if let items = order.order_items {
            for item in items where item.status.rawValue != "cancelled" {
                command.append(Data(commands.boldOn))
                let itemName = item.menu_item?.name_en ?? "Unknown Item"
                append("\(itemName)\n", to: &command)
                command.append(Data(commands.boldOff))
                
                append("  Qty: \(item.quantity)\n", to: &command)
                
                if let notes = item.notes, !notes.isEmpty {
                    command.append(Data(commands.boldOn))
                    append("    NOTES: \(notes)\n", to: &command)
                    command.append(Data(commands.boldOff))
                }
                
                append("-\n", to: &command)
            }
        }
        
        append(separator, to: &command)
        
        // Footer with timestamp
        command.append(Data(commands.alignLeft))
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = settingsManager.restaurantSettings.dateTimeFormat
        append("Printed: \(dateFormatter.string(from: Date()))\n", to: &command)
        
        command.append(Data(commands.lineFeed))
        command.append(Data(commands.lineFeed))
        command.append(Data(commands.cutPaperPartial))
        
        return command
    }

    func formatKitchenSummary(_ group: GroupedItem) -> Data {
        var content = ""
        
        // Header
        content += "================================\n"
        content += "        KITCHEN ORDER\n"
        content += "================================\n\n"
        
        // Item details
        content += "ITEM: \(group.itemName)\n"
        content += "QTY:  \(group.quantity)\n"
        content += "CATEGORY: \(group.categoryName)\n\n"
        
        // Tables
        let tablesList = Array(group.tables).sorted().joined(separator: ", ")
        content += "TABLES: \(tablesList)\n\n"
        
        // Notes (if any)
        if let notes = group.notes, !notes.isEmpty {
            content += "NOTES:\n"
            content += "\(notes)\n\n"
        }
        
        // Status
        content += "STATUS: \(group.status.rawValue.uppercased())\n"
        
        // Priority indicator
        if group.priority >= 4 {
            content += "\n*** URGENT - HIGH PRIORITY ***\n"
        }
        
        // Time information
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        content += "\nORDER TIME: \(formatter.string(from: group.orderTime))\n"
        
        // Footer
        content += "\n================================\n"
        content += "    Printed: \(formatter.string(from: Date()))\n"
        content += "================================\n\n\n"
        
        // Convert to Data with proper encoding for thermal printers
        return formatForThermalPrinter(content)
    }

    // MARK: - Private Helper Methods
    
    /// Formats text content for thermal printer with proper encoding and control codes
    /// - Parameter content: The text content to format
    /// - Returns: Data formatted for thermal printer
    private func formatForThermalPrinter(_ content: String) -> Data {
        var data = Data()
        
        // ESC/POS commands for thermal printers
        let ESC: UInt8 = 0x1B
        let GS: UInt8 = 0x1D
        
        // Initialize printer
        data.append(ESC)
        data.append(0x40) // Initialize
        
        // Set character size (normal)
        data.append(ESC)
        data.append(0x21)
        data.append(0x00)
        
        // Set alignment to center for header
        data.append(ESC)
        data.append(0x61)
        data.append(0x01)
        
        // Add the formatted content
        if let contentData = content.data(using: .utf8) {
            data.append(contentData)
        }
        
        // Cut paper (partial cut)
        data.append(GS)
        data.append(0x56)
        data.append(0x01)
        
        return data
    }
    
    // MARK: - Customer Receipt Formatting
    func formatCustomerReceipt(order: Order, isOfficial: Bool = false) -> Data? {
        var command = Data()
        command.append(Data(commands.initialize))
        
        let restaurantSettings = settingsManager.restaurantSettings
        
        // Restaurant Header
        command.append(Data(commands.alignCenter))
        command.append(Data(commands.boldOn))
        command.append(Data(commands.fontSizeDoubleHeight))
        append("\(restaurantSettings.name)\n", to: &command)
        command.append(Data(commands.resetTextStyles))
        command.append(Data(commands.boldOff))
        
        append("\(restaurantSettings.address)\n", to: &command)
        if !restaurantSettings.phone.isEmpty {
            append("Tel: \(restaurantSettings.phone)\n", to: &command)
        }
        
        if isOfficial {
            command.append(Data(commands.lineFeed))
            command.append(Data(commands.boldOn))
            command.append(Data(commands.fontSizeDoubleWidth))
            append("領 収 証\n", to: &command) // "Receipt" in Japanese
            command.append(Data(commands.resetTextStyles))
            command.append(Data(commands.boldOff))
        }
        
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        append(separator, to: &command)
        
        // Order Information
        command.append(Data(commands.alignLeft))
        append("Order #: \(order.id.prefix(8))\n", to: &command)
        let tableInfo = order.table?.name ?? "Table \(order.table?.name ?? "T00")"
        append("Table: \(tableInfo)\n", to: &command)
        append("Guests: \(order.guest_count)\n", to: &command)
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = restaurantSettings.dateTimeFormat
        append("Date: \(dateFormatter.string(from: Date()))\n", to: &command)
        
        append(separator, to: &command)
        
        // Column Headers
        let headerLine = "Item".padding(toLength: layout.itemNameWidth, withPad: " ", startingAt: 0) +
                        "Qty".padding(toLength: layout.quantityWidth, withPad: " ", startingAt: 0) +
                        "Price".padding(toLength: layout.priceWidth, withPad: " ", startingAt: 0) +
                        "Total".padding(toLength: layout.totalWidth, withPad: " ", startingAt: 0) + "\n"
        append(headerLine, to: &command)
        append(String(repeating: "-", count: layout.receiptWidth) + "\n", to: &command)
        
        // Order Items
        var subtotal: Double = 0
        if let items = order.order_items {
            for item in items where item.status.rawValue != "cancelled" {
                let itemName = item.menu_item?.name_en ?? "Unknown Item"
                let price = item.menu_item?.price ?? 0
                let total = price * Double(item.quantity)
                subtotal += total
                
                let qtyStr = String(item.quantity)
                let priceStr = numberFormatter.string(from: NSNumber(value: price)) ?? ""
                let totalStr = numberFormatter.string(from: NSNumber(value: total)) ?? ""
                
                var line = itemName.truncate(toLength: layout.itemNameWidth-1)
                    .padding(toLength: layout.itemNameWidth, withPad: " ", startingAt: 0)
                line += qtyStr.leftPad(toLength: layout.quantityWidth)
                line += priceStr.leftPad(toLength: layout.priceWidth)
                line += totalStr.leftPad(toLength: layout.totalWidth)
                line += "\n"
                
                append(line, to: &command)
                
                if let notes = item.notes, !notes.isEmpty {
                    append("  Notes: \(notes.truncate(toLength: 30))\n", to: &command)
                }
            }
        }
        
        append(separator, to: &command)
        
        // Totals Section
        command.append(Data(commands.alignRight))
        command.append(Data(commands.boldOn))
        
        let subtotalStr = numberFormatter.string(from: NSNumber(value: subtotal)) ?? ""
        append("Subtotal: ¥\(subtotalStr)\n", to: &command)
        
        // Use order total if available, otherwise use calculated subtotal
        let finalTotal = order.total_amount ?? subtotal
        let totalStr = numberFormatter.string(from: NSNumber(value: finalTotal)) ?? ""
        
        command.append(Data(commands.fontSizeDoubleWidth))
        append("Total: ¥\(totalStr)\n", to: &command)
        command.append(Data(commands.resetTextStyles))
        command.append(Data(commands.boldOff))
        
        append(separator, to: &command)
        
        // Footer Message
        command.append(Data(commands.alignCenter))
        append("Thank you for your visit!\n", to: &command)
        append("ありがとうございました！\n", to: &command)
        
        if !restaurantSettings.website.isEmpty {
            append("\(restaurantSettings.website)\n", to: &command)
        }
        
        command.append(Data(commands.lineFeed))
        command.append(Data(commands.lineFeed))
        command.append(Data(commands.cutPaperFull))
        
        return command
    }
    
    // MARK: - Test Receipt
    func formatTestReceipt() -> Data {
        var command = Data()
        command.append(Data(commands.initialize))
        
        let restaurantSettings = settingsManager.restaurantSettings
        let printerConfig = settingsManager.getCurrentPrinterConfig()
        
        command.append(Data(commands.alignCenter))
        command.append(Data(commands.boldOn))
        command.append(Data(commands.fontSizeDoubleHeight))
        append("SOder Test Receipt\n", to: &command)
        command.append(Data(commands.resetTextStyles))
        command.append(Data(commands.boldOff))
        
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        append(separator, to: &command)
        
        command.append(Data(commands.alignLeft))
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = restaurantSettings.dateTimeFormat
        append("Date: \(dateFormatter.string(from: Date()))\n", to: &command)
        append("Restaurant: \(restaurantSettings.name)\n", to: &command)
        append("Printer: \(printerConfig.name)\n", to: &command)
        
        if settingsManager.isUsingDefaultPrinter() {
            append("⚠️  Using default printer settings\n", to: &command)
            append("Configure your printer in settings\n", to: &command)
        }
        
        append("\n", to: &command)
        append("This is a test print to verify\n", to: &command)
        append("your printer connection.\n", to: &command)
        append("\n", to: &command)
        append("If you can read this message,\n", to: &command)
        append("your printer is working correctly!\n", to: &command)
        
        append(separator, to: &command)
        
        command.append(Data(commands.lineFeed))
        command.append(Data(commands.lineFeed))
        command.append(Data(commands.cutPaperPartial))
        
        return command
    }
    
    // MARK: - Kitchen Test Receipt
    func formatKitchenTestReceipt() -> Data {
        var command = Data()
        command.append(Data(commands.initialize))
        
        command.append(Data(commands.alignCenter))
        command.append(Data(commands.boldOn))
        command.append(Data(commands.fontSizeDoubleWidthAndHeight))
        append("KITCHEN PRINTER TEST\n", to: &command)
        command.append(Data(commands.resetTextStyles))
        command.append(Data(commands.boldOff))
        
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        append(separator, to: &command)
        
        command.append(Data(commands.alignLeft))
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "HH:mm:ss"
        append("Time: \(dateFormatter.string(from: Date()))\n", to: &command)
        append("Table: Test Table\n", to: &command)
        append("Order #: TEST001\n", to: &command)
        append("Guests: 2\n", to: &command)
        
        append(separator, to: &command)
        
        // Sample Kitchen Items
        command.append(Data(commands.boldOn))
        append("Ramen Bowl\n", to: &command)
        command.append(Data(commands.boldOff))
        append("  Qty: 2\n", to: &command)
        append("  NOTES: Extra spicy, no green onions\n", to: &command)
        append("-\n", to: &command)
        
        command.append(Data(commands.boldOn))
        append("Gyoza\n", to: &command)
        command.append(Data(commands.boldOff))
        append("  Qty: 1\n", to: &command)
        append("-\n", to: &command)
        
        append(separator, to: &command)
        
        command.append(Data(commands.alignCenter))
        command.append(Data(commands.boldOn))
        append("KITCHEN PRINTER WORKING!\n", to: &command)
        command.append(Data(commands.boldOff))
        
        command.append(Data(commands.lineFeed))
        command.append(Data(commands.lineFeed))
        command.append(Data(commands.cutPaperPartial))
        
        return command
    }
    
    // MARK: - Checkout Test Receipt  
    func formatCheckoutTestReceipt() -> Data {
        var command = Data()
        command.append(Data(commands.initialize))
        
        let restaurantSettings = settingsManager.restaurantSettings
        
        // Restaurant Header
        command.append(Data(commands.alignCenter))
        command.append(Data(commands.boldOn))
        command.append(Data(commands.fontSizeDoubleHeight))
        append("\(restaurantSettings.name)\n", to: &command)
        command.append(Data(commands.resetTextStyles))
        command.append(Data(commands.boldOff))
        
        append("\(restaurantSettings.address)\n", to: &command)
        if !restaurantSettings.phone.isEmpty {
            append("Tel: \(restaurantSettings.phone)\n", to: &command)
        }
        
        command.append(Data(commands.lineFeed))
        command.append(Data(commands.boldOn))
        append("CHECKOUT PRINTER TEST\n", to: &command)
        command.append(Data(commands.boldOff))
        
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        append(separator, to: &command)
        
        // Test Receipt Details
        command.append(Data(commands.alignLeft))
        append("Order #: TEST001\n", to: &command)
        append("Table: Test Table\n", to: &command)
        append("Guests: 2\n", to: &command)
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = restaurantSettings.dateTimeFormat
        append("Date: \(dateFormatter.string(from: Date()))\n", to: &command)
        
        append(separator, to: &command)
        
        // Column Headers
        let headerLine = "Item".padding(toLength: layout.itemNameWidth, withPad: " ", startingAt: 0) +
                        "Qty".padding(toLength: layout.quantityWidth, withPad: " ", startingAt: 0) +
                        "Price".padding(toLength: layout.priceWidth, withPad: " ", startingAt: 0) +
                        "Total".padding(toLength: layout.totalWidth, withPad: " ", startingAt: 0) + "\n"
        append(headerLine, to: &command)
        append(String(repeating: "-", count: layout.receiptWidth) + "\n", to: &command)
        
        // Sample Items
        let testItems = [
            ("Ramen Bowl", 2, 1200.0),
            ("Gyoza", 1, 600.0),
            ("Green Tea", 2, 300.0)
        ]
        
        var subtotal: Double = 0
        for (itemName, qty, price) in testItems {
            let total = price * Double(qty)
            subtotal += total
            
            let qtyStr = String(qty)
            let priceStr = numberFormatter.string(from: NSNumber(value: price)) ?? ""
            let totalStr = numberFormatter.string(from: NSNumber(value: total)) ?? ""
            
            var line = itemName.truncate(toLength: layout.itemNameWidth-1)
                .padding(toLength: layout.itemNameWidth, withPad: " ", startingAt: 0)
            line += qtyStr.leftPad(toLength: layout.quantityWidth)
            line += priceStr.leftPad(toLength: layout.priceWidth)
            line += totalStr.leftPad(toLength: layout.totalWidth)
            line += "\n"
            
            append(line, to: &command)
        }
        
        append(separator, to: &command)
        
        // Totals Section
        command.append(Data(commands.alignRight))
        command.append(Data(commands.boldOn))
        
        let subtotalStr = numberFormatter.string(from: NSNumber(value: subtotal)) ?? ""
        append("Subtotal: ¥\(subtotalStr)\n", to: &command)
        
        command.append(Data(commands.fontSizeDoubleWidth))
        append("Total: ¥\(subtotalStr)\n", to: &command)
        command.append(Data(commands.resetTextStyles))
        command.append(Data(commands.boldOff))
        
        append(separator, to: &command)
        
        // Test Footer
        command.append(Data(commands.alignCenter))
        command.append(Data(commands.boldOn))
        append("CHECKOUT PRINTER WORKING!\n", to: &command)
        command.append(Data(commands.boldOff))
        append("Thank you for testing!\n", to: &command)
        
        command.append(Data(commands.lineFeed))
        command.append(Data(commands.lineFeed))
        command.append(Data(commands.cutPaperFull))
        
        return command
    }
    
}

// MARK: - String Extensions
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

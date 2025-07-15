import Foundation

// MARK: - Print Content Models
struct PrintContent {
    let sections: [PrintSection]
    let settings: PrintSettings
}

struct PrintSection {
    let content: String
    let alignment: PrintAlignment
    let style: PrintStyle
}

struct PrintSettings {
    let cutType: CutType
    let paperWidth: Int
    
    enum CutType {
        case partial, full, none
    }
}

enum PrintAlignment {
    case left, center, right
}

struct PrintStyle {
    let isBold: Bool
    let fontSize: FontSize
    
    enum FontSize {
        case normal, doubleWidth, doubleHeight, doubleWidthAndHeight
    }
}

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
    
    // MARK: - Public Formatting Methods
    
    func formatOrderForKitchen(order: Order) -> Data? {
        let content = generateKitchenOrderContent(order: order)
        return formatForThermalPrinter(content)
    }
    
    func formatCustomerReceipt(order: Order, isOfficial: Bool = false) -> Data? {
        let content = generateCustomerReceiptContent(order: order, isOfficial: isOfficial)
        return formatForThermalPrinter(content)
    }
    
    func formatKitchenSummary(_ group: GroupedItem) -> Data {
        let content = generateKitchenSummaryContent(group: group)
        return formatForThermalPrinter(content)
    }
    
    func formatTestReceipt() -> Data {
        let content = generateTestReceiptContent()
        return formatForThermalPrinter(content)
    }
    
    func formatKitchenTestReceipt() -> Data {
        let content = generateKitchenTestContent()
        return formatForThermalPrinter(content)
    }
    
    func formatCheckoutTestReceipt() -> Data {
        let content = generateCheckoutTestContent()
        return formatForThermalPrinter(content)
    }
    
    // MARK: - Checkout Receipt Formatting
    func formatCheckoutReceipt(_ receiptData: CheckoutReceiptData) -> Data {
        let content = generateCheckoutReceiptPrintContent(receiptData)
        return formatForThermalPrinter(content)
    }
    
    // MARK: - Unified Thermal Printer Formatter
    
    private func formatForThermalPrinter(_ content: String) -> Data {
        var command = Data()
        
        // Initialize printer
        command.append(Data(commands.initialize))
        
        // Set alignment to left by default
        command.append(Data(commands.alignLeft))
        
        // Add the formatted content
        append(content, to: &command)
        
        // Cut paper (partial cut)
        command.append(Data(commands.cutPaperPartial))
        
        return command
    }
    
    internal func formatForThermalPrinter(_ printContent: PrintContent) -> Data {
        var command = Data()
        
        // Initialize printer
        command.append(Data(commands.initialize))
        
        // Process each section
        for section in printContent.sections {
            // Set alignment
            switch section.alignment {
            case .left:
                command.append(Data(commands.alignLeft))
            case .center:
                command.append(Data(commands.alignCenter))
            case .right:
                command.append(Data(commands.alignRight))
            }
            
            // Set font style
            if section.style.isBold {
                command.append(Data(commands.boldOn))
            }
            
            // Set font size
            switch section.style.fontSize {
            case .normal:
                command.append(Data(commands.fontSizeNormal))
            case .doubleWidth:
                command.append(Data(commands.fontSizeDoubleWidth))
            case .doubleHeight:
                command.append(Data(commands.fontSizeDoubleHeight))
            case .doubleWidthAndHeight:
                command.append(Data(commands.fontSizeDoubleWidthAndHeight))
            }
            
            // Add content
            append(section.content, to: &command)
            
            // Reset styles after each section
            if section.style.isBold {
                command.append(Data(commands.boldOff))
            }
            command.append(Data(commands.resetTextStyles))
        }
        
        // Handle cutting
        switch printContent.settings.cutType {
        case .partial:
            command.append(Data(commands.cutPaperPartial))
        case .full:
            command.append(Data(commands.cutPaperFull))
        case .none:
            break
        }
        
        return command
    }
    
    // MARK: - Content Generation Methods
    
    private func generateKitchenOrderContent(order: Order) -> PrintContent {
        var sections: [PrintSection] = []
        
        // Header
        let tableInfo = order.table?.name ?? "Table \(order.table?.name ?? "T00")"
        sections.append(PrintSection(
            content: "\n\(tableInfo)\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .doubleWidthAndHeight)
        ))
        
        // Order info
        let orderInfo = "Order #: \(order.id.prefix(8))\nGuests: \(order.guest_count)\n"
        sections.append(PrintSection(
            content: orderInfo,
            alignment: .center,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Separator
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Items
        var itemsContent = ""
        if let items = order.order_items {
            for item in items where item.status.rawValue != "cancelled" {
                let itemName = getItemDisplayName(for: item)
                itemsContent += "\(itemName)\n"
                itemsContent += "  Qty: \(item.quantity)\n"
                
                if let notes = item.notes, !notes.isEmpty {
                    itemsContent += "    NOTES: \(notes)\n"
                }
                itemsContent += "-\n"
            }
        }
        
        sections.append(PrintSection(
            content: itemsContent,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Footer
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = settingsManager.restaurantSettings.dateTimeFormat
        let timestamp = "Printed: \(dateFormatter.string(from: Date()))\n\n\n"
        sections.append(PrintSection(
            content: timestamp,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        return PrintContent(
            sections: sections,
            settings: PrintSettings(cutType: .partial, paperWidth: layout.receiptWidth)
        )
    }
    
    private func generateKitchenSummaryContent(group: GroupedItem) -> PrintContent {
        var sections: [PrintSection] = []
        
        // Header
        sections.append(PrintSection(
            content: "KITCHEN SUMMARY\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .doubleWidthAndHeight)
        ))
        
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Time
        let dateFormatter = DateFormatter()
        dateFormatter.timeStyle = .short
        let timeInfo = "Time: \(dateFormatter.string(from: Date()))\n\n"
        sections.append(PrintSection(
            content: timeInfo,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Item details
        let itemInfo = "ITEM: \(group.itemName)\nTOTAL QUANTITY: \(group.quantity)\n"
        sections.append(PrintSection(
            content: itemInfo,
            alignment: .left,
            style: PrintStyle(isBold: true, fontSize: .normal)
        ))
        
        // Tables
        let divider = String(repeating: "-", count: layout.receiptWidth) + "\n"
        var tablesContent = divider + "TABLES:\n"
        for table in group.tables.sorted() {
            tablesContent += "\(table)\n"
        }
        
        // Notes
        if let notes = group.notes, !notes.isEmpty {
            tablesContent += "\nNOTES:\n\(notes)\n"
        }
        
        // Status and Priority
        tablesContent += "\nSTATUS: \(group.status.rawValue.uppercased())\n"
        
        if group.priority >= 4 {
            tablesContent += "\n*** URGENT - HIGH PRIORITY ***\n"
        }
        
        sections.append(PrintSection(
            content: tablesContent,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Footer
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "STATUS: COMPLETED\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "\n\n",
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        return PrintContent(
            sections: sections,
            settings: PrintSettings(cutType: .partial, paperWidth: layout.receiptWidth)
        )
    }
    
    private func generateCustomerReceiptContent(order: Order, isOfficial: Bool) -> PrintContent {
        var sections: [PrintSection] = []
        let receiptHeader = settingsManager.receiptHeader
        
        // Restaurant Header
        sections.append(PrintSection(
            content: "\(receiptHeader.restaurantName)\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .doubleHeight)
        ))
        
        var headerInfo = "\(receiptHeader.address)\n"
        if !receiptHeader.phone.isEmpty {
            headerInfo += "Tel: \(receiptHeader.phone)\n"
        }
        
        sections.append(PrintSection(
            content: headerInfo,
            alignment: .center,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Official receipt header
        if isOfficial {
            sections.append(PrintSection(
                content: "\n領 収 証\n",
                alignment: .center,
                style: PrintStyle(isBold: true, fontSize: .doubleWidth)
            ))
        }
        
        // Separator and order info
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        let tableInfo = order.table?.name ?? "Table \(order.table?.name ?? "T00")"
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = settingsManager.restaurantSettings.dateTimeFormat
        let orderInfo = "Order #: \(order.id.prefix(8))\nTable: \(tableInfo)\nGuests: \(order.guest_count)\nDate: \(dateFormatter.string(from: Date()))\n"
        
        sections.append(PrintSection(
            content: orderInfo,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Column headers and items
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        let headerLine = "Item".padding(toLength: layout.itemNameWidth, withPad: " ", startingAt: 0) +
                        "Qty".padding(toLength: layout.quantityWidth, withPad: " ", startingAt: 0) +
                        "Price".padding(toLength: layout.priceWidth, withPad: " ", startingAt: 0) +
                        "Total".padding(toLength: layout.totalWidth, withPad: " ", startingAt: 0) + "\n"
        let divider = String(repeating: "-", count: layout.receiptWidth) + "\n"
        
        sections.append(PrintSection(
            content: headerLine + divider,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Order items and totals
        var itemsContent = ""
        var subtotal: Double = 0
        
        if let items = order.order_items {
            for item in items where item.status.rawValue != "cancelled" {
                let itemName = getItemDisplayName(for: item)
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
                
                itemsContent += line
                
                if let notes = item.notes, !notes.isEmpty {
                    itemsContent += "  Notes: \(notes.truncate(toLength: 30))\n"
                }
            }
        }
        
        sections.append(PrintSection(
            content: itemsContent,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Totals
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        let subtotalStr = numberFormatter.string(from: NSNumber(value: subtotal)) ?? ""
        let finalTotal = order.total_amount ?? subtotal
        let totalStr = numberFormatter.string(from: NSNumber(value: finalTotal)) ?? ""
        
        sections.append(PrintSection(
            content: "Subtotal: ¥\(subtotalStr)\n",
            alignment: .right,
            style: PrintStyle(isBold: true, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "Total: ¥\(totalStr)\n",
            alignment: .right,
            style: PrintStyle(isBold: true, fontSize: .doubleWidth)
        ))
        
        // Footer
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        var footerContent = "Thank you for your visit!\nありがとうございました！\n"
        if !settingsManager.restaurantSettings.website.isEmpty {
            footerContent += "\(settingsManager.restaurantSettings.website)\n"
        }
        footerContent += "\n\n"
        
        sections.append(PrintSection(
            content: footerContent,
            alignment: .center,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        return PrintContent(
            sections: sections,
            settings: PrintSettings(cutType: .full, paperWidth: layout.receiptWidth)
        )
    }
    
    private func generateTestReceiptContent() -> PrintContent {
        var sections: [PrintSection] = []
        sections.append(PrintSection(
            content: "Test Receipt\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .doubleWidth)
        ))
        
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy/MM/dd HH:mm:ss"
        let dateInfo = "Date: \(dateFormatter.string(from: Date()))\n"
        sections.append(PrintSection(
            content: dateInfo,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "This is a test receipt to verify\nprinter connectivity and settings.\n",
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        return PrintContent(
            sections: sections,
            settings: PrintSettings(cutType: .partial, paperWidth: layout.receiptWidth)
        )
    }
    
    private func generateKitchenTestContent() -> PrintContent {
        var sections: [PrintSection] = []
        sections.append(PrintSection(
            content: "KITCHEN PRINTER TEST\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .doubleWidthAndHeight)
        ))
        
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        let timeInfo = "Time: \(DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short))\n"
        sections.append(PrintSection(
            content: timeInfo,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "Sample Kitchen Item 1\nQty: 2\nNOTES: Extra spicy\n-\n",
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "Sample Kitchen Item 2\nQty: 1\n-\n",
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "KITCHEN PRINTER WORKING!\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .normal)
        ))
        
        return PrintContent(
            sections: sections,
            settings: PrintSettings(cutType: .partial, paperWidth: layout.receiptWidth)
        )
    }
    
    private func generateCheckoutTestContent() -> PrintContent {
        var sections: [PrintSection] = []
        sections.append(PrintSection(
            content: "CHECKOUT PRINTER TEST\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .doubleWidth)
        ))
        
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        let dateInfo = "Date: \(DateFormatter.localizedString(from: Date(), dateStyle: .short, timeStyle: .none))\n"
        sections.append(PrintSection(
            content: dateInfo,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "Sample Checkout Item 1\nQty: 1\nPrice: ¥600\nTotal: ¥600\n",
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "Sample Checkout Item 2\nQty: 2\nPrice: ¥300\nTotal: ¥600\n",
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "CHECKOUT PRINTER WORKING!\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .normal)
        ))
        
        return PrintContent(
            sections: sections,
            settings: PrintSettings(cutType: .full, paperWidth: layout.receiptWidth)
        )
    }
    
    // MARK: - Private Content Generators
    
    private func generateCheckoutReceiptPrintContent(_ receiptData: CheckoutReceiptData) -> String {
        let receiptHeader = PrinterSettingsManager.shared.receiptHeader
        let restaurantSettings = PrinterSettingsManager.shared.restaurantSettings
        var content = ""
        
        // Restaurant header - use receipt header settings
        content += centerText(receiptHeader.restaurantName.uppercased(), width: 48) + "\n"
        content += centerText(receiptHeader.address, width: 48) + "\n"
        if !receiptHeader.phone.isEmpty {
            content += centerText("Tel: \(receiptHeader.phone)", width: 48) + "\n"
        }
        content += "\n"
        
        // Receipt title
        content += centerText("RECEIPT", width: 48) + "\n"
        content += String(repeating: "=", count: 48) + "\n"
        
        // Order information
        let formatter = DateFormatter()
        formatter.dateFormat = restaurantSettings.dateTimeFormat
        
        content += "Order ID: \(receiptData.order.id.prefix(8).uppercased())\n"
        content += "Table: \(receiptData.order.table?.name ?? "Table \(receiptData.order.table_id)")\n"
        content += "Guests: \(receiptData.order.guest_count)\n"
        content += "Date: \(formatter.string(from: receiptData.timestamp))\n"
        content += String(repeating: "-", count: 48) + "\n"
        
        // Order items
        if let items = receiptData.order.order_items {
            for item in items {
                let itemName = getItemDisplayName(for: item)
                let quantity = item.quantity
                let unitPrice = item.menu_item?.price ?? 0
                let totalPrice = unitPrice * Double(quantity)
                
                // Item name and quantity
                content += "\(itemName)\n"
                content += String(format: "  %dx @ ¥%.0f%@¥%.0f\n", 
                                quantity, 
                                unitPrice, 
                                String(repeating: " ", count: max(1, 30 - String(format: "  %dx @ ¥%.0f", quantity, unitPrice).count)),
                                totalPrice)
                
                // Notes if any
                if let notes = item.notes, !notes.isEmpty {
                    content += "  Note: \(notes)\n"
                }
                content += "\n"
            }
        }
        
        content += String(repeating: "-", count: 48) + "\n"
        
        // Price breakdown
        content += String(format: "Subtotal:%@¥%.0f\n", 
                         String(repeating: " ", count: max(1, 38 - "Subtotal:".count)), 
                         receiptData.subtotal)
        
        if receiptData.discountAmount > 0 {
            content += String(format: "Discount:%@-¥%.0f\n", 
                             String(repeating: " ", count: max(1, 38 - "Discount:".count)), 
                             receiptData.discountAmount)
            
            if let discountCode = receiptData.discountCode {
                content += String(format: "  Code: %s\n", discountCode)
            }
        }
        
        content += String(format: "Tax (10%%):%@¥%.0f\n", 
                         String(repeating: " ", count: max(1, 37 - "Tax (10%):".count)), 
                         receiptData.taxAmount)
        
        content += String(repeating: "=", count: 48) + "\n"
        content += String(format: "TOTAL:%@¥%.0f\n", 
                         String(repeating: " ", count: max(1, 40 - "TOTAL:".count)), 
                         receiptData.totalAmount)
        content += String(repeating: "=", count: 48) + "\n"
        
        // Payment method
        content += "\nPayment Method: CASH\n"
        content += "Status: PAID\n"
        
        // Footer
        content += "\n"
        content += centerText("Thank you for dining with us!", width: 48) + "\n"
        // Note: Website removed from receipt header - can be added back if needed
        content += "\n"
        content += centerText("Powered by SOder POS", width: 48) + "\n"
        content += "\n\n\n"
        
        return content
    }
    
    private func centerText(_ text: String, width: Int) -> String {
        let textLength = text.count
        if textLength >= width {
            return text
        }
        
        let padding = (width - textLength) / 2
        let leftPadding = String(repeating: " ", count: padding)
        let rightPadding = String(repeating: " ", count: width - textLength - padding)
        
        return leftPadding + text + rightPadding
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
    
    private func stringToData(_ string: String) -> Data? {
        guard let data = string.data(using: .utf8) else {
            print("Warning: Could not encode string to UTF-8: \(string.prefix(50))")
            return string.data(using: .ascii, allowLossyConversion: true)
        }
        return data
    }
    
    // MARK: - Private Helper Methods
    
    private func getItemDisplayName(for item: OrderItem) -> String {
        let menuItem = item.menu_item
        
        // Check if the current print language is supported by the printer
        if !settingsManager.printLanguage.isPrinterSupported {
            // Fall back to item code if available
            if let code = menuItem?.code, !code.isEmpty {
                return code
            }
        }
        
        // Use the appropriate language name based on settings
        switch settingsManager.printLanguage {
        case .english:
            return menuItem?.name_en ?? menuItem?.code ?? "Unknown Item"
        case .japanese:
            return menuItem?.name_ja ?? menuItem?.name_en ?? menuItem?.code ?? "Unknown Item"
        case .vietnamese:
            return menuItem?.name_vi ?? menuItem?.name_en ?? menuItem?.code ?? "Unknown Item"
        }
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

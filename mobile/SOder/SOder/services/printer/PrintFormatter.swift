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
    private let templateRenderer = TemplateRenderer()
    private let formatProcessor = TemplateFormatProcessor()
    private let themeManager = TemplateThemeManager.shared
    
    init() {
        numberFormatter = NumberFormatter()
        numberFormatter.numberStyle = .decimal
        numberFormatter.locale = Locale(identifier: "ja_JP")
        numberFormatter.currencySymbol = "¥"
        numberFormatter.maximumFractionDigits = 0
    }
    
    // MARK: - Template-based Formatting
    func format(template: String, data: [String: Any], encoding: String.Encoding = .utf8) -> Data {
        // Render template with data
        let renderedText = templateRenderer.render(template: template, data: data)
        
        // Ensure CRLF line endings as required by M2
        let crlfText = normalizeToCRLF(renderedText)
        
        // Process format tags and convert to printer commands
        return formatProcessor.processFormatTags(in: crlfText, encoding: encoding)
    }
    
    // MARK: - Convenience Methods
    func formatOrderForKitchen(order: Order) -> Data? {
        return formatOrderForKitchen(order: order, target: .kitchen)
    }
    
    func formatCustomerReceipt(order: Order, isOfficial: Bool = false) -> Data? {
        return formatCustomerReceipt(order: order, isOfficial: isOfficial, target: .receipt)
    }

    // New target-aware overloads
    func formatOrderForKitchen(order: Order, target: PrinterSettingsManager.PrintTarget) -> Data? {
        let content = generateKitchenOrderContent(order: order)
        return formatForThermalPrinter(content, target: target)
    }
    
    func formatCustomerReceipt(order: Order, isOfficial: Bool, target: PrinterSettingsManager.PrintTarget) -> Data? {
        let content = generateCustomerReceiptContent(order: order, isOfficial: isOfficial)
        return formatForThermalPrinter(content, target: target)
    }
    
    func formatTestReceipt() -> Data {
        // Use current receipt target language
        let theme = settingsManager.getTemplateTheme(for: .receipt)
        let language = settingsManager.getSelectedLanguage(for: .receipt)
        
        let testData: [String: Any] = [
            "restaurant": [
                "name": "Test Restaurant",
                "address": "123 Test Street",
                "phone": "080-1234-5678",
                "website": "www.testrestaurant.com"
            ],
            "order": [
                "id": "TEST001",
                "table_name": "Table 1",
                "date": DateFormatter.localizedString(from: Date(), dateStyle: .short, timeStyle: .none),
                "time": DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short)
            ],
            "items": [
                [
                    "quantity": 2,
                    "name": "Test Item 1",
                    "price": 500
                ],
                [
                    "quantity": 1,
                    "name": "Test Item 2",
                    "price": 800
                ]
            ],
            "subtotal": 1300,
            "tax": 130,
            "total_price": 1430
        ]
        
        let template = themeManager.loadTemplate(type: .receipt, language: language, theme: theme) ?? getDefaultReceiptTemplate()
        let encoding = getSelectedEncoding(for: .receipt)
        return format(template: template, data: testData, encoding: encoding)
    }
    
    // MARK: - Private Methods
    private func loadTemplate(named name: String) -> String? {
        guard let path = Bundle.main.path(forResource: name, ofType: "txt"),
              let content = try? String(contentsOfFile: path) else {
            return nil
        }
        return content
    }
    
    private func getSelectedEncoding(for target: PrinterSettingsManager.PrintTarget) -> String.Encoding {
        let language = settingsManager.getSelectedLanguage(for: target)
        let strategy = settingsManager.getStrategy(for: nil, target: target)
        return PrinterConfig.EncodingUtils.getEncoding(for: language, strategy: strategy)
    }
    
    private func getPrinterCharsetCommand(for target: PrinterSettingsManager.PrintTarget) -> [UInt8] {
        let language = settingsManager.getSelectedLanguage(for: target)
        let strategy = settingsManager.getStrategy(for: nil, target: target)
        return PrinterConfig.EncodingUtils.getCharsetCommand(for: language, strategy: strategy)
    }
    
    private func buildOrderData(order: Order, includePrice: Bool) -> [String: Any] {
        let header = settingsManager.receiptHeader
        
        var restaurantData: [String: Any] = [
            "name": header.restaurantName,
            "address": header.address,
            "phone": header.phone
        ]
        
        // Add optional fields based on settings
        if header.showTaxCode && !header.taxCode.isEmpty {
            restaurantData["tax_code"] = header.taxCode
        }
        
        if header.showWebsite && !header.website.isEmpty {
            restaurantData["website"] = header.website
        }
        
        var data: [String: Any] = [
            "restaurant": restaurantData,
            "order": [
                "id": order.id,
                "table_name": order.tableName ?? "Takeout",
                "date": DateFormatter.localizedString(from: order.createdAt, dateStyle: .short, timeStyle: .none),
                "time": DateFormatter.localizedString(from: order.createdAt, dateStyle: .none, timeStyle: .short)
            ]
        ]
        
        // Build items array
        var items: [[String: Any]] = []
        for item in order.items {
            var itemData: [String: Any] = [
                "quantity": item.quantity,
                "name": item.name
            ]
            
            if includePrice {
                itemData["price"] = item.price
            }
            
            if let notes = item.notes, !notes.isEmpty {
                itemData["notes"] = notes
            }
            
            items.append(itemData)
        }
        data["items"] = items
        
        // Add pricing information if needed
        if includePrice {
            data["subtotal"] = order.subtotal
            data["tax"] = order.tax
            data["total_price"] = order.total
            
            if order.discount > 0 {
                data["discount"] = order.discount
            }
        }
        
        // Add special instructions
        if let instructions = order.specialInstructions, !instructions.isEmpty {
            data["special_instructions"] = instructions
        }
        
        // Add custom footer and promotional text
        if !header.footerMessage.isEmpty {
            data["custom_footer"] = header.footerMessage
        }
        
        if header.showPromotionalText && !header.promotionalText.isEmpty {
            data["promotional_message"] = header.promotionalText
        }
        
        return data
    }
    
    private func getDefaultReceiptTemplate() -> String {
        return """
        [CENTER][BOLD]{{restaurant.name}}[/BOLD][/CENTER]
        [CENTER]{{restaurant.address}}[/CENTER]
        
        [SEPARATOR]
        
        Order: {{order.id}}
        Table: {{order.table_name}}
        Time: {{order.time}}
        
        [SEPARATOR]
        
        {{#items}}
        [ROW]
        [COL_LEFT]{{quantity}}x {{name}}[/COL_LEFT]
        [COL_RIGHT]¥{{price}}[/COL_RIGHT]
        [/ROW]
        {{/items}}
        
        [SEPARATOR]
        
        [ROW]
        [COL_LEFT][BOLD]Total:[/BOLD][/COL_LEFT]
        [COL_RIGHT][BOLD]¥{{total_price}}[/BOLD][/COL_RIGHT]
        [/ROW]
        
        [CENTER]Thank you![/CENTER]
        [CUT]
        """
    }
    
    // MARK: - Public Formatting Methods (using PrintContent system)
    
    func formatKitchenSummary(_ group: GroupedItem) -> Data {
        let content = generateKitchenSummaryContent(group: group)
        return formatForThermalPrinter(content, target: .kitchen)
    }
    
    func formatKitchenTestReceipt() -> Data {
        let content = generateKitchenTestContent()
        return formatForThermalPrinter(content, target: .kitchen)
    }
    
    func formatCheckoutTestReceipt() -> Data {
        let content = generateCheckoutTestContent()
        return formatForThermalPrinter(content, target: .receipt)
    }
    
    // MARK: - Checkout Receipt Formatting
    func formatCheckoutReceipt(_ receiptData: CheckoutReceiptData) -> Data {
        let content = generateCheckoutReceiptPrintContent(receiptData)
        return formatForThermalPrinter(content, target: .receipt)
    }
    
    // MARK: - Unified Thermal Printer Formatter
    
    private func formatForThermalPrinter(_ content: String, target: PrinterSettingsManager.PrintTarget) -> Data {
        var command = Data()
        
        // Clear buffer and initialize printer
        command.append(Data(commands.clearBuffer))
        command.append(Data(commands.initialize))
        command.append(Data(getPrinterCharsetCommand(for: target)))
        
        // Add leading spacing
        command.append("\r\n\r\n".data(using: getSelectedEncoding(for: target)) ?? Data())
        
        // Set alignment to left by default
        command.append(Data(commands.alignLeft))
        
        // Add the formatted content (CRLF ensured)
        append(content, to: &command, target: target)
        
        // Enhanced cutting with extra spacing
        command.append(Data(commands.paperFeedExtra)) // Extra feed for spacing
        command.append("\r\n\r\n\r\n".data(using: getSelectedEncoding(for: target)) ?? Data())
        command.append(Data(commands.cutPaperAdvanced)) // Use advanced cutting
        
        return command
    }
    
    internal func formatForThermalPrinter(_ printContent: PrintContent, target: PrinterSettingsManager.PrintTarget) -> Data {
        var command = Data()
        
        // Clear buffer and initialize printer
        command.append(Data(commands.clearBuffer))
        command.append(Data(commands.initialize))
        command.append(Data(getPrinterCharsetCommand(for: target)))
        
        // Add leading spacing
        command.append("\r\n\r\n".data(using: getSelectedEncoding(for: target)) ?? Data())
        
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
            append(section.content, to: &command, target: target)
            
            // Reset styles after each section
            if section.style.isBold {
                command.append(Data(commands.boldOff))
            }
            command.append(Data(commands.resetTextStyles))
        }
        
        // Handle cutting with enhanced spacing
        switch printContent.settings.cutType {
        case .partial:
            command.append(Data(commands.paperFeedExtra)) // Extra feed for spacing
            command.append("\r\n\r\n\r\n".data(using: getSelectedEncoding(for: target)) ?? Data())
            command.append(Data(commands.cutPaperPartial))
        case .full:
            command.append(Data(commands.paperFeedExtra)) // Extra feed for spacing
            command.append("\r\n\r\n\r\n".data(using: getSelectedEncoding(for: target)) ?? Data())
            command.append(Data(commands.cutPaperAdvanced)) // Use advanced cutting
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
        content += "\n\n\n\n\n" // Extra line feeds to ensure proper separation before cutting
        
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
        if let data = data { commandData.append(data) }
    }
    
    private func append(_ string: String, to commandData: inout Data, target: PrinterSettingsManager.PrintTarget) {
        // Ensure CRLF newlines
        let crlf = normalizeToCRLF(string)
        if let data = stringToData(crlf, target: target) {
            commandData.append(data)
        }
    }
    
    private func stringToData(_ string: String, target: PrinterSettingsManager.PrintTarget) -> Data? {
        return stringToDataWithFallback(string, target: target)
    }
    
    // Enhanced encoding with intelligent fallback (per target)
    private func stringToDataWithFallback(_ string: String, target: PrinterSettingsManager.PrintTarget) -> Data? {
        let language = settingsManager.getSelectedLanguage(for: target)
        let strategy = settingsManager.getStrategy(for: nil, target: target)
        
        switch strategy {
        case .utf8Primary:
            if let data = string.data(using: .utf8) { return data }
            return tryLegacyEncoding(string, language: language, target: target)
        case .utf8Fallback:
            let processedString = applyCharacterFallback(string, language: language)
            if let data = processedString.data(using: .utf8) { return data }
            return PrinterConfig.EncodingUtils.toASCIISafe(processedString).data(using: .ascii)
        case .legacyEncoding:
            return tryLegacyEncoding(string, language: language, target: target)
        }
    }
    
    private func tryLegacyEncoding(_ string: String, language: PrintLanguage, target: PrinterSettingsManager.PrintTarget) -> Data? {
        let encoding = PrinterConfig.EncodingUtils.getLegacyEncoding(for: language)
        
        switch language {
        case .vietnamese:
            if let data = string.data(using: encoding) { return data }
            let fallbackString = PrinterConfig.EncodingUtils.applyVietnameseFallback(string)
            return fallbackString.data(using: encoding) ?? PrinterConfig.EncodingUtils.toASCIISafe(string).data(using: .ascii)
        case .japanese:
            // Wrap Japanese text with Kanji mode commands when using legacy encoding
            let sjisData: Data?
            if let data = string.data(using: encoding) {
                sjisData = data
            } else {
                sjisData = PrinterConfig.EncodingUtils.toASCIISafe(string).data(using: .ascii)
            }
            var wrapped = Data()
            wrapped.append(Data(PrinterConfig.Commands.enterKanjiMode))
            if let sjisData = sjisData { wrapped.append(sjisData) }
            wrapped.append(Data(PrinterConfig.Commands.exitKanjiMode))
            return wrapped
        case .english:
            return string.data(using: encoding) ?? string.data(using: .ascii, allowLossyConversion: true)
        }
    }
    
    private func applyCharacterFallback(_ string: String, language: PrintLanguage) -> String {
        switch language {
        case .vietnamese:
            return PrinterConfig.EncodingUtils.applyVietnameseFallback(string)
        case .japanese:
            return string
        case .english:
            return PrinterConfig.EncodingUtils.stripDiacritics(string)
        }
    }
    
    private func normalizeToCRLF(_ text: String) -> String {
        // Replace lone CR or LF with CRLF, and normalize existing CRLF
        let replaced = text.replacingOccurrences(of: "\r\n", with: "\n")
                           .replacingOccurrences(of: "\r", with: "\n")
        return replaced.replacingOccurrences(of: "\n", with: "\r\n")
    }
    
    // MARK: - Private Helper Methods
    
    private func getItemDisplayName(for item: OrderItem) -> String {
        // Preserve existing behavior; language selection migrated in M4
        let menuItem = item.menu_item
        if !settingsManager.printLanguage.isPrinterSupported {
            if let code = menuItem?.code, !code.isEmpty {
                return code
            }
        }
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

// MARK: - Legacy Methods (for backward compatibility)
extension PrintFormatter {
    private func formatOrderForKitchenLegacy(order: Order) -> Data? {
        // Keep existing implementation for fallback
        return formatOrderForKitchenOriginal(order: order)
    }
    
    private func formatCustomerReceiptLegacy(order: Order, isOfficial: Bool) -> Data? {
        // Keep existing implementation for fallback
        return formatCustomerReceiptOriginal(order: order, isOfficial: isOfficial)
    }
    
    // TODO: Add original methods here or reference them from existing code
    private func formatOrderForKitchenOriginal(order: Order) -> Data? {
        var outputData = Data()
        
        // Clear any previous data and initialize printer
        outputData.append(Data(PrinterConfig.Commands.clearBuffer))
        outputData.append(Data(PrinterConfig.Commands.initialize))
        outputData.append(Data(getPrinterCharsetCommand(for: .kitchen)))
        
        // Add some leading spacing for better separation
        outputData.append("\n\n".data(using: getSelectedEncoding(for: .kitchen)) ?? Data())
        
        // Header - Center aligned and bold
        outputData.append(Data(PrinterConfig.Commands.alignCenter))
        outputData.append(Data(PrinterConfig.Commands.boldOn))
        outputData.append("=== KITCHEN ORDER ===\n".data(using: getSelectedEncoding(for: .kitchen)) ?? Data())
        outputData.append(Data(PrinterConfig.Commands.boldOff))
        outputData.append(Data(PrinterConfig.Commands.alignLeft))
        
        // Order info
        var orderInfo = ""
        if let orderNumber = order.order_number {
            orderInfo += "Order #: \(orderNumber)\n"
        }
        if let table = order.table?.name {
            orderInfo += "Table: \(table)\n"
        }
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = settingsManager.restaurantSettings.dateTimeFormat
        orderInfo += "Time: \(dateFormatter.string(from: Date()))\n"
        outputData.append(orderInfo.data(using: getSelectedEncoding(for: .kitchen)) ?? Data())
        
        // Items list
        if let items = order.order_items, !items.isEmpty {
            outputData.append("ITEMS:\n".data(using: getSelectedEncoding(for: .kitchen)) ?? Data())
            var itemsText = ""
            for item in items where item.status.rawValue != "cancelled" {
                let itemName = getItemDisplayName(for: item)
                itemsText += "- \(itemName) x\(item.quantity)\n"
                if let notes = item.notes, !notes.isEmpty {
                    itemsText += "  Notes: \(notes)\n"
                }
            }
            outputData.append(itemsText.data(using: getSelectedEncoding(for: .kitchen)) ?? Data())
        } else {
            outputData.append("No items\n".data(using: getSelectedEncoding(for: .kitchen)) ?? Data())
        }
        
        // Footer
        outputData.append("\n---\n".data(using: getSelectedEncoding(for: .kitchen)) ?? Data())
        outputData.append("Printed by SOder POS\n".data(using: getSelectedEncoding(for: .kitchen)) ?? Data())
        
        // Add trailing spacing and cut
        outputData.append("\n\n\n".data(using: getSelectedEncoding(for: .kitchen)) ?? Data()) // Additional line feeds
        outputData.append(Data(PrinterConfig.Commands.cutPaperPartial))
        
        return outputData
    }
    
    private func formatCustomerReceiptOriginal(order: Order, isOfficial: Bool) -> Data? {
        var outputData = Data()
        let header = settingsManager.receiptHeader
        
        // Clear any previous data and initialize printer
        outputData.append(Data(PrinterConfig.Commands.clearBuffer))
        outputData.append(Data(PrinterConfig.Commands.initialize))
        outputData.append(Data(getPrinterCharsetCommand(for: .receipt)))
        
        // Add some leading space
        outputData.append("\n\n".data(using: getSelectedEncoding(for: .receipt)) ?? Data())
        
        // Restaurant header
        outputData.append(Data(PrinterConfig.Commands.alignCenter))
        outputData.append(Data(PrinterConfig.Commands.boldOn))
        outputData.append("\(header.restaurantName)\n".data(using: getSelectedEncoding(for: .receipt)) ?? Data())
        outputData.append(Data(PrinterConfig.Commands.boldOff))
        
        var headerInfo = "\(header.address)\n"
        if !header.phone.isEmpty {
            headerInfo += "Tel: \(header.phone)\n"
        }
        outputData.append(headerInfo.data(using: getSelectedEncoding(for: .receipt)) ?? Data())
        
        // Official title if needed
        if isOfficial {
            outputData.append(Data(PrinterConfig.Commands.boldOn))
            outputData.append(Data(PrinterConfig.Commands.fontSizeDoubleWidth))
            outputData.append("領 収 証\n".data(using: getSelectedEncoding(for: .receipt)) ?? Data())
            outputData.append(Data(PrinterConfig.Commands.fontSizeNormal))
            outputData.append(Data(PrinterConfig.Commands.boldOff))
        }
        
        // Order information
        outputData.append(Data(PrinterConfig.Commands.alignLeft))
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = settingsManager.restaurantSettings.dateTimeFormat
        let tableInfo = order.table?.name ?? "Table \(order.table?.name ?? "T00")"
        let orderInfo = "Order #: \(order.id.prefix(8))\nTable: \(tableInfo)\nGuests: \(order.guest_count)\nDate: \(dateFormatter.string(from: Date()))\n"
        outputData.append(orderInfo.data(using: getSelectedEncoding(for: .receipt)) ?? Data())
        
        // Items
        outputData.append(String(repeating: "=", count: layout.receiptWidth).appending("\n").data(using: getSelectedEncoding(for: .receipt)) ?? Data())
        if let items = order.order_items {
            var itemsText = ""
            for item in items where item.status.rawValue != "cancelled" {
                let itemName = getItemDisplayName(for: item)
                itemsText += "\(itemName) x\(item.quantity)\n"
                if let notes = item.notes, !notes.isEmpty {
                    itemsText += "  Notes: \(notes)\n"
                }
            }
            outputData.append(itemsText.data(using: getSelectedEncoding(for: .receipt)) ?? Data())
        }
        
        // Footer
        outputData.append(String(repeating: "=", count: layout.receiptWidth).appending("\n").data(using: getSelectedEncoding(for: .receipt)) ?? Data())
        var footer = "Thank you for your visit!\nありがとうございました！\n"
        if !settingsManager.restaurantSettings.website.isEmpty {
            footer += "\(settingsManager.restaurantSettings.website)\n"
        }
        outputData.append(footer.data(using: getSelectedEncoding(for: .receipt)) ?? Data())
        
        // Cut paper
        outputData.append(Data(PrinterConfig.Commands.cutPaperAdvanced))
        
        return outputData
    }
}

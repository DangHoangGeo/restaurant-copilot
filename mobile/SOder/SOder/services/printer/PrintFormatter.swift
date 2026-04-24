import Foundation
import UIKit

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
    private var numberFormatter: NumberFormatter {
        AppCurrencyFormatter.printerNumberFormatter()
    }
    private let templateRenderer = TemplateRenderer()
    private let formatProcessor = TemplateFormatProcessor()
    private let themeManager = TemplateThemeManager.shared
    
    // MARK: - Template-based Formatting
    func format(template: String, data: [String: Any], encoding: String.Encoding = .utf8, charsetCommand: [UInt8] = []) -> Data {
        // Render template with data
        let renderedText = templateRenderer.render(template: template, data: data)
        
        // Ensure CRLF line endings as required by M2
        let crlfText = normalizeToCRLF(renderedText)
        
        // Process format tags and convert to printer commands
        return formatProcessor.processFormatTags(in: crlfText, encoding: encoding, charsetCommand: charsetCommand)
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
        
        var testData: [String: Any] = [
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
        
        // Inject i18n labels for the template
        testData["i18n"] = buildTemplateI18n(for: language)
        
        let template = themeManager.loadTemplate(type: .receipt, language: language, theme: theme) ?? getDefaultReceiptTemplate()
        let encoding = getSelectedEncoding(for: .receipt)
        return format(template: template, data: testData, encoding: encoding, charsetCommand: getPrinterCharsetCommand(for: .receipt))
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
        // Localized default template using i18n keys
        return """
        [CENTER][BOLD]{{restaurant.name}}[/BOLD][/CENTER]
        [CENTER]{{restaurant.address}}[/CENTER]
        {{#restaurant.phone}}[CENTER]{{restaurant.phone}}[/CENTER]{{/restaurant.phone}}
        {{#restaurant.website}}[CENTER]{{restaurant.website}}[/CENTER]{{/restaurant.website}}
        
        [SEPARATOR]
        
        {{i18n.order}}: {{order.id}}
        {{i18n.table}}: {{order.table_name}}
        {{i18n.date}}: {{order.date}}
        {{i18n.time}}: {{order.time}}
        
        [SEPARATOR]
        
        {{#items}}
        [ROW]
        [COL_LEFT]{{quantity}}x {{name}}[/COL_LEFT]
        [COL_RIGHT]¥{{price}}[/COL_RIGHT]
        [/ROW]
        {{/items}}
        
        [SEPARATOR]
        
        [ROW]
        [COL_LEFT][BOLD]{{i18n.total}}:[/BOLD][/COL_LEFT]
        [COL_RIGHT][BOLD]¥{{total_price}}[/BOLD][/COL_RIGHT]
        [/ROW]
        
        [CENTER]{{i18n.thank_you_short}}[/CENTER]
        [CUT]
        """
    }
    
    // Localize a key for a specific printer language without changing UI language
    private func tr(_ key: String, for language: PrintLanguage) -> String {
        if let path = Bundle.main.path(forResource: language.rawValue, ofType: "lproj"),
           let bundle = Bundle(path: path) {
            return NSLocalizedString(key, bundle: bundle, comment: "")
        }
        // Fallback to English
        if let path = Bundle.main.path(forResource: "en", ofType: "lproj"),
           let bundle = Bundle(path: path) {
            return NSLocalizedString(key, bundle: bundle, comment: "")
        }
        return key
    }
    
    private func buildTemplateI18n(for language: PrintLanguage) -> [String: String] {
        let keys = [
            "receipt", "order", "table", "date", "time", "note", "subtotal", "tax", "discount", "total",
            "thank_you", "thank_you_short", "thank_you_dining", "tax_code", "kitchen_order", "special_instructions",
            "prepared_by", "special_notes", "items", "guests"
        ]
        var dict: [String: String] = [:]
        for k in keys { dict[k] = tr("tpl_\(k)", for: language) }
        return dict
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
        if settingsManager.shouldRenderReceiptAsImage() {
            return formatReceiptImage(content)
        }
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
        let lang = settingsManager.getSelectedLanguage(for: .kitchen)
        let tableLabel = tr("tpl_table", for: lang)
        let orderLabel = tr("tpl_order", for: lang)
        let guestsLabel = tr("tpl_guests", for: lang)
        let quantityLabel = tr("tpl_qty", for: lang)
        let notesLabel = tr("tpl_notes", for: lang)
        let sizeLabel = tr("tpl_size", for: lang)
        let toppingsLabel = tr("tpl_toppings", for: lang)
        
        sections.append(PrintSection(
            content: "\(tr("tpl_kitchen_order", for: lang))\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .doubleWidth)
        ))

        let tableName = order.table?.name ?? "Table \(order.table_id)"
        sections.append(PrintSection(
            content: "\(tableLabel): \(tableName)\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .doubleWidthAndHeight)
        ))
        
        let orderInfo = "\(orderLabel) #: \(order.id.prefix(8))\n\(guestsLabel): \(order.guest_count ?? 0)\n"
        sections.append(PrintSection(
            content: orderInfo,
            alignment: .center,
            style: PrintStyle(isBold: false, fontSize: .doubleHeight)
        ))
        
        let separator = String(repeating: "=", count: layout.receiptWidth) + "\n"
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        if let items = order.order_items {
            for item in items where item.status.rawValue != "canceled" {
                let itemName = getItemDisplayName(for: item, target: .kitchen)
                sections.append(PrintSection(
                    content: "\(item.quantity)x \(itemName)\n",
                    alignment: .left,
                    style: PrintStyle(isBold: true, fontSize: .doubleHeight)
                ))

                var itemDetails = "\(quantityLabel): \(item.quantity)\n"
                
                if let sizeName = getSizeDisplayName(for: item, language: lang) {
                    itemDetails += "\(sizeLabel): \(sizeName)\n"
                }

                let toppings = getToppingDisplayNames(for: item, language: lang)
                if !toppings.isEmpty {
                    itemDetails += "\(toppingsLabel): \(toppings.joined(separator: ", "))\n"
                }

                if let notes = item.notes, !notes.isEmpty {
                    itemDetails += "\(notesLabel): \(notes)\n"
                }

                sections.append(PrintSection(
                    content: itemDetails + String(repeating: "-", count: layout.receiptWidth) + "\n",
                    alignment: .left,
                    style: PrintStyle(isBold: false, fontSize: .doubleHeight)
                ))
            }
        }

        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = settingsManager.restaurantSettings.dateTimeFormat
        let printedLabel = tr("tpl_printed", for: lang)
        let minimumTicketFeed = String(repeating: "\n", count: 8)
        let timestamp = "\(printedLabel): \(dateFormatter.string(from: Date()))\(minimumTicketFeed)"
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
        let lang = settingsManager.getSelectedLanguage(for: .kitchen)
        
        // Header
        sections.append(PrintSection(
            content: "\(tr("tpl_kitchen_summary", for: lang))\n",
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
        let timeInfo = "\(tr("tpl_time", for: lang)): \(dateFormatter.string(from: Date()))\n\n"
        sections.append(PrintSection(
            content: timeInfo,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Item details
        let itemInfo = "\(tr("tpl_item", for: lang).uppercased()): \(group.itemName)\n\(tr("tpl_total_quantity", for: lang).uppercased()): \(group.quantity)\n"
        sections.append(PrintSection(
            content: itemInfo,
            alignment: .left,
            style: PrintStyle(isBold: true, fontSize: .normal)
        ))
        
        // Tables
        let divider = String(repeating: "-", count: layout.receiptWidth) + "\n"
        var tablesContent = divider + "\(tr("tpl_tables", for: lang).uppercased()):\n"
        for table in group.tables.sorted() {
            tablesContent += "\(table)\n"
        }
        
        // Notes
        if let notes = group.notes, !notes.isEmpty {
            tablesContent += "\n\(tr("tpl_notes", for: lang).uppercased()):\n\(notes)\n"
        }
        
        // Status and Priority
        tablesContent += "\n\(tr("tpl_status", for: lang).uppercased()): \(group.status.rawValue.uppercased())\n"
        
        if group.priority >= 4 {
            tablesContent += "\n*** \(tr("tpl_urgent_high_priority", for: lang)) ***\n"
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
            content: "\(tr("tpl_status", for: lang).uppercased()): \(tr("tpl_completed", for: lang))\n",
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
        let lang = settingsManager.getSelectedLanguage(for: .receipt)
        
        // Restaurant Header
        sections.append(PrintSection(
            content: "\(receiptHeader.restaurantName)\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .doubleHeight)
        ))
        
        var headerInfo = "\(receiptHeader.address)\n"
        if !receiptHeader.phone.isEmpty {
            headerInfo += "\(tr("tpl_phone", for: lang)): \(receiptHeader.phone)\n"
        }
        
        sections.append(PrintSection(
            content: headerInfo,
            alignment: .center,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Official receipt header
        if isOfficial {
            sections.append(PrintSection(
                content: "\n\(tr("tpl_official_receipt", for: lang))\n",
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
        
        let tableName = order.table?.name ?? "T00"
        let orderInfo = "\(tr("tpl_order", for: lang)) #: \(order.id.prefix(8))\n\(tr("tpl_table", for: lang)): \(tableName)\n\(tr("tpl_guests", for: lang)): \(order.guest_count)\n\(tr("tpl_date", for: lang)): \(DateFormatter.localizedString(from: Date(), dateStyle: .short, timeStyle: .short))\n"
        
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
        
        let headerLine = tr("tpl_item", for: lang).padding(toLength: layout.itemNameWidth, withPad: " ", startingAt: 0) +
                        tr("tpl_qty", for: lang).padding(toLength: layout.quantityWidth, withPad: " ", startingAt: 0) +
                        tr("tpl_price", for: lang).padding(toLength: layout.priceWidth, withPad: " ", startingAt: 0) +
                        tr("tpl_total", for: lang).padding(toLength: layout.totalWidth, withPad: " ", startingAt: 0) + "\n"
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
            for item in items where item.status.rawValue != "canceled" {
                let itemName = getItemDisplayName(for: item, target: .receipt)
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
                
                if let notes = item.notes, !notes.isEmpty {
                    line += "  \(tr("tpl_notes", for: lang)): \(notes)\n"
                }
                
                itemsContent += line
            }
        }
        
        sections.append(PrintSection(
            content: itemsContent,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Totals
        sections.append(PrintSection(
            content: divider,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        let totalsLine = tr("tpl_total", for: lang).uppercased().padding(toLength: layout.itemNameWidth + layout.quantityWidth + layout.priceWidth, withPad: " ", startingAt: 0) +
                         (numberFormatter.string(from: NSNumber(value: subtotal)) ?? "").leftPad(toLength: layout.totalWidth) + "\n\n"
        sections.append(PrintSection(
            content: totalsLine,
            alignment: .left,
            style: PrintStyle(isBold: true, fontSize: .normal)
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
        let language = settingsManager.getSelectedLanguage(for: .receipt)
        var content = ""
        
        // Restaurant header - use receipt header settings
        content += centerText(receiptHeader.restaurantName.uppercased(), width: 48) + "\n"
        if !receiptHeader.address.isEmpty {
            content += centerText(receiptHeader.address, width: 48) + "\n"
        }
        if !receiptHeader.phone.isEmpty {
            content += centerText("\(tr("tpl_phone", for: language)): \(receiptHeader.phone)", width: 48) + "\n"
        }
        if receiptHeader.showTaxCode, !receiptHeader.taxCode.isEmpty {
            content += centerText("\(tr("tpl_tax_code", for: language)): \(receiptHeader.taxCode)", width: 48) + "\n"
        }
        content += "\n"
        
        // Receipt title
        let receiptTitle = receiptData.isOfficial ? tr("tpl_official_receipt", for: language) : tr("tpl_receipt", for: language)
        content += centerText(receiptTitle, width: 48) + "\n\n"
        
        // Order information
        let formatter = DateFormatter()
        formatter.dateFormat = restaurantSettings.dateTimeFormat
        
        content += "\(tr("tpl_order", for: language)): \(receiptData.order.id.prefix(8).uppercased())\n"
        content += "\(tr("tpl_table", for: language)): \(receiptData.order.table?.name ?? "Table \(receiptData.order.table_id)")\n"
        content += "\(tr("tpl_guests", for: language)): \(receiptData.order.guest_count ?? 0)\n"
        content += "\(tr("tpl_date", for: language)): \(formatter.string(from: receiptData.timestamp))\n\n"
        
        // Order items
        if let items = receiptData.order.order_items {
            for item in items where item.status != .canceled {
                let itemName = getItemDisplayName(for: item, target: .receipt)
                let quantity = item.quantity
                let unitPrice = item.price_at_order
                let totalPrice = unitPrice * Double(quantity)
                
                // Item name and quantity
                content += "\(itemName)\n"
                content += String(format: "  %dx @ ¥%.0f%@¥%.0f\n", 
                                quantity, 
                                unitPrice, 
                                String(repeating: " ", count: max(1, 30 - String(format: "  %dx @ ¥%.0f", quantity, unitPrice).count)),
                                totalPrice)

                if let sizeName = getSizeDisplayName(for: item, language: language) {
                    content += "  \(tr("tpl_size", for: language)): \(sizeName)\n"
                }

                let toppings = getToppingDisplayNames(for: item, language: language)
                if !toppings.isEmpty {
                    content += "  \(tr("tpl_toppings", for: language)): \(toppings.joined(separator: ", "))\n"
                }
                content += "\n"
            }
        }
        
        content += String(repeating: "-", count: 32) + "\n"
        
        // Price breakdown
        content += formatReceiptAmountLine(label: tr("tpl_subtotal", for: language), amount: receiptData.subtotal)
        
        if receiptData.discountAmount > 0 {
            content += formatReceiptAmountLine(label: tr("tpl_discount", for: language), amount: -receiptData.discountAmount)
            
            if let discountCode = receiptData.discountCode {
                content += "  \(tr("discount_code", for: language)): \(discountCode)\n"
            }
        }
        
        content += formatReceiptAmountLine(label: "\(tr("tpl_tax", for: language)) (10%)", amount: receiptData.taxAmount)
        
        content += String(repeating: "-", count: 32) + "\n"
        content += formatReceiptAmountLine(label: tr("tpl_total", for: language), amount: receiptData.totalAmount)
        
        // Payment method
        content += "\n\(tr("payment_method", for: language)): \(receiptData.paymentMethod ?? tr("cash", for: language))\n"
        content += "\(tr("tpl_status", for: language)): \(tr("tpl_paid", for: language))\n"
        
        // Footer
        content += "\n"
        let footer = receiptHeader.footerMessage.isEmpty ? tr("tpl_thank_you_dining", for: language) : receiptHeader.footerMessage
        content += centerText(footer, width: 48) + "\n"
        if receiptHeader.showWebsite, !receiptHeader.website.isEmpty {
            content += centerText(receiptHeader.website, width: 48) + "\n"
        }
        content += "\n"
        content += centerText("powered by coorder.ai", width: 48) + "\n"
        content += "\n\n\n\n\n" // Extra line feeds to ensure proper separation before cutting
        
        return content
    }

    private func formatReceiptAmountLine(label: String, amount: Double) -> String {
        let amountText = amount < 0
            ? "-¥\(String(format: "%.0f", abs(amount)))"
            : "¥\(String(format: "%.0f", amount))"
        let spaces = String(repeating: " ", count: max(1, 48 - label.count - amountText.count))
        return "\(label)\(spaces)\(amountText)\n"
    }

    private func formatReceiptImage(_ content: String) -> Data {
        var command = Data()
        command.append(Data(commands.clearBuffer))
        command.append(Data(commands.initialize))
        command.append(Data(commands.alignCenter))
        command.append(renderRasterImageCommands(from: content))
        command.append(Data(commands.paperFeedExtra))
        command.append(Data(commands.cutPaperAdvanced))
        return command
    }

    private func renderRasterImageCommands(from content: String) -> Data {
        let imageWidth = 576
        let horizontalMargin = 24
        let verticalMargin = 24
        let textWidth = imageWidth - (horizontalMargin * 2)
        let paragraphStyle = NSMutableParagraphStyle()
        paragraphStyle.lineBreakMode = .byWordWrapping
        paragraphStyle.lineSpacing = 3

        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.monospacedSystemFont(ofSize: 18, weight: .regular),
            .foregroundColor: UIColor.black,
            .paragraphStyle: paragraphStyle
        ]
        let normalized = normalizeToCRLF(content).replacingOccurrences(of: "\r\n", with: "\n")
        let attributed = NSAttributedString(string: normalized, attributes: attributes)
        let boundingRect = attributed.boundingRect(
            with: CGSize(width: CGFloat(textWidth), height: CGFloat.greatestFiniteMagnitude),
            options: [.usesLineFragmentOrigin, .usesFontLeading],
            context: nil
        )
        let imageHeight = max(64, Int(ceil(boundingRect.height)) + (verticalMargin * 2))
        let rowBytes = imageWidth
        var pixels = [UInt8](repeating: 255, count: rowBytes * imageHeight)

        pixels.withUnsafeMutableBytes { rawBuffer in
            guard let baseAddress = rawBuffer.baseAddress,
                  let context = CGContext(
                    data: baseAddress,
                    width: imageWidth,
                    height: imageHeight,
                    bitsPerComponent: 8,
                    bytesPerRow: rowBytes,
                    space: CGColorSpaceCreateDeviceGray(),
                    bitmapInfo: CGImageAlphaInfo.none.rawValue
                  ) else {
                return
            }

            context.setFillColor(UIColor.white.cgColor)
            context.fill(CGRect(x: 0, y: 0, width: imageWidth, height: imageHeight))
            UIGraphicsPushContext(context)
            attributed.draw(
                with: CGRect(
                    x: CGFloat(horizontalMargin),
                    y: CGFloat(verticalMargin),
                    width: CGFloat(textWidth),
                    height: CGFloat(imageHeight - (verticalMargin * 2))
                ),
                options: [.usesLineFragmentOrigin, .usesFontLeading],
                context: nil
            )
            UIGraphicsPopContext()
        }

        let widthBytes = (imageWidth + 7) / 8
        var raster = Data([
            0x1D, 0x76, 0x30, 0x00,
            UInt8(widthBytes & 0xFF),
            UInt8((widthBytes >> 8) & 0xFF),
            UInt8(imageHeight & 0xFF),
            UInt8((imageHeight >> 8) & 0xFF)
        ])

        for y in 0..<imageHeight {
            for xByte in 0..<widthBytes {
                var byte: UInt8 = 0
                for bit in 0..<8 {
                    let x = (xByte * 8) + bit
                    guard x < imageWidth else { continue }
                    let pixel = pixels[(y * rowBytes) + x]
                    if pixel < 180 {
                        byte |= UInt8(0x80 >> bit)
                    }
                }
                raster.append(byte)
            }
        }

        return raster
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
    
    private func getItemDisplayName(for item: OrderItem, target: PrinterSettingsManager.PrintTarget) -> String {
        let menuItem = item.menu_item

        switch settingsManager.getSelectedLanguage(for: target) {
        case .english:
            return menuItem?.name_en ?? menuItem?.code ?? "Unknown Item"
        case .japanese:
            return menuItem?.name_ja ?? menuItem?.name_en ?? menuItem?.code ?? "Unknown Item"
        case .vietnamese:
            return menuItem?.name_vi ?? menuItem?.name_en ?? menuItem?.code ?? "Unknown Item"
        }
    }

    private func getItemDisplayName(for item: OrderItem) -> String {
        getItemDisplayName(for: item, target: .receipt)
    }

    private func getSizeDisplayName(for item: OrderItem, language: PrintLanguage) -> String? {
        if let size = item.menu_item_size {
            return localizedName(
                english: size.name_en,
                japanese: size.name_ja,
                vietnamese: size.name_vi,
                language: language
            )
        }

        return item.menu_item_size_id?.isEmpty == false ? item.menu_item_size_id : nil
    }

    private func getToppingDisplayNames(for item: OrderItem, language: PrintLanguage) -> [String] {
        if let toppings = item.toppings, !toppings.isEmpty {
            return toppings.map { topping in
                localizedName(
                    english: topping.name_en,
                    japanese: topping.name_ja,
                    vietnamese: topping.name_vi,
                    language: language
                )
            }
        }

        return item.topping_ids ?? []
    }

    private func localizedName(
        english: String,
        japanese: String?,
        vietnamese: String?,
        language: PrintLanguage
    ) -> String {
        switch language {
        case .english:
            return english
        case .japanese:
            return japanese ?? english
        case .vietnamese:
            return vietnamese ?? english
        }
    }

    // MARK: - QR Code Generation for Table QR Printing

    /// Generates ESC/POS command data for printing a QR code
    /// - Parameters:
    ///   - string: The URL or text to encode in the QR code
    ///   - size: QR code size (1-16, where 8 is a good default for readability)
    /// - Returns: Data containing ESC/POS commands to print the QR code
    func generateQRCodeData(for string: String, with size: Int) -> Data {
        let qrCodeSize = UInt8(size)  // Size of the QR code (1-16)

        guard let qrCodeContent = string.data(using: .ascii) else {
            return Data()
        }
        let qrCodeContentLength = UInt16(qrCodeContent.count)

        var qrCodeData = Data()
        // Set QR code size
        qrCodeData.append(contentsOf: [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, qrCodeSize, 0x00])
        // Set QR code model
        qrCodeData.append(contentsOf: [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, 0x08])
        // Set QR code error correction
        qrCodeData.append(contentsOf: [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31])

        // Store QR code content
        let lowByte = UInt8(qrCodeContentLength & 0xFF)
        let highByte = UInt8((qrCodeContentLength >> 8) & 0xFF)
        qrCodeData.append(Data([0x1D, 0x28, 0x6B, UInt8(3 + qrCodeContentLength), 0x00, 0x31, 0x50, 0x30]))
        qrCodeData.append(qrCodeContent)

        // Print QR code
        qrCodeData.append(contentsOf: [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30])
        qrCodeData.append(contentsOf: [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x52, 0x30])

        // Add positioning commands to center horizontally
        let qrCodeCenterCommand = Data([0x1B, 0x61, 0x01]) // Align center
        qrCodeData.insert(contentsOf: qrCodeCenterCommand, at: 0)

        return Data([0x1B, 0x40]) + qrCodeData + Data([0x0C])
    }

    // MARK: - Table QR Code Formatting

    /// Formats a complete table QR code printout with restaurant info and WiFi details
    /// - Parameters:
    ///   - table: The table to print the QR code for
    ///   - restaurantName: Name of the restaurant
    ///   - qrCodeUrl: The full URL to encode in the QR code
    ///   - wifiInfo: Optional tuple of (SSID, password) for WiFi information
    /// - Returns: Data ready to send to the printer
    func formatTableQRCode(
        table: Table,
        restaurantName: String,
        qrCodeUrl: String,
        wifiInfo: (ssid: String, password: String)? = nil
    ) -> Data {
        let lang = settingsManager.getSelectedLanguage(for: .receipt)
        var command = Data()

        // Clear buffer and initialize printer
        command.append(Data(commands.clearBuffer))
        command.append(Data(commands.initialize))
        command.append(Data(getPrinterCharsetCommand(for: .receipt)))

        // Add leading spacing
        command.append("\r\n\r\n".data(using: getSelectedEncoding(for: .receipt)) ?? Data())

        // Restaurant Name - Center, Bold, Large
        command.append(Data(commands.alignCenter))
        command.append(Data(commands.boldOn))
        command.append(Data(commands.fontSizeDoubleHeight))
        append(restaurantName + "\r\n", to: &command, target: .receipt)
        command.append(Data(commands.resetTextStyles))
        command.append(Data(commands.boldOff))

        command.append("\r\n".data(using: getSelectedEncoding(for: .receipt)) ?? Data())

        // Table Name - Center, Bold, Extra Large
        command.append(Data(commands.boldOn))
        command.append(Data(commands.fontSizeDoubleWidthAndHeight))
        append(table.name + "\r\n", to: &command, target: .receipt)
        command.append(Data(commands.resetTextStyles))
        command.append(Data(commands.boldOff))

        command.append("\r\n\r\n".data(using: getSelectedEncoding(for: .receipt)) ?? Data())

        // QR Code - Centered
        let qrCodeData = generateQRCodeData(for: qrCodeUrl, with: 8)
        command.append(qrCodeData)

        command.append("\r\n\r\n".data(using: getSelectedEncoding(for: .receipt)) ?? Data())

        // Footer Section
        command.append(Data(commands.alignCenter))

        // "Thank you!" message
        let thankYouText = tr("tpl_thank_you_short", for: lang)
        append(thankYouText + "\r\n", to: &command, target: .receipt)

        // WiFi information if provided
        if let wifi = wifiInfo {
            command.append("\r\n".data(using: getSelectedEncoding(for: .receipt)) ?? Data())
            let wifiLabel = tr("tpl_wifi", for: lang)
            let passwordLabel = tr("tpl_password", for: lang)
            append("\(wifiLabel): \(wifi.ssid)\r\n", to: &command, target: .receipt)
            append("\(passwordLabel): \(wifi.password)\r\n", to: &command, target: .receipt)
        }

        command.append("\r\n".data(using: getSelectedEncoding(for: .receipt)) ?? Data())

        // Branding - Small text
        command.append(Data(commands.fontSizeNormal))
        append("powered by coorder.ai\r\n", to: &command, target: .receipt)

        // Enhanced cutting with extra spacing
        command.append(Data(commands.paperFeedExtra))
        command.append("\r\n\r\n\r\n".data(using: getSelectedEncoding(for: .receipt)) ?? Data())
        command.append(Data(commands.cutPaperAdvanced))

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
            for item in items where item.status.rawValue != "canceled" {
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
            for item in items where item.status.rawValue != "canceled" {
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

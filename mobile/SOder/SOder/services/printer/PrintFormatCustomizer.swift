import Foundation

// MARK: - Print Format Customization
class PrintFormatCustomizer {
    static let shared = PrintFormatCustomizer()
    
    private init() {}
    
    // MARK: - Customizable Format Templates
    
    func createCustomKitchenSummary(
        group: GroupedItem,
        headerStyle: PrintStyle = PrintStyle(isBold: true, fontSize: .doubleWidthAndHeight),
        includeCategory: Bool = true,
        includePriority: Bool = true,
        customFooter: String? = nil
    ) -> PrintContent {
        var sections: [PrintSection] = []
        
        // Custom header
        sections.append(PrintSection(
            content: "🍳 KITCHEN SUMMARY 🍳\n",
            alignment: .center,
            style: headerStyle
        ))
        
        let separator = String(repeating: "=", count: 32) + "\n"
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Time with custom formatting
        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "HH:mm:ss"
        let timeInfo = "⏰ Time: \(timeFormatter.string(from: Date()))\n\n"
        sections.append(PrintSection(
            content: timeInfo,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Item details with emojis
        var itemInfo = "📋 ITEM: \(group.itemName)\n"
        itemInfo += "🔢 QTY: \(group.quantity)\n"
        
        if includeCategory {
            itemInfo += "📁 CATEGORY: \(group.categoryName)\n"
        }
        
        sections.append(PrintSection(
            content: itemInfo,
            alignment: .left,
            style: PrintStyle(isBold: true, fontSize: .normal)
        ))
        
        // Tables with custom formatting
        let divider = String(repeating: "-", count: 32) + "\n"
        var tablesContent = divider + "🏠 TABLES:\n"
        for table in group.tables.sorted() {
            tablesContent += "   • \(table)\n"
        }
        
        // Notes with custom styling
        if let notes = group.notes, !notes.isEmpty {
            tablesContent += "\n📝 SPECIAL NOTES:\n"
            tablesContent += "   ➤ \(notes)\n"
        }
        
        // Status
        tablesContent += "\n📊 STATUS: \(group.status.rawValue.uppercased())\n"
        
        // Priority with custom styling
        if includePriority && group.priority >= 4 {
            tablesContent += "\n🚨 *** URGENT - HIGH PRIORITY *** 🚨\n"
        }
        
        sections.append(PrintSection(
            content: tablesContent,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Custom footer
        sections.append(PrintSection(
            content: separator,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        let footerText = customFooter ?? "✅ MARK AS COMPLETED ✅"
        sections.append(PrintSection(
            content: "\(footerText)\n",
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
            settings: PrintSettings(cutType: .partial, paperWidth: 32)
        )
    }
    
    func createCustomReceipt(
        order: Order,
        theme: ReceiptTheme = .standard,
        includeLogo: Bool = false,
        customMessages: [String] = []
    ) -> PrintContent {
        var sections: [PrintSection] = []
        
        switch theme {
        case .standard:
            return createStandardReceipt(order: order, includeLogo: includeLogo, customMessages: customMessages)
        case .minimal:
            return createMinimalReceipt(order: order, customMessages: customMessages)
        case .elegant:
            return createElegantReceipt(order: order, includeLogo: includeLogo, customMessages: customMessages)
        }
    }
    
    // MARK: - Receipt Themes
    
    private func createStandardReceipt(order: Order, includeLogo: Bool, customMessages: [String]) -> PrintContent {
        var sections: [PrintSection] = []
        
        if includeLogo {
            sections.append(PrintSection(
                content: "🍽️ RESTAURANT LOGO 🍽️\n",
                alignment: .center,
                style: PrintStyle(isBold: true, fontSize: .doubleWidth)
            ))
        }
        
        // Continue with standard receipt format...
        // (Implementation details follow the same pattern)
        
        return PrintContent(
            sections: sections,
            settings: PrintSettings(cutType: .full, paperWidth: 32)
        )
    }
    
    private func createMinimalReceipt(order: Order, customMessages: [String]) -> PrintContent {
        var sections: [PrintSection] = []
        
        // Minimal design with clean lines
        sections.append(PrintSection(
            content: "Receipt\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .doubleWidth)
        ))
        
        let line = String(repeating: "-", count: 32) + "\n"
        sections.append(PrintSection(
            content: line,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Minimal order info
        let orderInfo = "Order: \(order.id.prefix(8))\nTable: \(order.table?.name ?? "N/A")\n"
        sections.append(PrintSection(
            content: orderInfo,
            alignment: .left,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Add custom messages
        for message in customMessages {
            sections.append(PrintSection(
                content: "\(message)\n",
                alignment: .center,
                style: PrintStyle(isBold: false, fontSize: .normal)
            ))
        }
        
        return PrintContent(
            sections: sections,
            settings: PrintSettings(cutType: .partial, paperWidth: 32)
        )
    }
    
    private func createElegantReceipt(order: Order, includeLogo: Bool, customMessages: [String]) -> PrintContent {
        var sections: [PrintSection] = []
        
        // Elegant design with decorative elements
        sections.append(PrintSection(
            content: "╔══════════════════════════════╗\n",
            alignment: .center,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "║         RECEIPT              ║\n",
            alignment: .center,
            style: PrintStyle(isBold: true, fontSize: .normal)
        ))
        
        sections.append(PrintSection(
            content: "╚══════════════════════════════╝\n",
            alignment: .center,
            style: PrintStyle(isBold: false, fontSize: .normal)
        ))
        
        // Continue with elegant styling...
        
        return PrintContent(
            sections: sections,
            settings: PrintSettings(cutType: .full, paperWidth: 32)
        )
    }
}

// MARK: - Receipt Themes
enum ReceiptTheme: String, CaseIterable, Codable {
    case standard = "standard"
    case minimal = "minimal"
    case elegant = "elegant"
    
    var displayName: String {
        switch self {
        case .standard: return "Standard"
        case .minimal: return "Minimal"
        case .elegant: return "Elegant"
        }
    }
    
    var description: String {
        switch self {
        case .standard: return "Classic receipt format with all details"
        case .minimal: return "Clean, simple design with essential info only"
        case .elegant: return "Decorative design with borders and styling"
        }
    }
}

// MARK: - Print Format Settings
struct PrintFormatSettings: Codable {
    var kitchenSummaryStyle: KitchenSummaryStyle
    var receiptTheme: ReceiptTheme
    var includeEmojis: Bool
    var customFooterMessages: [String]
    var paperWidth: Int
    
    init() {
        self.kitchenSummaryStyle = .standard
        self.receiptTheme = .standard
        self.includeEmojis = false
        self.customFooterMessages = []
        self.paperWidth = 32
    }
}

enum KitchenSummaryStyle: String, CaseIterable, Codable {
    case standard = "standard"
    case detailed = "detailed"
    case compact = "compact"
    
    var displayName: String {
        switch self {
        case .standard: return "Standard"
        case .detailed: return "Detailed"
        case .compact: return "Compact"
        }
    }
}

// MARK: - Extended PrintFormatter with Customization
extension PrintFormatter {
    
    func formatKitchenSummaryWithCustomization(_ group: GroupedItem, settings: PrintFormatSettings) -> Data {
        let customizer = PrintFormatCustomizer.shared
        
        let content = customizer.createCustomKitchenSummary(
            group: group,
            headerStyle: PrintStyle(isBold: true, fontSize: .doubleWidthAndHeight),
            includeCategory: true,
            includePriority: true,
            customFooter: settings.customFooterMessages.first
        )
        
        return formatForThermalPrinter(content)
    }
    
    func formatCustomerReceiptWithCustomization(_ order: Order, settings: PrintFormatSettings) -> Data {
        let customizer = PrintFormatCustomizer.shared
        
        let content = customizer.createCustomReceipt(
            order: order,
            theme: settings.receiptTheme,
            includeLogo: true,
            customMessages: settings.customFooterMessages
        )
        
        return formatForThermalPrinter(content)
    }
}
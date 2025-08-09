import Foundation

// MARK: - Template Theme System
enum TemplateTheme: String, CaseIterable {
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
        case .standard: return "Balanced layout with all details"
        case .minimal: return "Clean, essential information only"
        case .elegant: return "Enhanced formatting with decorative elements"
        }
    }
}

enum TemplateType: String, CaseIterable {
    case receipt = "receipt"
    case kitchen = "kitchen"
    
    var displayName: String {
        switch self {
        case .receipt: return "Receipt"
        case .kitchen: return "Kitchen Order"
        }
    }
}

// MARK: - Template Theme Manager
class TemplateThemeManager {
    static let shared = TemplateThemeManager()
    
    private init() {}
    
    // MARK: - Template Loading
    func loadTemplate(type: TemplateType, language: PrintLanguage, theme: TemplateTheme) -> String? {
        let filename = "\(type.rawValue)_\(theme.rawValue)_\(language.rawValue)"
        return loadTemplateFile(filename) ?? loadFallbackTemplate(type: type, theme: theme)
    }
    
    private func loadTemplateFile(_ filename: String) -> String? {
        guard let path = Bundle.main.path(forResource: filename, ofType: "txt"),
              let content = try? String(contentsOfFile: path) else {
            return nil
        }
        return content
    }
    
    private func loadFallbackTemplate(type: TemplateType, theme: TemplateTheme) -> String? {
        // Try loading base template for type and theme (without language suffix)
        let baseFilename = "\(type.rawValue)_\(theme.rawValue)"
        if let content = loadTemplateFile(baseFilename) {
            return content
        }
        
        // Final fallback to hardcoded templates
        return getHardcodedTemplate(type: type, theme: theme)
    }
    
    // MARK: - Hardcoded Template Fallbacks
    private func getHardcodedTemplate(type: TemplateType, theme: TemplateTheme) -> String {
        switch (type, theme) {
        case (.receipt, .standard):
            return getStandardReceiptTemplate()
        case (.receipt, .minimal):
            return getMinimalReceiptTemplate()
        case (.receipt, .elegant):
            return getElegantReceiptTemplate()
        case (.kitchen, .standard):
            return getStandardKitchenTemplate()
        case (.kitchen, .minimal):
            return getMinimalKitchenTemplate()
        case (.kitchen, .elegant):
            return getElegantKitchenTemplate()
        }
    }
    
    // MARK: - Receipt Templates
    private func getStandardReceiptTemplate() -> String {
        return """
        [CENTER][BOLD]{{restaurant.name}}[/BOLD][/CENTER]
        [CENTER]{{restaurant.address}}[/CENTER]
        [CENTER]{{restaurant.phone}}[/CENTER]
        {{#restaurant.tax_code}}[CENTER]Tax Code: {{restaurant.tax_code}}[/CENTER]{{/restaurant.tax_code}}
        
        [SEPARATOR]
        
        [CENTER][BOLD]Receipt[/BOLD][/CENTER]
        Order: {{order.id}}
        Table: {{order.table_name}}
        Date: {{order.date}}
        Time: {{order.time}}
        
        [SEPARATOR]
        
        {{#items}}
        [ROW]
        [COL_LEFT]{{quantity}}x {{name}}[/COL_LEFT]
        [COL_RIGHT]¥{{price}}[/COL_RIGHT]
        [/ROW]
        {{#notes}}
          Note: {{notes}}
        {{/notes}}
        {{/items}}
        
        [SEPARATOR]
        
        [ROW]
        [COL_LEFT]Subtotal:[/COL_LEFT]
        [COL_RIGHT]¥{{subtotal}}[/COL_RIGHT]
        [/ROW]
        
        {{#tax}}
        [ROW]
        [COL_LEFT]Tax:[/COL_LEFT]
        [COL_RIGHT]¥{{tax}}[/COL_RIGHT]
        [/ROW]
        {{/tax}}
        
        {{#discount}}
        [ROW]
        [COL_LEFT]Discount:[/COL_LEFT]
        [COL_RIGHT]-¥{{discount}}[/COL_RIGHT]
        [/ROW]
        {{/discount}}
        
        [SEPARATOR]
        
        [ROW]
        [COL_LEFT][BOLD]Total:[/BOLD][/COL_LEFT]
        [COL_RIGHT][BOLD]¥{{total_price}}[/BOLD][/COL_RIGHT]
        [/ROW]
        
        [SEPARATOR]
        
        [CENTER]{{#custom_footer}}{{custom_footer}}{{/custom_footer}}{{^custom_footer}}Thank you for your visit!{{/custom_footer}}[/CENTER]
        {{#restaurant.website}}[CENTER]{{restaurant.website}}[/CENTER]{{/restaurant.website}}
        {{#promotional_message}}[CENTER]{{promotional_message}}[/CENTER]{{/promotional_message}}
        
        [CUT]
        """
    }
    
    private func getMinimalReceiptTemplate() -> String {
        return """
        [CENTER][BOLD]{{restaurant.name}}[/BOLD][/CENTER]
        [CENTER]{{restaurant.phone}}[/CENTER]
        
        Order: {{order.id}} | {{order.table_name}}
        {{order.date}} {{order.time}}
        
        [SEPARATOR]
        
        {{#items}}
        {{quantity}}x {{name}} - ¥{{price}}
        {{/items}}
        
        [SEPARATOR]
        [BOLD]Total: ¥{{total_price}}[/BOLD]
        
        [CENTER]Thank you![/CENTER]
        [CUT]
        """
    }
    
    private func getElegantReceiptTemplate() -> String {
        return """
        [CENTER]═══════════════════════════[/CENTER]
        [CENTER][BOLD]{{restaurant.name}}[/BOLD][/CENTER]
        [CENTER]{{restaurant.address}}[/CENTER]
        [CENTER]{{restaurant.phone}}[/CENTER]
        {{#restaurant.tax_code}}[CENTER]Tax Code: {{restaurant.tax_code}}[/CENTER]{{/restaurant.tax_code}}
        [CENTER]═══════════════════════════[/CENTER]
        
        [CENTER][BOLD]✧ RECEIPT ✧[/BOLD][/CENTER]
        
        Order No: {{order.id}}
        Table: {{order.table_name}}
        Date: {{order.date}}
        Time: {{order.time}}
        
        [CENTER]───────────────────────────[/CENTER]
        
        {{#items}}
        [ROW]
        [COL_LEFT]{{quantity}}× {{name}}[/COL_LEFT]
        [COL_RIGHT]¥{{price}}[/COL_RIGHT]
        [/ROW]
        {{#notes}}
        [CENTER]※ {{notes}} ※[/CENTER]
        {{/notes}}
        {{/items}}
        
        [CENTER]───────────────────────────[/CENTER]
        
        [ROW]
        [COL_LEFT]Subtotal[/COL_LEFT]
        [COL_RIGHT]¥{{subtotal}}[/COL_RIGHT]
        [/ROW]
        
        {{#tax}}
        [ROW]
        [COL_LEFT]Tax[/COL_LEFT]
        [COL_RIGHT]¥{{tax}}[/COL_RIGHT]
        [/ROW]
        {{/tax}}
        
        {{#discount}}
        [ROW]
        [COL_LEFT]Discount[/COL_LEFT]
        [COL_RIGHT]-¥{{discount}}[/COL_RIGHT]
        [/ROW]
        {{/discount}}
        
        [CENTER]═══════════════════════════[/CENTER]
        [ROW]
        [COL_LEFT][BOLD]✧ TOTAL ✧[/BOLD][/COL_LEFT]
        [COL_RIGHT][BOLD]¥{{total_price}}[/BOLD][/COL_RIGHT]
        [/ROW]
        [CENTER]═══════════════════════════[/CENTER]
        
        [CENTER]{{#custom_footer}}{{custom_footer}}{{/custom_footer}}{{^custom_footer}}✧ Thank you for dining with us! ✧{{/custom_footer}}[/CENTER]
        {{#restaurant.website}}[CENTER]{{restaurant.website}}[/CENTER]{{/restaurant.website}}
        {{#promotional_message}}[CENTER]✦ {{promotional_message}} ✦[/CENTER]{{/promotional_message}}
        
        [CUT]
        """
    }
    
    // MARK: - Kitchen Templates
    private func getStandardKitchenTemplate() -> String {
        return """
        [CENTER][BOLD]KITCHEN ORDER[/BOLD][/CENTER]
        [CENTER]{{restaurant.name}}[/CENTER]
        
        [SEPARATOR]
        
        Order: {{order.id}}
        Table: {{order.table_name}}
        Time: {{order.time}}
        
        [SEPARATOR]
        
        {{#items}}
        [BOLD]{{quantity}}x {{name}}[/BOLD]
        {{#notes}}
        [BOLD]► {{notes}}[/BOLD]
        {{/notes}}
        
        {{/items}}
        
        {{#special_instructions}}
        [SEPARATOR]
        [BOLD]SPECIAL INSTRUCTIONS:[/BOLD]
        {{special_instructions}}
        {{/special_instructions}}
        
        [SEPARATOR]
        [CENTER]Prepared by: _____________[/CENTER]
        [CUT]
        """
    }
    
    private func getMinimalKitchenTemplate() -> String {
        return """
        [BOLD]ORDER {{order.id}} - {{order.table_name}}[/BOLD]
        {{order.time}}
        
        {{#items}}
        {{quantity}}x {{name}}
        {{#notes}}► {{notes}}{{/notes}}
        {{/items}}
        
        {{#special_instructions}}
        NOTE: {{special_instructions}}
        {{/special_instructions}}
        
        [CUT]
        """
    }
    
    private func getElegantKitchenTemplate() -> String {
        return """
        [CENTER]▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄[/CENTER]
        [CENTER][BOLD]🍽️ KITCHEN ORDER 🍽️[/BOLD][/CENTER]
        [CENTER]{{restaurant.name}}[/CENTER]
        [CENTER]▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄[/CENTER]
        
        Order: {{order.id}}
        Table: {{order.table_name}}
        Time: {{order.time}}
        
        [CENTER]▬▬▬▬▬▬▬▬ ITEMS ▬▬▬▬▬▬▬▬[/CENTER]
        
        {{#items}}
        [BOLD]{{quantity}}× {{name}}[/BOLD]
        {{#notes}}
        🔸 {{notes}}
        {{/notes}}
        
        {{/items}}
        
        {{#special_instructions}}
        [CENTER]▬▬▬▬▬▬ SPECIAL NOTES ▬▬▬▬▬▬[/CENTER]
        🔥 {{special_instructions}}
        {{/special_instructions}}
        
        [CENTER]▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄[/CENTER]
        [CENTER]Chef: _____________ ✓[/CENTER]
        [CUT]
        """
    }
    
    // MARK: - Template Management
    func getAvailableThemes(for type: TemplateType, language: PrintLanguage) -> [TemplateTheme] {
        return TemplateTheme.allCases.filter { theme in
            loadTemplate(type: type, language: language, theme: theme) != nil
        }
    }
    
    func getAllTemplateInfo() -> [(type: TemplateType, language: PrintLanguage, theme: TemplateTheme)] {
        var templates: [(TemplateType, PrintLanguage, TemplateTheme)] = []
        
        for type in TemplateType.allCases {
            for language in PrintLanguage.allCases {
                for theme in TemplateTheme.allCases {
                    if loadTemplate(type: type, language: language, theme: theme) != nil {
                        templates.append((type, language, theme))
                    }
                }
            }
        }
        
        return templates
    }
}
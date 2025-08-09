import Foundation

// MARK: - Template Theme System
enum TemplateTheme: String, CaseIterable {
    case standard = "standard"
    case minimal = "minimal"
    case elegant = "elegant"
    
    var displayName: String {
        switch self {
        case .standard: return "template_theme_standard_name".localized
        case .minimal:  return "template_theme_minimal_name".localized
        case .elegant:  return "template_theme_elegant_name".localized
        }
    }
    
    var description: String {
        switch self {
        case .standard: return "template_theme_standard_desc".localized
        case .minimal:  return "template_theme_minimal_desc".localized
        case .elegant:  return "template_theme_elegant_desc".localized
        }
    }
}

enum TemplateType: String, CaseIterable {
    case receipt = "receipt"
    case kitchen = "kitchen"
    
    var displayName: String {
        switch self {
        case .receipt: return "template_type_receipt".localized
        case .kitchen: return "template_type_kitchen".localized
        }
    }
}

// MARK: - Template Theme Manager
class TemplateThemeManager {
    static let shared = TemplateThemeManager()
    
    init() {}
    
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
        {{#restaurant.tax_code}}[CENTER]{{i18n.tax_code}}: {{restaurant.tax_code}}[/CENTER]{{/restaurant.tax_code}}
        
        [SEPARATOR]
        
        [CENTER][BOLD]{{i18n.receipt}}[/BOLD][/CENTER]
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
        {{#notes}}
          {{i18n.note}}: {{notes}}
        {{/notes}}
        {{/items}}
        
        [SEPARATOR]
        
        [ROW]
        [COL_LEFT]{{i18n.subtotal}}:[/COL_LEFT]
        [COL_RIGHT]¥{{subtotal}}[/COL_RIGHT]
        [/ROW]
        
        {{#tax}}
        [ROW]
        [COL_LEFT]{{i18n.tax}}:[/COL_LEFT]
        [COL_RIGHT]¥{{tax}}[/COL_RIGHT]
        [/ROW]
        {{/tax}}
        
        {{#discount}}
        [ROW]
        [COL_LEFT]{{i18n.discount}}:[/COL_LEFT]
        [COL_RIGHT]-¥{{discount}}[/COL_RIGHT]
        [/ROW]
        {{/discount}}
        
        [SEPARATOR]
        
        [ROW]
        [COL_LEFT][BOLD]{{i18n.total}}:[/BOLD][/COL_LEFT]
        [COL_RIGHT][BOLD]¥{{total_price}}[/BOLD][/COL_RIGHT]
        [/ROW]
        
        [SEPARATOR]
        
        [CENTER]{{#custom_footer}}{{custom_footer}}{{/custom_footer}}{{^custom_footer}}{{i18n.thank_you}}{{/custom_footer}}[/CENTER]
        {{#restaurant.website}}[CENTER]{{restaurant.website}}[/CENTER]{{/restaurant.website}}
        {{#promotional_message}}[CENTER]{{promotional_message}}[/CENTER]{{/promotional_message}}
        
        [CUT]
        """
    }
    
    private func getMinimalReceiptTemplate() -> String {
        return """
        [CENTER][BOLD]{{restaurant.name}}[/BOLD][/CENTER]
        [CENTER]{{restaurant.phone}}[/CENTER]
        
        {{i18n.order}}: {{order.id}} | {{i18n.table}}: {{order.table_name}}
        {{order.date}} {{order.time}}
        
        [SEPARATOR]
        
        {{#items}}
        {{quantity}}x {{name}} - ¥{{price}}
        {{/items}}
        
        [SEPARATOR]
        [BOLD]{{i18n.total}}: ¥{{total_price}}[/BOLD]
        
        [CENTER]{{i18n.thank_you_short}}[/CENTER]
        [CUT]
        """
    }
    
    private func getElegantReceiptTemplate() -> String {
        return """
        [CENTER]═══════════════════════════[/CENTER]
        [CENTER][BOLD]{{restaurant.name}}[/BOLD][/CENTER]
        [CENTER]{{restaurant.address}}[/CENTER]
        [CENTER]{{restaurant.phone}}[/CENTER]
        {{#restaurant.tax_code}}[CENTER]{{i18n.tax_code}}: {{restaurant.tax_code}}[/CENTER]{{/restaurant.tax_code}}
        [CENTER]═══════════════════════════[/CENTER]
        
        [CENTER][BOLD]✧ {{i18n.receipt}} ✧[/BOLD][/CENTER]
        
        {{i18n.order}}: {{order.id}}
        {{i18n.table}}: {{order.table_name}}
        {{i18n.date}}: {{order.date}}
        {{i18n.time}}: {{order.time}}
        
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
        [COL_LEFT]{{i18n.subtotal}}[/COL_LEFT]
        [COL_RIGHT]¥{{subtotal}}[/COL_RIGHT]
        [/ROW]
        
        {{#tax}}
        [ROW]
        [COL_LEFT]{{i18n.tax}}[/COL_LEFT]
        [COL_RIGHT]¥{{tax}}[/COL_RIGHT]
        [/ROW]
        {{/tax}}
        
        {{#discount}}
        [ROW]
        [COL_LEFT]{{i18n.discount}}[/COL_LEFT]
        [COL_RIGHT]-¥{{discount}}[/COL_RIGHT]
        [/ROW]
        {{/discount}}
        
        [CENTER]═══════════════════════════[/CENTER]
        [ROW]
        [COL_LEFT][BOLD]✧ {{i18n.total}} ✧[/BOLD][/COL_LEFT]
        [COL_RIGHT][BOLD]¥{{total_price}}[/BOLD][/COL_RIGHT]
        [/ROW]
        [CENTER]═══════════════════════════[/CENTER]
        
        [CENTER]{{#custom_footer}}{{custom_footer}}{{/custom_footer}}{{^custom_footer}}✧ {{i18n.thank_you_dining}} ✧{{/custom_footer}}[/CENTER]
        {{#restaurant.website}}[CENTER]{{restaurant.website}}[/CENTER]{{/restaurant.website}}
        {{#promotional_message}}[CENTER]✦ {{promotional_message}} ✦[/CENTER]{{/promotional_message}}
        
        [CUT]
        """
    }
    
    // MARK: - Kitchen Templates
    private func getStandardKitchenTemplate() -> String {
        return """
        [CENTER][BOLD]{{i18n.kitchen_order}}[/BOLD][/CENTER]
        [CENTER]{{restaurant.name}}[/CENTER]
        
        [SEPARATOR]
        
        {{i18n.order}}: {{order.id}}
        {{i18n.table}}: {{order.table_name}}
        {{i18n.time}}: {{order.time}}
        
        [SEPARATOR]
        
        {{#items}}
        [BOLD]{{quantity}}x {{name}}[/BOLD]
        {{#notes}}
        [BOLD]► {{notes}}[/BOLD]
        {{/notes}}
        
        {{/items}}
        
        {{#special_instructions}}
        [SEPARATOR]
        [BOLD]{{i18n.special_instructions}}[/BOLD]
        {{special_instructions}}
        {{/special_instructions}}
        
        [SEPARATOR]
        [CENTER]{{i18n.prepared_by}} _____________[/CENTER]
        [CUT]
        """
    }
    
    private func getMinimalKitchenTemplate() -> String {
        return """
        [BOLD]{{i18n.order}} {{order.id}} - {{order.table_name}}[/BOLD]
        {{order.time}}
        
        {{#items}}
        {{quantity}}x {{name}}
        {{#notes}}► {{notes}}{{/notes}}
        {{/items}}
        
        {{#special_instructions}}
        {{i18n.special_notes}}: {{special_instructions}}
        {{/special_instructions}}
        
        [CUT]
        """
    }
    
    private func getElegantKitchenTemplate() -> String {
        return """
        [CENTER]▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄[/CENTER]
        [CENTER][BOLD]🍽️ {{i18n.kitchen_order}} 🍽️[/BOLD][/CENTER]
        [CENTER]{{restaurant.name}}[/CENTER]
        [CENTER]▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄[/CENTER]
        
        {{i18n.order}}: {{order.id}}
        {{i18n.table}}: {{order.table_name}}
        {{i18n.time}}: {{order.time}}
        
        [CENTER]▬▬▬▬▬▬▬▬ {{i18n.items}} ▬▬▬▬▬▬▬▬[/CENTER]
        
        {{#items}}
        [BOLD]{{quantity}}× {{name}}[/BOLD]
        {{#notes}}
        🔸 {{notes}}
        {{/notes}}
        
        {{/items}}
        
        {{#special_instructions}}
        [CENTER]▬▬▬▬▬▬ {{i18n.special_notes}} ▬▬▬▬▬▬[/CENTER]
        🔥 {{special_instructions}}
        {{/special_instructions}}
        
        [CENTER]▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄[/CENTER]
        [CENTER]{{i18n.prepared_by}} _____________ ✓[/CENTER]
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

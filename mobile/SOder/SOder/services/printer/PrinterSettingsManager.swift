import Foundation
import SwiftUI

// MARK: - Printer Settings Manager
class PrinterSettingsManager: ObservableObject {
    static let shared = PrinterSettingsManager()

    private enum Defaults {
        static let restaurantName = "SOder Restaurant"
        static let restaurantAddress = "123 Restaurant Street, City"
        static let restaurantPhone = "+81-xxx-xxx-xxxx"
        static let restaurantWebsite = "soder-restaurant.com"
        static let footerMessage = "Thank you for your visit!"
    }
    
    @Published var configuredPrinters: [ConfiguredPrinter] = []
    @Published var activePrinter: ConfiguredPrinter?
    @Published var restaurantSettings: RestaurantSettings
    
    // New: Dual printer support
    @Published var kitchenPrinter: ConfiguredPrinter?
    @Published var checkoutPrinter: ConfiguredPrinter?
    
    // New: Printer mode selection
    @Published var printerMode: PrinterMode = .single
    
    // New: Print language and receipt header settings
    @Published var printLanguage: PrintLanguage = .english // legacy single language (kept for compatibility)
    @Published var selectedReceiptLanguage: PrintLanguage = .english { didSet { saveSelectedLanguages() } }
    @Published var selectedKitchenLanguage: PrintLanguage = .english { didSet { saveSelectedLanguages() } }
    @Published var receiptHeader: ReceiptHeaderSettings
    @Published var receiptEncoding: String.Encoding = .utf8 { didSet { saveReceiptEncoding() } }
    @Published var customReceiptTemplate: String = "" { didSet { saveCustomReceiptTemplate() } }
    
    // Enhanced: Encoding strategy for UTF-8 first approach
    @Published var encodingStrategy: PrinterConfig.EncodingUtils.Strategy?
    
    // Language capability storage per printer
    @Published var printerLanguageCapabilities: [String: [PrintLanguage: Bool]] = [:]

    // Connection status tracking per printer
    @Published var printerConnectionStatus: [String: ConnectionStatus] = [:]

    // Template theme selection
    @Published var selectedReceiptTheme: TemplateTheme = .standard { didSet { saveTemplateThemes() } }
    @Published var selectedKitchenTheme: TemplateTheme = .standard { didSet { saveTemplateThemes() } }
    
    private let userDefaults = UserDefaults.standard
    private let printersKey = "configured_printers"
    private let activePrinterKey = "active_printer_id"
    private let kitchenPrinterKey = "kitchen_printer_id"
    private let checkoutPrinterKey = "checkout_printer_id"
    private let printerModeKey = "printer_mode"
    private let restaurantSettingsKey = "restaurant_settings"
    private let printLanguageKey = "print_language" // legacy
    private let receiptLanguageKey = "selected_receipt_language" // NEW
    private let kitchenLanguageKey = "selected_kitchen_language" // NEW
    private let receiptHeaderKey = "receipt_header"
    private let receiptEncodingKey = "receipt_encoding"
    private let customReceiptTemplateKey = "custom_receipt_template"
    private let encodingStrategyKey = "encoding_strategy"
    private let languageCapabilitiesKey = "printer_language_capabilities"
    private let receiptThemeKey = "selected_receipt_theme"
    private let kitchenThemeKey = "selected_kitchen_theme"
    
    private init() {
        // Initialize with default restaurant settings
        self.restaurantSettings = RestaurantSettings(
            name: Defaults.restaurantName,
            address: Defaults.restaurantAddress,
            phone: Defaults.restaurantPhone,
            website: Defaults.restaurantWebsite,
            dateTimeFormat: "yyyy-MM-dd HH:mm:ss"
        )
        
        // Initialize receipt header with restaurant settings
        self.receiptHeader = ReceiptHeaderSettings(
            restaurantName: Defaults.restaurantName,
            address: Defaults.restaurantAddress,
            phone: Defaults.restaurantPhone,
            website: Defaults.restaurantWebsite,
            footerMessage: Defaults.footerMessage
        )
        
        loadSettings()
    }
    
    // MARK: - Printer Management
    func addPrinter(_ printer: ConfiguredPrinter) {
        configuredPrinters.append(printer)
        
        // Auto-assign based on printer type if not already set
        switch printer.printerType {
        case .kitchen:
            if kitchenPrinter == nil {
                setKitchenPrinter(printer)
            }
        case .receipt:
            if checkoutPrinter == nil {
                setCheckoutPrinter(printer)
            }
        case .label:
            break // Labels don't auto-assign to kitchen/checkout
        }
        
        saveSettings()
    }
    
    func removePrinter(id: String) {
        configuredPrinters.removeAll { $0.id == id }
        
        // Clear printer assignments if they were removed
        if kitchenPrinter?.id == id {
            setKitchenPrinter(nil)
        }
        if checkoutPrinter?.id == id {
            setCheckoutPrinter(nil)
        }
        if activePrinter?.id == id {
            activePrinter = nil
        }
        
        saveSettings()
    }
    
    func updatePrinter(_ printer: ConfiguredPrinter) {
        if let index = configuredPrinters.firstIndex(where: { $0.id == printer.id }) {
            configuredPrinters[index] = printer
            
            // Update active printer if it's the one being updated
            if activePrinter?.id == printer.id {
                activePrinter = printer
            }
            
            saveSettings()
        }
    }
    
    func setActivePrinter(_ printer: ConfiguredPrinter) {
        activePrinter = printer
        saveActivePrinter()
    }
    
    func clearActivePrinter() {
        activePrinter = nil
        userDefaults.removeObject(forKey: activePrinterKey)
    }
    
    // MARK: - Dual Printer Management
    func setKitchenPrinter(_ printer: ConfiguredPrinter?) {
        kitchenPrinter = printer
        if let printer = printer {
            userDefaults.set(printer.id, forKey: kitchenPrinterKey)
        } else {
            userDefaults.removeObject(forKey: kitchenPrinterKey)
        }
    }
    
    func setCheckoutPrinter(_ printer: ConfiguredPrinter?) {
        checkoutPrinter = printer
        if let printer = printer {
            userDefaults.set(printer.id, forKey: checkoutPrinterKey)
        } else {
            userDefaults.removeObject(forKey: checkoutPrinterKey)
        }
    }
    
    func getKitchenPrinterConfig() -> PrinterConfig.Hardware? {
        guard let kitchenPrinter = kitchenPrinter else { return nil }
        return PrinterConfig.Hardware(
            ipAddress: kitchenPrinter.ipAddress,
            port: kitchenPrinter.port,
            name: kitchenPrinter.name,
            connectionTimeout: kitchenPrinter.connectionTimeout,
            maxRetries: kitchenPrinter.maxRetries
        )
    }
    
    func getCheckoutPrinterConfig() -> PrinterConfig.Hardware? {
        guard let checkoutPrinter = checkoutPrinter else { return nil }
        return PrinterConfig.Hardware(
            ipAddress: checkoutPrinter.ipAddress,
            port: checkoutPrinter.port,
            name: checkoutPrinter.name,
            connectionTimeout: checkoutPrinter.connectionTimeout,
            maxRetries: checkoutPrinter.maxRetries
        )
    }
    
    func isDualPrinterSetup() -> Bool {
        return kitchenPrinter != nil && checkoutPrinter != nil
    }
    
    func hasKitchenPrinter() -> Bool {
        return kitchenPrinter != nil
    }
    
    func hasCheckoutPrinter() -> Bool {
        return checkoutPrinter != nil
    }
    
    // MARK: - Get Current Printer Configuration
    func getCurrentPrinterConfig() -> PrinterConfig.Hardware {
        // Use user-configured printer if available
        if let activePrinter = activePrinter {
            return PrinterConfig.Hardware(
                ipAddress: activePrinter.ipAddress,
                port: activePrinter.port,
                name: activePrinter.name,
                connectionTimeout: activePrinter.connectionTimeout,
                maxRetries: activePrinter.maxRetries
            )
        }
        
        // Fallback to first configured printer
        if let firstPrinter = configuredPrinters.first {
            return PrinterConfig.Hardware(
                ipAddress: firstPrinter.ipAddress,
                port: firstPrinter.port,
                name: firstPrinter.name,
                connectionTimeout: firstPrinter.connectionTimeout,
                maxRetries: firstPrinter.maxRetries
            )
        }
        
        // Final fallback to default printer
        return PrinterConfig.shared.defaultPrinter
    }
    
    func hasUserConfiguredPrinters() -> Bool {
        return !configuredPrinters.isEmpty
    }
    
    func isUsingDefaultPrinter() -> Bool {
        return activePrinter == nil && configuredPrinters.isEmpty
    }
    
    // MARK: - Restaurant Settings
    func updateRestaurantSettings(_ settings: RestaurantSettings) {
        restaurantSettings = settings
        saveRestaurantSettings()
    }
    
    // MARK: - Print Language Management (legacy)
    func setPrintLanguage(_ language: PrintLanguage) {
        printLanguage = language
        // Keep legacy behavior mapped to receipt language to avoid breaking callers
        selectedReceiptLanguage = language
        savePrintLanguage()
        saveSelectedLanguages()
    }
    
    // NEW: Separate setters
    func setReceiptLanguage(_ language: PrintLanguage) {
        selectedReceiptLanguage = language
        saveSelectedLanguages()
    }
    
    func setKitchenLanguage(_ language: PrintLanguage) {
        selectedKitchenLanguage = language
        saveSelectedLanguages()
    }
    
    // MARK: - Receipt Header Management
    func updateReceiptHeader(_ header: ReceiptHeaderSettings) {
        receiptHeader = header
        syncRestaurantSettingsFromReceiptHeader()
        saveReceiptHeader()
    }
    
    func autoFetchReceiptHeaderFromRestaurantSettings() {
        receiptHeader = ReceiptHeaderSettings(
            restaurantName: restaurantSettings.name,
            address: restaurantSettings.address,
            phone: restaurantSettings.phone,
            taxCode: receiptHeader.taxCode,
            website: restaurantSettings.website,
            footerMessage: receiptHeader.footerMessage,
            promotionalText: receiptHeader.promotionalText,
            showTaxCode: receiptHeader.showTaxCode,
            showWebsite: receiptHeader.showWebsite,
            showPromotionalText: receiptHeader.showPromotionalText
        )
        syncRestaurantSettingsFromReceiptHeader()
        saveReceiptHeader()
    }

    func syncFromCurrentRestaurant(_ restaurant: Restaurant? = SupabaseManager.shared.currentRestaurant) {
        guard let restaurant else { return }

        let resolvedName = resolvedRestaurantName(from: restaurant)
        var didChangeRestaurantSettings = false
        var didChangeReceiptHeader = false

        if !resolvedName.isEmpty && shouldReplaceRestaurantName(restaurantSettings.name) {
            restaurantSettings.name = resolvedName
            didChangeRestaurantSettings = true
        }

        if !resolvedName.isEmpty && shouldReplaceRestaurantName(receiptHeader.restaurantName) {
            receiptHeader.restaurantName = resolvedName
            didChangeReceiptHeader = true
        }

        if shouldReplaceFooterMessage(receiptHeader.footerMessage) {
            receiptHeader.footerMessage = Defaults.footerMessage
            didChangeReceiptHeader = true
        }

        if shouldReplaceRestaurantName(restaurantSettings.website) {
            restaurantSettings.website = ""
            didChangeRestaurantSettings = true
        }

        if shouldReplaceRestaurantName(receiptHeader.website) {
            receiptHeader.website = restaurantSettings.website
            didChangeReceiptHeader = true
        }

        if didChangeRestaurantSettings {
            saveRestaurantSettings()
        }

        if didChangeReceiptHeader {
            syncRestaurantSettingsFromReceiptHeader()
            saveReceiptHeader()
        }
    }

    var primaryReceiptPrinter: ConfiguredPrinter? {
        switch printerMode {
        case .single:
            return activePrinter ?? configuredPrinters.first
        case .dual:
            return checkoutPrinter ?? activePrinter ?? configuredPrinters.first
        }
    }

    var usesSeparateKitchenPrinter: Bool {
        printerMode == .dual
    }

    var setupSummaryText: String {
        if let receiptPrinter = primaryReceiptPrinter {
            if printerMode == .dual, let kitchenPrinter = kitchenPrinter {
                return String(format: "printer_setup_summary_dual".localized, receiptPrinter.name, kitchenPrinter.name)
            }

            return String(format: "printer_setup_summary_single".localized, receiptPrinter.name)
        }

        return "printer_setup_summary_empty".localized
    }

    func setSeparateKitchenPrinterEnabled(_ enabled: Bool) {
        if enabled {
            setPrinterMode(.dual)

            if checkoutPrinter == nil {
                setCheckoutPrinter(activePrinter ?? configuredPrinters.first)
            }

            if kitchenPrinter == nil {
                setKitchenPrinter(configuredPrinters.first(where: { $0.id != checkoutPrinter?.id }) ?? configuredPrinters.first)
            }
        } else {
            setPrinterMode(.single)

            if activePrinter == nil {
                activePrinter = checkoutPrinter ?? kitchenPrinter ?? configuredPrinters.first
                saveActivePrinter()
            }
        }

        saveDualPrinters()
    }

    func assignPrimaryReceiptPrinter(_ printer: ConfiguredPrinter?) {
        switch printerMode {
        case .single:
            if let printer {
                setActivePrinter(printer)
            } else {
                clearActivePrinter()
            }
        case .dual:
            setCheckoutPrinter(printer)

            if kitchenPrinter?.id == printer?.id {
                setKitchenPrinter(configuredPrinters.first(where: { $0.id != printer?.id }))
            }
        }
    }
    
    // MARK: - Persistence
    private func loadSettings() {
        loadConfiguredPrinters()
        loadActivePrinter()
        loadDualPrinters()
        loadPrinterMode()
        loadRestaurantSettings()
        loadPrintLanguage()
        loadSelectedLanguages() // NEW
        loadReceiptHeader()
        loadReceiptEncoding()
        loadCustomReceiptTemplate()
        loadEncodingStrategy()
        loadLanguageCapabilities()
        loadTemplateThemes()
    }
    
    private func loadConfiguredPrinters() {
        if let data = userDefaults.data(forKey: printersKey),
           let printers = try? JSONDecoder().decode([ConfiguredPrinter].self, from: data) {
            configuredPrinters = printers
        }
    }
    
    private func loadActivePrinter() {
        if let activePrinterId = userDefaults.string(forKey: activePrinterKey),
           let printer = configuredPrinters.first(where: { $0.id == activePrinterId }) {
            activePrinter = printer
        }
    }
    
    private func loadDualPrinters() {
        // Load kitchen printer
        if let kitchenPrinterId = userDefaults.string(forKey: kitchenPrinterKey),
           let printer = configuredPrinters.first(where: { $0.id == kitchenPrinterId }) {
            kitchenPrinter = printer
        }
        
        // Load checkout printer
        if let checkoutPrinterId = userDefaults.string(forKey: checkoutPrinterKey),
           let printer = configuredPrinters.first(where: { $0.id == checkoutPrinterId }) {
            checkoutPrinter = printer
        }
    }
    
    private func loadPrinterMode() {
        if let modeRawValue = userDefaults.string(forKey: printerModeKey),
           let mode = PrinterMode(rawValue: modeRawValue) {
            printerMode = mode
        }
    }
    
    private func loadRestaurantSettings() {
        if let data = userDefaults.data(forKey: restaurantSettingsKey),
           let settings = try? JSONDecoder().decode(RestaurantSettings.self, from: data) {
            restaurantSettings = settings
        }
    }
    
    private func loadPrintLanguage() {
        if let languageRawValue = userDefaults.string(forKey: printLanguageKey),
           let language = PrintLanguage(rawValue: languageRawValue) {
            printLanguage = language
        }
    }
    
    private func loadSelectedLanguages() { // NEW
        if let receiptLangRaw = userDefaults.string(forKey: receiptLanguageKey),
           let receiptLang = PrintLanguage(rawValue: receiptLangRaw) {
            selectedReceiptLanguage = receiptLang
        } else {
            // fallback to legacy
            selectedReceiptLanguage = printLanguage
        }
        
        if let kitchenLangRaw = userDefaults.string(forKey: kitchenLanguageKey),
           let kitchenLang = PrintLanguage(rawValue: kitchenLangRaw) {
            selectedKitchenLanguage = kitchenLang
        } else {
            selectedKitchenLanguage = printLanguage
        }
    }
    
    private func loadReceiptHeader() {
        if let data = userDefaults.data(forKey: receiptHeaderKey),
           let header = try? JSONDecoder().decode(ReceiptHeaderSettings.self, from: data) {
            receiptHeader = header
        }
    }
    
    private func loadReceiptEncoding() {
        let encodingRawValue = userDefaults.integer(forKey: receiptEncodingKey)
        if encodingRawValue != 0 {
            receiptEncoding = String.Encoding(rawValue: UInt(encodingRawValue))
        }
    }
    
    private func loadCustomReceiptTemplate() {
        customReceiptTemplate = userDefaults.string(forKey: customReceiptTemplateKey) ?? ""
    }
    
    private func saveSettings() {
        saveConfiguredPrinters()
        saveActivePrinter()
        saveDualPrinters()
        savePrinterMode()
        saveReceiptEncoding()
        saveCustomReceiptTemplate()
        saveEncodingStrategy()
        saveLanguageCapabilities()
        saveTemplateThemes()
        saveSelectedLanguages() // NEW
    }
    
    private func saveConfiguredPrinters() {
        if let data = try? JSONEncoder().encode(configuredPrinters) {
            userDefaults.set(data, forKey: printersKey)
        }
    }
    
    private func saveActivePrinter() {
        if let activePrinter = activePrinter {
            userDefaults.set(activePrinter.id, forKey: activePrinterKey)
        } else {
            userDefaults.removeObject(forKey: activePrinterKey)
        }
    }
    
    private func saveDualPrinters() {
        // Save kitchen printer
        if let kitchenPrinter = kitchenPrinter {
            userDefaults.set(kitchenPrinter.id, forKey: kitchenPrinterKey)
        } else {
            userDefaults.removeObject(forKey: kitchenPrinterKey)
        }
        
        // Save checkout printer
        if let checkoutPrinter = checkoutPrinter {
            userDefaults.set(checkoutPrinter.id, forKey: checkoutPrinterKey)
        } else {
            userDefaults.removeObject(forKey: checkoutPrinterKey)
        }
    }
    
    private func savePrinterMode() {
        userDefaults.set(printerMode.rawValue, forKey: printerModeKey)
    }
    
    private func saveRestaurantSettings() {
        if let data = try? JSONEncoder().encode(restaurantSettings) {
            userDefaults.set(data, forKey: restaurantSettingsKey)
        }
    }
    
    private func savePrintLanguage() {
        userDefaults.set(printLanguage.rawValue, forKey: printLanguageKey)
    }
    
    private func saveSelectedLanguages() { // NEW
        userDefaults.set(selectedReceiptLanguage.rawValue, forKey: receiptLanguageKey)
        userDefaults.set(selectedKitchenLanguage.rawValue, forKey: kitchenLanguageKey)
    }
    
    private func saveReceiptHeader() {
        if let data = try? JSONEncoder().encode(receiptHeader) {
            userDefaults.set(data, forKey: receiptHeaderKey)
        }
    }
    
    private func saveReceiptEncoding() {
        userDefaults.set(Int(receiptEncoding.rawValue), forKey: receiptEncodingKey)
    }
    
    private func saveCustomReceiptTemplate() {
        userDefaults.set(customReceiptTemplate, forKey: customReceiptTemplateKey)
    }
    
    private func loadEncodingStrategy() {
        if let strategyRawValue = userDefaults.string(forKey: encodingStrategyKey) {
            switch strategyRawValue {
            case "utf8Primary":
                encodingStrategy = .utf8Primary
            case "utf8Fallback":
                encodingStrategy = .utf8Fallback
            case "legacyEncoding":
                encodingStrategy = .legacyEncoding
            default:
                encodingStrategy = nil // Use default
            }
        }
    }
    
    private func saveEncodingStrategy() {
        if let strategy = encodingStrategy {
            let strategyString: String
            switch strategy {
            case .utf8Primary:
                strategyString = "utf8Primary"
            case .utf8Fallback:
                strategyString = "utf8Fallback"
            case .legacyEncoding:
                strategyString = "legacyEncoding"
            }
            userDefaults.set(strategyString, forKey: encodingStrategyKey)
        } else {
            userDefaults.removeObject(forKey: encodingStrategyKey)
        }
    }
    
    private func loadLanguageCapabilities() {
        if let data = userDefaults.data(forKey: languageCapabilitiesKey),
           let decoded = try? JSONDecoder().decode([String: [String: Bool]].self, from: data) {
            // Convert string keys back to PrintLanguage enum
            var capabilities: [String: [PrintLanguage: Bool]] = [:]
            for (printerId, languageDict) in decoded {
                var printerCapabilities: [PrintLanguage: Bool] = [:]
                for (languageString, isSupported) in languageDict {
                    if let language = PrintLanguage(rawValue: languageString) {
                        printerCapabilities[language] = isSupported
                    }
                }
                capabilities[printerId] = printerCapabilities
            }
            printerLanguageCapabilities = capabilities
        }
    }
    
    private func saveLanguageCapabilities() {
        // Convert PrintLanguage enum keys to strings for JSON encoding
        var encodableCapabilities: [String: [String: Bool]] = [:]
        for (printerId, languageDict) in printerLanguageCapabilities {
            var stringDict: [String: Bool] = [:]
            for (language, isSupported) in languageDict {
                stringDict[language.rawValue] = isSupported
            }
            encodableCapabilities[printerId] = stringDict
        }
        
        if let data = try? JSONEncoder().encode(encodableCapabilities) {
            userDefaults.set(data, forKey: languageCapabilitiesKey)
        }
    }
    
    // MARK: - Language Capability Management
    func updateLanguageCapability(for printerId: String, language: PrintLanguage, isSupported: Bool) {
        if printerLanguageCapabilities[printerId] == nil {
            printerLanguageCapabilities[printerId] = [:]
        }
        printerLanguageCapabilities[printerId]?[language] = isSupported
        saveLanguageCapabilities()
    }
    
    func getLanguageCapability(for printerId: String, language: PrintLanguage) -> Bool? {
        return printerLanguageCapabilities[printerId]?[language]
    }
    
    func isLanguageSupported(for printerId: String, language: PrintLanguage) -> Bool {
        return getLanguageCapability(for: printerId, language: language) ?? false
    }
    
    func hasTestedLanguage(for printerId: String, language: PrintLanguage) -> Bool {
        return getLanguageCapability(for: printerId, language: language) != nil
    }
    
    func getSupportedLanguages(for printerId: String) -> [PrintLanguage] {
        guard let capabilities = printerLanguageCapabilities[printerId] else { return [] }
        return capabilities.compactMap { $0.value ? $0.key : nil }
    }
    
    func getUnsupportedLanguages(for printerId: String) -> [PrintLanguage] {
        guard let capabilities = printerLanguageCapabilities[printerId] else { return [] }
        return capabilities.compactMap { !$0.value ? $0.key : nil }
    }
    
    func getUntestedLanguages(for printerId: String) -> [PrintLanguage] {
        guard let capabilities = printerLanguageCapabilities[printerId] else { 
            return PrintLanguage.allCases 
        }
        return PrintLanguage.allCases.filter { capabilities[$0] == nil }
    }
    
    // MARK: - Template Theme Management
    private func loadTemplateThemes() {
        if let receiptThemeString = userDefaults.string(forKey: receiptThemeKey),
           let receiptTheme = TemplateTheme(rawValue: receiptThemeString) {
            selectedReceiptTheme = receiptTheme
        }
        
        if let kitchenThemeString = userDefaults.string(forKey: kitchenThemeKey),
           let kitchenTheme = TemplateTheme(rawValue: kitchenThemeString) {
            selectedKitchenTheme = kitchenTheme
        }
    }
    
    private func saveTemplateThemes() {
        userDefaults.set(selectedReceiptTheme.rawValue, forKey: receiptThemeKey)
        userDefaults.set(selectedKitchenTheme.rawValue, forKey: kitchenThemeKey)
    }
    
    func setReceiptTheme(_ theme: TemplateTheme) {
        selectedReceiptTheme = theme
        saveTemplateThemes()
    }
    
    func setKitchenTheme(_ theme: TemplateTheme) {
        selectedKitchenTheme = theme
        saveTemplateThemes()
    }
    
    func getTemplateTheme(for type: TemplateType) -> TemplateTheme {
        switch type {
        case .receipt:
            return selectedReceiptTheme
        case .kitchen:
            return selectedKitchenTheme
        }
    }
    
    // MARK: - Validation
    func validatePrinterConfig(_ printer: ConfiguredPrinter) -> [String] {
        var errors: [String] = []
        
        if printer.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append("Printer name is required")
        }
        
        if !isValidIPAddress(printer.ipAddress) {
            errors.append("Invalid IP address format")
        }
        
        if printer.port < 1 || printer.port > 65535 {
            errors.append("Port must be between 1 and 65535")
        }
        
        if printer.connectionTimeout < 1 || printer.connectionTimeout > 30 {
            errors.append("Connection timeout must be between 1 and 30 seconds")
        }
        
        if printer.maxRetries < 1 || printer.maxRetries > 10 {
            errors.append("Max retries must be between 1 and 10")
        }
        
        return errors
    }
    
    private func isValidIPAddress(_ ip: String) -> Bool {
        let ipRegex = "^(?:[0-9]{1,3}\\.){3}[0-9]{1,3}$"
        let predicate = NSPredicate(format: "SELF MATCHES %@", ipRegex)
        return predicate.evaluate(with: ip)
    }

    private func resolvedRestaurantName(from restaurant: Restaurant) -> String {
        let candidateNames = [
            restaurant.name?.trimmingCharacters(in: .whitespacesAndNewlines),
            restaurant.branchCode?.trimmingCharacters(in: .whitespacesAndNewlines),
            restaurant.subdomain.trimmingCharacters(in: .whitespacesAndNewlines)
        ]

        return candidateNames.compactMap { value in
            guard let value, !value.isEmpty else { return nil }
            return value
        }.first ?? ""
    }

    private func shouldReplaceRestaurantName(_ value: String) -> Bool {
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return normalized.isEmpty ||
            normalized == Defaults.restaurantName ||
            normalized == Defaults.restaurantAddress ||
            normalized == Defaults.restaurantPhone ||
            normalized == Defaults.restaurantWebsite
    }

    private func shouldReplaceFooterMessage(_ value: String) -> Bool {
        let normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return normalized.isEmpty || normalized == Defaults.footerMessage
    }

    private func syncRestaurantSettingsFromReceiptHeader() {
        restaurantSettings.name = receiptHeader.restaurantName
        restaurantSettings.address = receiptHeader.address
        restaurantSettings.phone = receiptHeader.phone
        restaurantSettings.website = receiptHeader.website
        saveRestaurantSettings()
    }
}

// MARK: - Models
struct ConfiguredPrinter: Identifiable, Codable, Equatable {
    let id: String
    var name: String
    var ipAddress: String
    var port: Int
    var connectionTimeout: TimeInterval
    var maxRetries: Int
    var printerType: ConfiguredPrinterType
    var isDefault: Bool
    var notes: String?
    
    init(
        id: String = UUID().uuidString,
        name: String,
        ipAddress: String,
        port: Int = 9100,
        connectionTimeout: TimeInterval = 5.0,
        maxRetries: Int = 3,
        printerType: ConfiguredPrinterType = .receipt,
        isDefault: Bool = false,
        notes: String? = nil
    ) {
        self.id = id
        self.name = name
        self.ipAddress = ipAddress
        self.port = port
        self.connectionTimeout = connectionTimeout
        self.maxRetries = maxRetries
        self.printerType = printerType
        self.isDefault = isDefault
        self.notes = notes
    }
}

enum ConfiguredPrinterType: String, Codable, CaseIterable {
    case receipt = "receipt"
    case kitchen = "kitchen"
    case label = "label"
    
    var displayName: String {
        switch self {
        case .receipt: return "printer_type_receipt_display_name".localized
        case .kitchen: return "printer_type_kitchen_display_name".localized
        case .label: return "printer_type_label_display_name".localized
        }
    }
    
    var icon: String {
        switch self {
        case .receipt: return "doc.text"
        case .kitchen: return "list.clipboard"
        case .label: return "tag"
        }
    }
}

struct RestaurantSettings: Codable {
    var name: String
    var address: String
    var phone: String
    var website: String
    var dateTimeFormat: String
    var wifiSsid: String?
    var wifiPassword: String?

    init(
        name: String = "",
        address: String = "",
        phone: String = "",
        website: String = "",
        dateTimeFormat: String = "yyyy-MM-dd HH:mm:ss",
        wifiSsid: String? = nil,
        wifiPassword: String? = nil
    ) {
        self.name = name
        self.address = address
        self.phone = phone
        self.website = website
        self.dateTimeFormat = dateTimeFormat
        self.wifiSsid = wifiSsid
        self.wifiPassword = wifiPassword
    }
}

enum PrinterMode: String, Codable, CaseIterable {
    case single = "single"
    case dual = "dual"
    
    var displayName: String {
        switch self {
        case .single: return "printer_mode_single_display_name".localized
        case .dual: return "printer_mode_dual_display_name".localized
        }
    }
    
    var description: String {
        switch self {
        case .single: return "printer_mode_single_description".localized
        case .dual: return "printer_mode_dual_description".localized
        }
    }
    
    var icon: String {
        switch self {
        case .single: return "printer"
        case .dual: return "printer.dotmatrix"
        }
    }
}

// MARK: - Print Language Support
enum PrintLanguage: String, Codable, CaseIterable {
    case english = "en"
    case japanese = "ja"
    case vietnamese = "vi"
    
    var displayName: String {
        switch self {
        case .english: return "print_language_english".localized
        case .japanese: return "print_language_japanese".localized
        case .vietnamese: return "print_language_vietnamese".localized
        }
    }
    
    var nativeName: String {
        switch self {
        case .english: return "English"
        case .japanese: return "日本語"
        case .vietnamese: return "Tiếng Việt"
        }
    }
    
    var flagEmoji: String {
        switch self {
        case .english: return "🇺🇸"
        case .japanese: return "🇯🇵"
        case .vietnamese: return "🇻🇳"
        }
    }
    
    var isPrinterSupported: Bool {
        // For simplicity, we'll assume only English is fully supported by all printers
        // Vietnamese and Japanese may have encoding issues on some receipt printers
        switch self {
        case .english: return true
        case .japanese: return false // May have encoding issues
        case .vietnamese: return false // May have encoding issues
        }
    }
}

// MARK: - Receipt Customization Settings
struct ReceiptHeaderSettings: Codable {
    var restaurantName: String
    var address: String
    var phone: String
    var taxCode: String
    var website: String
    var footerMessage: String
    var promotionalText: String
    var showTaxCode: Bool
    var showWebsite: Bool
    var showPromotionalText: Bool
    
    init(
        restaurantName: String = "",
        address: String = "",
        phone: String = "",
        taxCode: String = "",
        website: String = "",
        footerMessage: String = "Thank you for your visit!",
        promotionalText: String = "",
        showTaxCode: Bool = false,
        showWebsite: Bool = true,
        showPromotionalText: Bool = false
    ) {
        self.restaurantName = restaurantName
        self.address = address
        self.phone = phone
        self.taxCode = taxCode
        self.website = website
        self.footerMessage = footerMessage
        self.promotionalText = promotionalText
        self.showTaxCode = showTaxCode
        self.showWebsite = showWebsite
        self.showPromotionalText = showPromotionalText
    }
}

// MARK: - Printer Mode Management Extension
extension PrinterSettingsManager {
    
    func setPrinterMode(_ mode: PrinterMode) {
        printerMode = mode
        savePrinterMode()
        
        // If switching to single mode, clear dual printer assignments but keep them in the list
        if mode == .single {
            // Don't remove the printers, just clear the assignments
            // Users can still use them but they won't be automatically assigned to kitchen/checkout
        }
    }
    
    func canEnableDualMode() -> Bool {
        // Need at least 2 configured printers to enable dual mode
        return configuredPrinters.count >= 2
    }
    
    func validateDualModeSetup() -> [String] {
        var errors: [String] = []
        
        if printerMode == .dual {
            if kitchenPrinter == nil {
                errors.append("Kitchen printer not assigned")
            }
            if checkoutPrinter == nil {
                errors.append("Checkout printer not assigned")
            }
            if kitchenPrinter?.id == checkoutPrinter?.id {
                errors.append("Kitchen and checkout printers cannot be the same")
            }
        }
        
        return errors
    }
    
    func getRecommendedPrinterAssignments() -> (kitchen: ConfiguredPrinter?, checkout: ConfiguredPrinter?) {
        let kitchenPrinters = configuredPrinters.filter { $0.printerType == .kitchen }
        let receiptPrinters = configuredPrinters.filter { $0.printerType == .receipt }
        
        let recommendedKitchen = kitchenPrinters.first ?? configuredPrinters.first
        let recommendedCheckout = receiptPrinters.first ?? configuredPrinters.last
        
        // Make sure they're different printers if possible
        if recommendedKitchen?.id == recommendedCheckout?.id && configuredPrinters.count > 1 {
            let alternativeCheckout = configuredPrinters.first(where: { $0.id != recommendedKitchen?.id })
            return (recommendedKitchen, alternativeCheckout)
        }
        
        return (recommendedKitchen, recommendedCheckout)
    }
    
    func autoAssignDualPrinters() {
        let recommendations = getRecommendedPrinterAssignments()
        setKitchenPrinter(recommendations.kitchen)
        setCheckoutPrinter(recommendations.checkout)
    }
    
    // MARK: - Printing Logic Based on Mode
    func shouldPrintToKitchen() -> Bool {
        switch printerMode {
        case .single:
            return true // Single printer handles both
        case .dual:
            return hasKitchenPrinter()
        }
    }
    
    func shouldPrintToCheckout() -> Bool {
        switch printerMode {
        case .single:
            return true // Single printer handles both
        case .dual:
            return hasCheckoutPrinter()
        }
    }
    
    func getPrinterConfigForKitchen() -> PrinterConfig.Hardware? {
        switch printerMode {
        case .single:
            return getCurrentPrinterConfig()
        case .dual:
            return getKitchenPrinterConfig()
        }
    }
    
    func getPrinterConfigForCheckout() -> PrinterConfig.Hardware? {
        switch printerMode {
        case .single:
            return getCurrentPrinterConfig()
        case .dual:
            return getCheckoutPrinterConfig()
        }
    }
}

// MARK: - Connection Status Model
enum ConnectionStatus: Codable {
    case unknown
    case connected
    case disconnected
    case error(String)

    var displayName: String {
        switch self {
        case .unknown: return "connection_status_unknown".localized
        case .connected: return "connection_status_connected".localized
        case .disconnected: return "connection_status_disconnected".localized
        case .error: return "connection_status_error".localized
        }
    }

    var color: Color {
        switch self {
        case .unknown: return .appTextSecondary
        case .connected: return .appSuccess
        case .disconnected: return .appWarning
        case .error: return .appError
        }
    }

    var icon: String {
        switch self {
        case .unknown: return "questionmark.circle"
        case .connected: return "checkmark.circle.fill"
        case .disconnected: return "xmark.circle"
        case .error: return "exclamationmark.triangle.fill"
        }
    }
}

// MARK: - Encoding Strategy Helpers (per target)
extension PrinterSettingsManager {
    enum PrintTarget { case receipt, kitchen }
    
    func getSelectedLanguage(for target: PrintTarget) -> PrintLanguage {
        switch target {
        case .receipt: return selectedReceiptLanguage
        case .kitchen: return selectedKitchenLanguage
        }
    }
    
    func getStrategy(for printerId: String? = nil, target: PrintTarget) -> PrinterConfig.EncodingUtils.Strategy {
        // For M2: use a global strategy for now; in M3 this can consult per-printer capability
        return encodingStrategy ?? .legacyEncoding
    }

    // MARK: - Connection Status Management
    func updateConnectionStatus(for printerId: String, status: ConnectionStatus) {
        printerConnectionStatus[printerId] = status
    }

    func getConnectionStatus(for printerId: String) -> ConnectionStatus {
        return printerConnectionStatus[printerId] ?? .unknown
    }

    func clearConnectionStatus(for printerId: String) {
        printerConnectionStatus.removeValue(forKey: printerId)
    }
}

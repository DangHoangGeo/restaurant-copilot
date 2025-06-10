import Foundation

// MARK: - Printer Settings Manager
class PrinterSettingsManager: ObservableObject {
    static let shared = PrinterSettingsManager()
    
    @Published var configuredPrinters: [ConfiguredPrinter] = []
    @Published var activePrinter: ConfiguredPrinter?
    @Published var restaurantSettings: RestaurantSettings
    
    // New: Dual printer support
    @Published var kitchenPrinter: ConfiguredPrinter?
    @Published var checkoutPrinter: ConfiguredPrinter?
    
    // New: Printer mode selection
    @Published var printerMode: PrinterMode = .single
    
    private let userDefaults = UserDefaults.standard
    private let printersKey = "configured_printers"
    private let activePrinterKey = "active_printer_id"
    private let kitchenPrinterKey = "kitchen_printer_id"
    private let checkoutPrinterKey = "checkout_printer_id"
    private let printerModeKey = "printer_mode"
    private let restaurantSettingsKey = "restaurant_settings"
    
    private init() {
        // Initialize with default restaurant settings
        self.restaurantSettings = RestaurantSettings(
            name: "SOder Restaurant",
            address: "123 Restaurant Street, City",
            phone: "+81-xxx-xxx-xxxx",
            website: "soder-restaurant.com",
            dateTimeFormat: "yyyy-MM-dd HH:mm:ss"
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
    
    // MARK: - Persistence
    private func loadSettings() {
        loadConfiguredPrinters()
        loadActivePrinter()
        loadDualPrinters()
        loadPrinterMode()
        loadRestaurantSettings()
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
    
    private func saveSettings() {
        saveConfiguredPrinters()
        saveActivePrinter()
        saveDualPrinters()
        savePrinterMode()
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
    
    init(
        name: String = "",
        address: String = "",
        phone: String = "",
        website: String = "",
        dateTimeFormat: String = "yyyy-MM-dd HH:mm:ss"
    ) {
        self.name = name
        self.address = address
        self.phone = phone
        self.website = website
        self.dateTimeFormat = dateTimeFormat
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
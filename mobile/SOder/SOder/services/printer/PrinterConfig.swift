import Foundation

// MARK: - Printer Configuration
struct PrinterConfig {
    static let shared = PrinterConfig()
    
    // MARK: - Printer Hardware Configuration
    struct Hardware {
        let ipAddress: String
        let port: Int
        let name: String
        let connectionTimeout: TimeInterval
        let maxRetries: Int
    }
    
    // Default printer configuration - should be user configurable
    let defaultPrinter = Hardware(
        ipAddress: "192.168.1.100", // Make this configurable in app settings
        port: 9100,
        name: "Kitchen Printer",
        connectionTimeout: 5.0,
        maxRetries: 3
    )
    
    // MARK: - ESC/POS Printer Commands
    struct Commands {
        // Initialization
        static let initialize: [UInt8] = [0x1B, 0x40] // ESC @ (Reset printer)
        
        // Text Formatting
        static let fontSizeNormal: [UInt8] = [0x1D, 0x21, 0x00] // GS ! n (Normal size)
        static let fontSizeDoubleWidth: [UInt8] = [0x1D, 0x21, 0x10] // GS ! n (Double width)
        static let fontSizeDoubleHeight: [UInt8] = [0x1D, 0x21, 0x01] // GS ! n (Double height)
        static let fontSizeDoubleWidthAndHeight: [UInt8] = [0x1D, 0x21, 0x11] // GS ! n (Double W+H)
        
        static let boldOn: [UInt8] = [0x1B, 0x45, 0x01] // ESC E n (Bold on)
        static let boldOff: [UInt8] = [0x1B, 0x45, 0x00] // ESC E n (Bold off)
        static let underlineOn: [UInt8] = [0x1B, 0x2D, 0x01] // ESC - n (Underline on)
        static let underlineOff: [UInt8] = [0x1B, 0x2D, 0x00] // ESC - n (Underline off)
        static let resetTextStyles: [UInt8] = [0x1B, 0x21, 0x00] // ESC ! n (Reset styles)
        
        // Alignment
        static let alignLeft: [UInt8] = [0x1B, 0x61, 0x00] // ESC a n (Left align)
        static let alignCenter: [UInt8] = [0x1B, 0x61, 0x01] // ESC a n (Center align)
        static let alignRight: [UInt8] = [0x1B, 0x61, 0x02] // ESC a n (Right align)
        
        // Paper Control
        static let lineFeed: [UInt8] = [0x0A] // LF
        static let formFeed: [UInt8] = [0x0C] // FF
        static let cutPaperFull: [UInt8] = [0x1D, 0x56, 0x00] // GS V m (Full cut)
        static let cutPaperPartial: [UInt8] = [0x1D, 0x56, 0x01] // GS V m (Partial cut)
        
        // QR Code Commands
        static func setQRCodeModel(_ model: UInt8 = 0x32) -> [UInt8] {
            [0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, model, 0x00]
        }
        
        static func setQRCodeSize(_ size: UInt8 = 6) -> [UInt8] {
            [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, size]
        }
        
        static func setQRCodeErrorCorrection(_ level: UInt8 = 0x31) -> [UInt8] {
            [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, level]
        }
        
        static func storeQRCodeData(_ data: Data) -> [UInt8] {
            let length = data.count + 3
            let pL = UInt8(length & 0xFF)
            let pH = UInt8((length >> 8) & 0xFF)
            return [0x1D, 0x28, 0x6B, pL, pH, 0x31, 0x50, 0x30] + data
        }
        
        static let printStoredQRCode: [UInt8] = [0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30]
    }
    
    // MARK: - Restaurant Details
    struct RestaurantDetails {
        let name: String
        let address: String
        let phone: String
        let website: String
        let dateTimeFormat: String
    }
    
    let restaurantDetails = RestaurantDetails(
        name: "SOder Restaurant", // Configure these in app settings
        address: "123 Restaurant Street, City",
        phone: "+81-xxx-xxx-xxxx",
        website: "soder-restaurant.com",
        dateTimeFormat: "yyyy-MM-dd HH:mm:ss"
    )
    
    // MARK: - Print Layout Settings
    struct Layout {
        static let receiptWidth = 48 // Characters per line for receipt
        static let itemNameWidth = 20
        static let quantityWidth = 4
        static let priceWidth = 8
        static let totalWidth = 8
        static let separator = String(repeating: "-", count: receiptWidth)
    }
}
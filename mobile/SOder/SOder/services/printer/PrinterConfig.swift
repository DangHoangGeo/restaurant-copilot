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
        ipAddress: "192.168.3.7", // Make this configurable in app settings
        port: 9100,
        name: "Kitchen Printer",
        connectionTimeout: 5.0,
        maxRetries: 3
    )
    
    // MARK: - ESC/POS Printer Commands
    struct Commands {
        // Initialization
        static let initialize: [UInt8] = [0x1B, 0x40] // ESC @ (Reset printer)
        
        // Character Encoding - Enhanced UTF-8 first strategy
        static let setCharsetUTF8: [UInt8] = [0x1B, 0x74, 0xFF] // ESC t 255 (UTF-8 primary)
        static let setCharsetUTF8Alt: [UInt8] = [0x1B, 0x74, 0x03] // ESC t 3 (Alternative UTF-8)
        static let resetCharset: [UInt8] = [0x1B, 0x52, 0x00] // ESC R 0 (Reset to default charset)
        
        // Legacy encodings for fallback
        static let setCharsetCP1252: [UInt8] = [0x1B, 0x74, 0x10] // ESC t 16 (Windows-1252 for basic Latin)
        static let setCharsetCP1258: [UInt8] = [0x1B, 0x74, 0x1B] // ESC t 27 (Windows-1258 for Vietnamese)
        static let setCharsetShiftJIS: [UInt8] = [0x1B, 0x74, 0x04] // ESC t 4 (Shift-JIS for Japanese)
        
        // Japanese Kanji mode (Epson-compatible)
        static let enterKanjiMode: [UInt8] = [0x1C, 0x26] // FS & (Enter Kanji mode)
        static let exitKanjiMode: [UInt8]  = [0x1C, 0x2E] // FS . (Leave Kanji mode)
        
        // Enhanced UTF-8 initialization sequence
        static let initializeUTF8: [UInt8] = initialize + resetCharset + setCharsetUTF8
        
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
        
        // Paper Control - Enhanced for better cutting
        static let lineFeed: [UInt8] = [0x0A] // LF
        static let formFeed: [UInt8] = [0x0C] // FF
        static let paperFeed: [UInt8] = [0x1B, 0x4A, 0x08] // ESC J 8 (Feed 8 lines for cutting)
        static let paperFeedExtra: [UInt8] = [0x1B, 0x4A, 0x0C] // ESC J 12 (Extra feed for better spacing)
        static let cutPaperFull: [UInt8] = [0x1D, 0x56, 0x00] // GS V 0 (Full cut)
        static let cutPaperPartial: [UInt8] = [0x1D, 0x56, 0x01] // GS V 1 (Partial cut)
        static let cutPaperAdvanced: [UInt8] = [0x1D, 0x56, 0x30] // GS V 48 (Full cut with feed)
        
        // Buffer and printer control
        static let clearBuffer: [UInt8] = [0x18] // CAN (Cancel/Clear buffer)
        static let flushBuffer: [UInt8] = [0x0C] // FF (Form feed to flush)
        
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
    
    // MARK: - Character Encoding Utilities
    struct EncodingUtils {
        // UTF-8 test strings for capability detection
        static let testStrings: [String: String] = [
            "english": "Test Receipt 123",
            "japanese": "テストレシート 123",
            "vietnamese": "Biên lai thử nghiệm 123"
        ]
        
        // Character fallback mappings for non-UTF-8 printers
        static let vietnameseFallbacks: [String: String] = [
            "á": "a", "à": "a", "ả": "a", "ã": "a", "ạ": "a",
            "ắ": "a", "ằ": "a", "ẳ": "a", "ẵ": "a", "ặ": "a",
            "â": "a", "ấ": "a", "ầ": "a", "ẩ": "a", "ẫ": "a", "ậ": "a",
            "é": "e", "è": "e", "ẻ": "e", "ẽ": "e", "ẹ": "e",
            "ê": "e", "ế": "e", "ề": "e", "ể": "e", "ễ": "e", "ệ": "e",
            "í": "i", "ì": "i", "ỉ": "i", "ĩ": "i", "ị": "i",
            "ó": "o", "ò": "o", "ỏ": "o", "õ": "o", "ọ": "o",
            "ô": "o", "ố": "o", "ồ": "o", "ổ": "o", "ỗ": "o", "ộ": "o",
            "ơ": "o", "ớ": "o", "ờ": "o", "ở": "o", "ỡ": "o", "ợ": "o",
            "ú": "u", "ù": "u", "ủ": "u", "ũ": "u", "ụ": "u",
            "ư": "u", "ứ": "u", "ừ": "u", "ử": "u", "ữ": "u", "ự": "u",
            "ý": "y", "ỳ": "y", "ỷ": "y", "ỹ": "y", "ỵ": "y",
            "đ": "d"
        ]
        
        // Encoding strategy enumeration
        enum Strategy {
            case utf8Primary      // Try UTF-8 first
            case utf8Fallback     // UTF-8 with character fallback
            case legacyEncoding   // Use legacy encoding per language
        }
        
        // Get encoding based on strategy and language
        static func getEncoding(for language: PrintLanguage, strategy: Strategy = .utf8Primary) -> String.Encoding {
            switch strategy {
            case .utf8Primary, .utf8Fallback:
                return .utf8
            case .legacyEncoding:
                return getLegacyEncoding(for: language)
            }
        }
        
        // Get legacy encoding for specific language
        static func getLegacyEncoding(for language: PrintLanguage) -> String.Encoding {
            switch language {
            case .vietnamese:
                return String.Encoding(rawValue: CFStringConvertEncodingToNSStringEncoding(CFStringEncoding(CFStringEncodings.windowsVietnamese.rawValue)))
            case .japanese:
                return .shiftJIS
            case .english:
                return .windowsCP1252
            }
        }
        
        // Get charset command based on strategy
        static func getCharsetCommand(for language: PrintLanguage, strategy: Strategy = .utf8Primary) -> [UInt8] {
            switch strategy {
            case .utf8Primary, .utf8Fallback:
                return Commands.setCharsetUTF8
            case .legacyEncoding:
                return getLegacyCharsetCommand(for: language)
            }
        }
        
        // Get legacy charset command
        static func getLegacyCharsetCommand(for language: PrintLanguage) -> [UInt8] {
            switch language {
            case .vietnamese:
                return Commands.setCharsetCP1258
            case .japanese:
                return Commands.setCharsetShiftJIS
            case .english:
                return Commands.setCharsetCP1252
            }
        }
        
        // Apply character fallbacks for Vietnamese text
        static func applyVietnameseFallback(_ text: String) -> String {
            var result = text
            for (original, replacement) in vietnameseFallbacks {
                result = result.replacingOccurrences(of: original, with: replacement)
                result = result.replacingOccurrences(of: original.uppercased(), with: replacement.uppercased())
            }
            return result
        }
        
        // Strip all diacritics as last resort
        static func stripDiacritics(_ text: String) -> String {
            return text.folding(options: .diacriticInsensitive, locale: nil)
        }
        
        // Convert text to ASCII-safe characters
        static func toASCIISafe(_ text: String) -> String {
            return text.data(using: .ascii, allowLossyConversion: true)
                      .flatMap { String(data: $0, encoding: .ascii) } ?? text
        }
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
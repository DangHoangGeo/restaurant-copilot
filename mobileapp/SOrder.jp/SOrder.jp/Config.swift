import Foundation

struct Config {
  static let supabaseUrl = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as! String
  static let supabaseAnonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as! String
  static let defaultLocale = "en"
  static let maxRetryAttempts = 3

  // MARK: - Printer Configuration
  struct Printer {
    let ipAddress: String
    let port: Int
    let name: String
  }

  static let kitchenPrinter = Printer(
    ipAddress: "192.168.3.7",
    port: 9100,
    name: "KitchenPrinter001"
  )

  struct PrinterCommands {
    static let initialize: [UInt8] = [0x1B, 0x40]
    static let fontSizeDoubleWidthAndHeight: [UInt8] = [0x1D, 0x21, 0x11]
    static let fontSizeNormal: [UInt8] = [0x1D, 0x21, 0x00]
    static let alignCenter: [UInt8] = [0x1B, 0x61, 0x01]
    static let alignLeft: [UInt8] = [0x1B, 0x61, 0x00]
    static let lineFeed: [UInt8] = [0x0A]
    static let cutPaperPartial: [UInt8] = [0x1D, 0x56, 0x01]
    static let resetTextStyles: [UInt8] = [0x1B, 0x21, 0x00]
  }
}

import Foundation

struct Config {
  static let supabaseUrl = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as! String
  static let supabaseAnonKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as! String
  static let defaultLocale = "ja"
  static let maxRetryAttempts = 3
}

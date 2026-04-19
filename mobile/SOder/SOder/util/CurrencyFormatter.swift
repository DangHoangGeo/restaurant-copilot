import Foundation

enum AppCurrencyFormatter {
    private static let fallbackCurrencyCode = "JPY"
    private static let zeroFractionCurrencies: Set<String> = ["JPY", "VND"]

    static func currentCurrencyCode(from restaurant: Restaurant? = SupabaseManager.shared.currentRestaurant) -> String {
        let normalized = restaurant?.currency?.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard let normalized, !normalized.isEmpty else {
            return fallbackCurrencyCode
        }

        return normalized
    }

    static func format(
        _ amount: Double,
        currencyCode: String? = nil,
        languageCode: String? = nil
    ) -> String {
        let formatter = currencyNumberFormatter(currencyCode: currencyCode, languageCode: languageCode)
        return formatter.string(from: NSNumber(value: amount)) ?? fallbackString(for: amount, currencyCode: currencyCode)
    }

    static func formatAdditional(
        _ amount: Double,
        currencyCode: String? = nil,
        languageCode: String? = nil
    ) -> String {
        let formattedAmount = format(abs(amount), currencyCode: currencyCode, languageCode: languageCode)
        return amount < 0 ? "-\(formattedAmount)" : "+\(formattedAmount)"
    }

    static func formatPerItem(
        _ amount: Double,
        currencyCode: String? = nil,
        languageCode: String? = nil
    ) -> String {
        let formattedAmount = format(amount, currencyCode: currencyCode, languageCode: languageCode)
        return String(format: "price_each_value_format".localized, formattedAmount)
    }

    static func inputFormatter(
        currencyCode: String? = nil,
        languageCode: String? = nil
    ) -> NumberFormatter {
        currencyNumberFormatter(currencyCode: currencyCode, languageCode: languageCode)
    }

    static func printerNumberFormatter(
        currencyCode: String? = nil,
        languageCode: String? = nil
    ) -> NumberFormatter {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.locale = Locale(identifier: localeIdentifier(for: languageCode))
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = fractionDigits(for: resolvedCurrencyCode(currencyCode))
        formatter.groupingSize = 3
        formatter.usesGroupingSeparator = true
        return formatter
    }

    private static func currencyNumberFormatter(
        currencyCode: String? = nil,
        languageCode: String? = nil
    ) -> NumberFormatter {
        let formatter = NumberFormatter()
        let resolvedCurrencyCode = resolvedCurrencyCode(currencyCode)

        formatter.numberStyle = .currency
        formatter.locale = Locale(identifier: localeIdentifier(for: languageCode))
        formatter.currencyCode = resolvedCurrencyCode
        formatter.minimumFractionDigits = 0
        formatter.maximumFractionDigits = fractionDigits(for: resolvedCurrencyCode)
        formatter.generatesDecimalNumbers = true

        return formatter
    }

    private static func resolvedCurrencyCode(_ currencyCode: String?) -> String {
        let normalized = currencyCode?.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard let normalized, !normalized.isEmpty else {
            return currentCurrencyCode(from: SupabaseManager.shared.currentRestaurant)
        }

        return normalized
    }

    private static func localeIdentifier(for languageCode: String?) -> String {
        switch languageCode ?? LocalizationManager.shared.currentLanguage {
        case "ja":
            return "ja_JP"
        case "vi":
            return "vi_VN"
        default:
            return "en_US"
        }
    }

    private static func fractionDigits(for currencyCode: String) -> Int {
        zeroFractionCurrencies.contains(currencyCode) ? 0 : 2
    }

    private static func fallbackString(for amount: Double, currencyCode: String?) -> String {
        let resolvedCurrencyCode = resolvedCurrencyCode(currencyCode)
        let precision = fractionDigits(for: resolvedCurrencyCode) == 0 ? "%.0f" : "%.2f"
        return "\(resolvedCurrencyCode) " + String(format: precision, amount)
    }
}

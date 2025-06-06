import Foundation

enum OrderStatus: String, CaseIterable, Codable, Identifiable {
    case new, preparing, ready, completed

    var id: String {
        self.rawValue
    }

    func localizedString() -> String {
        NSLocalizedString(self.rawValue, comment: "Order status")
    }
}

import Foundation

enum UserRole: String, CaseIterable, Identifiable {
    case ownerAdmin = "Owner/Admin" // Keep current rawValue for internal logic if needed
    case customer = "Customer"     // Or change to "role_owner_admin_key" if rawValue is not for display

    var id: String { self.rawValue }

    // Add a computed property for the localization key
    var localizationKey: String {
        switch self {
        case .ownerAdmin:
            return "role_owner_admin"
        case .customer:
            return "role_customer"
        }
    }
}

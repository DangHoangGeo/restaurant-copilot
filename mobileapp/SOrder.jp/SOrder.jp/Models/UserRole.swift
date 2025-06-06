import Foundation

enum UserRole: String, CaseIterable, Identifiable {
    case ownerAdmin = "Owner/Admin"
    case customer = "Customer"

    var id: String { self.rawValue }

    var localizationKey: String {
        switch self {
        case .ownerAdmin:
            return "role_owner_admin"
        case .customer:
            return "role_customer"
        }
    }
}

import Foundation

struct Tenant: Identifiable, Equatable {
    let id: UUID
    let name: String
    let subdomain: String
    let logoUrl: String?
    let primaryColorHex: String?
    let coverImageUrl: String?
}

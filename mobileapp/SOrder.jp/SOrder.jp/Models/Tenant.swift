import Foundation

/// Represents a tenant (e.g., a restaurant or shop) within the SOder system.
///
/// This struct holds all relevant information about a tenant, including branding details.
struct Tenant: Identifiable {
    /// A unique identifier for the tenant.
    let id: UUID

    /// The display name of the tenant (e.g., "Restaurant ABC").
    let name: String

    /// The unique subdomain associated with the tenant (e.g., "restaurantabc").
    /// This can be used for routing or identifying the tenant in a multi-tenant architecture.
    let subdomain: String

    /// An optional URL string pointing to the tenant's logo image.
    let logoUrl: String?

    /// An optional hexadecimal string representing the tenant's primary branding color (e.g., "#FF5733").
    let primaryColorHex: String?

    /// An optional URL string pointing to a cover image for the tenant (e.g., for a profile page or banner).
    let coverImageUrl: String?

    // TODO: Consider adding Codable conformance if this model needs to be serialized/deserialized from/to JSON.
    // Example: struct Tenant: Identifiable, Codable { ... }
}

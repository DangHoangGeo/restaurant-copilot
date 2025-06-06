import Foundation

/// Errors that can occur when fetching tenant information.
enum TenantServiceError: Error, LocalizedError {
    /// Indicates that no tenant was found for the given identifier (e.g., subdomain).
    case notFound
    /// Wraps an underlying error that occurred during the fetching process.
    case underlying(Error)

    /// Provides a localized description for each error case.
    var errorDescription: String? {
        switch self {
        case .notFound:
            // Uses the key "tenant_not_found" from Localizable.strings
            return NSLocalizedString("tenant_not_found", comment: "Error message when a tenant is not found.")
        case .underlying(let error):
            return error.localizedDescription
        }
    }
}

/// A service responsible for fetching tenant data.
///
/// In a real application, this service would interact with a backend API
/// to retrieve tenant details. This implementation provides mock data for demonstration.
class TenantService {

    /// Fetches tenant details for a given subdomain.
    ///
    /// This mock implementation returns hardcoded `Tenant` objects for specific subdomains
    /// ("resto1", "resto2") and a `TenantServiceError.notFound` for others.
    /// It simulates a network delay before providing the result.
    ///
    /// - Parameters:
    ///   - subdomain: The subdomain identifying the tenant to fetch.
    ///   - completion: A closure to be called with the result of the fetch operation.
    ///                 Returns `Result<Tenant, Error>`, where success contains a `Tenant` object
    ///                 and failure contains an error (typically `TenantServiceError`).
    func fetchTenant(subdomain: String, completion: @escaping (Result<Tenant, Error>) -> Void) {
        // Simulate network delay to mimic real API call
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            switch subdomain.lowercased() { // Case-insensitive comparison for subdomain
            case "resto1":
                let tenantA = Tenant(
                    // Details for Tenant A
                    id: UUID(), // Unique identifier for the tenant
                    name: "The Gourmet Place", // Display name of the tenant
                    subdomain: "resto1", // The subdomain used to access this tenant
                    logoUrl: "https://example.com/logos/resto1_logo.png", // Optional URL for the tenant's logo
                    primaryColorHex: "#A0522D", // Optional primary branding color (Sienna)
                    coverImageUrl: "https://example.com/covers/resto1_cover.jpg" // Optional URL for a cover image
                )
                completion(.success(tenantA))
            case "resto2":
                let tenantB = Tenant(
                    // Details for Tenant B
                    id: UUID(),
                    name: "Ocean Breeze Cafe",
                    subdomain: "resto2",
                    logoUrl: "https://example.com/logos/resto2_logo.png",
                    primaryColorHex: "#1E90FF", // Optional primary branding color (DodgerBlue)
                    coverImageUrl: "https://example.com/covers/resto2_cover.jpg"
                )
                completion(.success(tenantB))
            default:
                // For any other subdomain, return a 'notFound' error.
                completion(.failure(TenantServiceError.notFound))
            }
        }
    }
}

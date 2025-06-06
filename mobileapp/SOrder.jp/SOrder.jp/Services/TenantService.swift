import Foundation

/// Errors that can occur when fetching tenant information.
enum TenantServiceError: Error, LocalizedError {
    case notFound
    case underlying(Error)

    var errorDescription: String? {
        switch self {
        case .notFound:
            return NSLocalizedString("tenant_not_found", comment: "Error message when a tenant is not found.")
        case .underlying(let error):
            return error.localizedDescription
        }
    }
}

/// A service responsible for fetching tenant data.
/// In a real application, this would call your backend API.
/// Here, it returns mock `Tenant` objects after a short delay.
class TenantService {

    /// Fetches tenant details for a given subdomain.
    func fetchTenant(subdomain: String, completion: @escaping (Result<Tenant, Error>) -> Void) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            switch subdomain.lowercased() {
            case "thuanviet":
                let tenantA = Tenant(
                    id: UUID(),
                    name: "The Gourmet Place",
                    subdomain: "thuanviet",
                    logoUrl: "https://example.com/logos/resto1_logo.png",
                    primaryColorHex: "#A0522D",
                    coverImageUrl: "https://example.com/covers/resto1_cover.jpg"
                )
                completion(.success(tenantA))
            case "coviet":
                let tenantB = Tenant(
                    id: UUID(),
                    name: "Ocean Breeze Cafe",
                    subdomain: "coviet",
                    logoUrl: "https://example.com/logos/resto2_logo.png",
                    primaryColorHex: "#1E90FF",
                    coverImageUrl: "https://example.com/covers/resto2_cover.jpg"
                )
                completion(.success(tenantB))
            default:
                completion(.failure(TenantServiceError.notFound))
            }
        }
    }
}

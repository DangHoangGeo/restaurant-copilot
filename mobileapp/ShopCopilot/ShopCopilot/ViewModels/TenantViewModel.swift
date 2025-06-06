import Foundation
import Combine

/// View model responsible for managing the current tenant's data and related state.
///
/// This class fetches tenant information using `TenantService` and publishes
/// the current tenant and any error messages for observation by SwiftUI views.
class TenantViewModel: ObservableObject {
    // MARK: - Published Properties

    /// The currently selected and loaded tenant.
    /// Views can subscribe to this property to update when the tenant changes.
    @Published var currentTenant: Tenant?

    /// An optional string containing an error message if tenant fetching fails
    /// or if input validation fails.
    @Published var errorMessage: String?

    // MARK: - Properties

    /// The service responsible for fetching tenant data.
    private let tenantService: TenantService

    // MARK: - Initializer

    /// Initializes a new `TenantViewModel`.
    /// - Parameter tenantService: An instance of `TenantService` to be used for fetching tenant data.
    ///   Defaults to a new `TenantService()` instance.
    init(tenantService: TenantService = TenantService()) {
        self.tenantService = tenantService
    }

    // MARK: - Public Methods

    /// Attempts to select and load a tenant based on the provided subdomain.
    ///
    /// It clears any previous tenant and error messages before attempting to fetch.
    /// If the subdomain is empty, it sets an error message directly. Otherwise, it uses
    /// `TenantService` to fetch the tenant. Results are published to `currentTenant`
    /// or `errorMessage` on the main thread.
    ///
    /// - Parameter subdomain: The subdomain string to identify the tenant.
    func selectTenant(subdomain: String) {
        // Reset state before attempting to load a new tenant
        self.currentTenant = nil
        self.errorMessage = nil

        // Validate subdomain input
        guard !subdomain.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            self.errorMessage = NSLocalizedString("error_subdomain_empty", comment: "Error when subdomain input is empty.")
            return
        }

        // Asynchronously fetch tenant data
        tenantService.fetchTenant(subdomain: subdomain) { [weak self] result in
            // Ensure UI updates are performed on the main thread
            DispatchQueue.main.async {
                guard let self = self else { return }

                switch result {
                case .success(let tenant):
                    // Successfully fetched tenant
                    self.currentTenant = tenant
                    // Clear any previous error message upon success
                    self.errorMessage = nil
                case .failure(let error):
                    // Failed to fetch tenant
                    // Ensure currentTenant is nil if fetching fails
                    self.currentTenant = nil
                    if let localizedError = error as? LocalizedError {
                        self.errorMessage = localizedError.errorDescription
                    } else {
                        self.errorMessage = NSLocalizedString("error_unknown_fetching_tenant", comment: "Generic error during tenant fetch.")
                    }
                }
            }
        }
    }
}

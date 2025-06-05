import Foundation
import Combine

/// View model responsible for managing user authentication state and related logic.
///
/// This class interacts with `AuthService` to perform login operations and
/// publishes authentication status, current user information, and error messages
/// for observation by SwiftUI views.
class AuthenticationViewModel: ObservableObject {
    // MARK: - Published Properties

    /// Indicates whether the user is currently authenticated.
    @Published var isAuthenticated: Bool = false

    /// The user role selected during the login process. Defaults to `.customer`.
    /// This is bound to the role picker in `LoginView`.
    @Published var selectedRole: UserRole = .customer

    /// The username of the currently authenticated user.
    @Published var currentUsername: String = ""

    /// An optional string containing an error message if authentication fails.
    @Published var authError: String?

    // MARK: - Properties

    /// The service responsible for performing authentication operations.
    private let authService: AuthService

    // MARK: - Initializer

    /// Initializes a new `AuthenticationViewModel`.
    /// - Parameter authService: An instance of `AuthService` to be used for authentication.
    ///   Defaults to a new `AuthService()` instance.
    init(authService: AuthService = AuthService()) {
        self.authService = authService
    }

    // MARK: - Public Methods

    /// Attempts to log in the user with the provided credentials and the currently `selectedRole`.
    ///
    /// Clears any previous authentication errors before initiating the login attempt.
    /// On successful login, it updates `isAuthenticated` and `currentUsername`.
    /// On failure, it sets `authError` and ensures `isAuthenticated` is false.
    /// All UI updates are dispatched to the main thread.
    ///
    /// - Parameters:
    ///   - username: The username entered by the user.
    ///   - password: The password entered by the user.
    func login(username: String, password: String) {
        self.authError = nil // Clear previous errors

        authService.login(username: username, password: password, role: self.selectedRole) { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }
                switch result {
                case .success(let success):
                    if success {
                        self.isAuthenticated = true
                        self.currentUsername = username
                        self.authError = nil // Clear error on success
                    } else {
                        // This case should ideally not be reached if the AuthService.login
                        // correctly returns .failure for unsuccessful login attempts.
                        // However, as a safeguard:
                        self.isAuthenticated = false
                        self.currentUsername = ""
                        self.authError = AuthError.unknown.errorDescription // Use localized unknown error
                    }
                case .failure(let error):
                    self.isAuthenticated = false
                    self.currentUsername = ""
                    if let localizedError = error as? LocalizedError {
                        self.authError = localizedError.errorDescription
                    } else {
                        // TODO: Localize this generic error message
                        self.authError = "An unexpected error occurred during login."
                    }
                }
            }
        }
    }

    /// Logs out the current user.
    ///
    /// Resets authentication state, including `isAuthenticated`, `currentUsername`, and `authError`.
    /// In a real application, this method would also handle clearing any stored tokens or session data.
    func logout() {
        self.isAuthenticated = false
        self.currentUsername = ""
        self.authError = nil
        // Future: Invalidate session tokens, clear sensitive data from memory/storage.
    }
}

import Foundation
import Combine
import SwiftUI // Required for @AppStorage

/// View model responsible for managing user authentication state and related logic.
///
/// This class interacts with `AuthService` to perform login operations and
/// publishes authentication status, current user information, and error messages
/// for observation by SwiftUI views.
class AuthenticationViewModel: ObservableObject {
    // MARK: - Published Properties

    /// Indicates whether the user is currently authenticated.
    @Published var isAuthenticated: Bool = false

    /// The username of the currently authenticated user (e.g., email).
    @Published var currentUsername: String = ""

    /// An optional string containing an error message if authentication fails.
    @Published var authError: String?

    // MARK: - AppStorage Properties for JWT and Claims
    @AppStorage("jwtToken") private var jwtToken: String = ""
    @AppStorage("restaurantId") private var restaurantId: String = ""
    @AppStorage("userRole") var userRole: String = "" // Stores the role derived from JWT

    // MARK: - Properties

    /// The service responsible for performing authentication operations.
    private let authService: AuthService
    /// The service responsible for managing order subscriptions and data.
    private let orderService: OrderService

    // MARK: - Initializer

    /// Initializes a new `AuthenticationViewModel`.
    /// - Parameter authService: An instance of `AuthService` to be used for authentication.
    /// - Parameter orderService: An instance of `OrderService` for managing order data.
    init(authService: AuthService = AuthService(), orderService: OrderService) {
        self.authService = authService
        self.orderService = orderService
        // Check if a token exists on init, potentially validate it and set isAuthenticated
        if !jwtToken.isEmpty {
            // Basic check, ideally validate token expiry etc.
            // This will also call initializeSubscription if successful
            Task { @MainActor in
                parseJWTAndStoreClaims(token: jwtToken, isInitialLaunch: true)
            }
        }
    }

    // MARK: - Public Methods

    /// Attempts to log in the user with the provided email and password.
    ///
    /// Clears any previous authentication errors. On successful login, it stores the JWT,
    /// parses claims, updates `isAuthenticated`, and `currentUsername`.
    /// On failure, it sets `authError`.
    ///
    /// - Parameters:
    ///   - email: The email entered by the user.
    ///   - password: The password entered by the user.
    func login(email: String, password: String) {
        self.authError = nil // Clear previous errors

        authService.login(email: email, password: password) { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }
                switch result {
                case .success(let session):
                    self.jwtToken = session.accessToken
                    // currentUsername will be set by parseJWTAndStoreClaims from token or use email as fallback
                    self.parseJWTAndStoreClaims(token: session.accessToken, currentLoginEmail: email)
                    // isAuthenticated is set within parseJWTAndStoreClaims on success
                    // OrderService subscription is also handled within parseJWTAndStoreClaims
                case .failure(let error):
                    self.isAuthenticated = false
                    self.currentUsername = ""
                    self.jwtToken = "" // Clear any potentially stale token
                    self.restaurantId = ""
                    self.userRole = ""
                    if let authError = error as? AuthError {
                        self.authError = authError.errorDescription
                    } else {
                        self.authError = error.localizedDescription
                    }
                }
            }
        }
    }

    /// Logs out the current user.
    ///
    /// Clears authentication state, stored JWT and claims, calls Supabase sign out, and unsubscribes from orders.
    @MainActor func logout() {
        // 1. Unsubscribe from order updates
        orderService.unsubscribe()

        // 2. Sign out from Supabase auth
        authService.logout { [weak self] result in
            DispatchQueue.main.async {
                guard let self = self else { return }
                switch result {
                case .success:
                    print("AuthenticationViewModel: Successfully logged out from Supabase.")
                case .failure(let error):
                    print("AuthenticationViewModel: Error logging out from Supabase: \(error.localizedDescription)")
                    // Potentially set an error message for the user if logout failure is critical
                    // self.authError = "Could not fully logout from server. Local data cleared."
                }

                // 3. Clear all local authentication and user data
                self.handleLogoutDueToTokenError() // Re-use this to clear all stored props
                self.authError = nil // Clear any login/token errors
            }
        }
    }

    // MARK: - Private Helper Methods

    /// Parses the JWT, extracts claims (`restaurant_id`, `role`), stores them, and initializes order subscription.
    /// Sets `isAuthenticated` to true upon successful parsing and claim validation.
    /// - Parameter token: The JWT string.
    /// - Parameter isInitialLaunch: If true, this is part of app startup, don't reset authError.
    /// - Parameter currentLoginEmail: The email used for login, as a fallback for username.
    @MainActor private func parseJWTAndStoreClaims(token: String, isInitialLaunch: Bool = false, currentLoginEmail: String? = nil) {
        let segments = token.components(separatedBy: ".")
        guard segments.count == 3 else {
            print("AuthenticationViewModel: Invalid JWT format")
            if !isInitialLaunch { self.authError = "AuthenticationViewModel: Invalid token format." }
            handleLogoutDueToTokenError()
            return
        }

        var base64Payload = segments[1]
        let remainder = base64Payload.count % 4
        if remainder > 0 {
            base64Payload = base64Payload.padding(toLength: base64Payload.count + (4 - remainder), withPad: "=", startingAt: 0)
        }

        guard let payloadData = Data(base64Encoded: base64Payload),
              let json = try? JSONSerialization.jsonObject(with: payloadData, options: []) as? [String: Any] else {
            print("AuthenticationViewModel: Failed to decode or parse JWT payload")
            if !isInitialLaunch { self.authError = "AuthenticationViewModel: Failed to parse token." }
            handleLogoutDueToTokenError()
            return
        }

        guard let appMetadata = json["app_metadata"] as? [String: Any],
              let restaurantIdClaim = appMetadata["restaurant_id"] as? String,
              let roleClaim = appMetadata["role"] as? String,
              !restaurantIdClaim.isEmpty, !roleClaim.isEmpty else {
            print("AuthenticationViewModel: Essential claims (restaurant_id, role) missing or invalid in JWT.")
            if !isInitialLaunch { self.authError = "AuthenticationViewModel: Token is missing required information." }
            handleLogoutDueToTokenError()
            return
        }

        self.restaurantId = restaurantIdClaim
        self.userRole = roleClaim

        if let emailFromToken = json["email"] as? String {
            self.currentUsername = emailFromToken
        } else if let loginEmail = currentLoginEmail, !loginEmail.isEmpty {
            self.currentUsername = loginEmail // Fallback to email used for login
        } else {
             print("AuthenticationViewModel: Username could not be set from token or login email.")
             // Potentially set a default or handle as an error if username is critical for UI
        }

        self.isAuthenticated = true
        if !isInitialLaunch { self.authError = nil }

        // Initialize order subscription after successfully parsing claims
        // Ensure jwtToken is also set if this is called during init
        if self.jwtToken.isEmpty { self.jwtToken = token }

        orderService.initializeSubscription(jwt: self.jwtToken, restaurantId: self.restaurantId)
    }

    private func handleLogoutDueToTokenError() {
        // This function centralizes the cleanup if token parsing/validation fails OR during active logout
        // It should NOT call orderService.unsubscribe() as that's handled by the main logout() method
        // to avoid potential recursive calls or issues if called from elsewhere.
        DispatchQueue.main.async { // Ensure UI updates happen on main thread
            self.isAuthenticated = false
            self.currentUsername = ""
            self.jwtToken = ""
            self.restaurantId = ""
            self.userRole = ""
            // Don't clear self.authError here if called from parsing, as it's set by the caller.
            // If called from logout(), authError is cleared explicitly after this.
        }
    }
}

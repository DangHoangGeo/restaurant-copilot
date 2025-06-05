import Foundation

/// Errors that can occur during the authentication process.
enum AuthError: Error, LocalizedError {
    /// Indicates that the provided credentials (username, password, or role) are invalid or do not match.
    case invalidCredentials
    /// Represents an unknown or unexpected error during authentication.
    case unknown

    /// Provides a localized description for each authentication error.
    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            // Uses "error_invalid_credentials" from Localizable.strings
            return NSLocalizedString("error_invalid_credentials", comment: "Invalid credentials error message")
        case .unknown:
            // Uses "error_unknown" from Localizable.strings
            return NSLocalizedString("error_unknown", comment: "Unknown error message during authentication")
        }
    }
}

/// A service responsible for handling user authentication.
///
/// This class simulates authentication logic. In a real application, it would
/// interact with a backend authentication system, possibly involving secure token handling.
class AuthService {

    /// Attempts to log in a user with the given credentials and role.
    ///
    /// This mock implementation checks against hardcoded usernames ("admin", "customer")
    /// and passwords ("password") for specific roles. It simulates a network delay.
    ///
    /// - Parameters:
    ///   - username: The user's username.
    ///   - password: The user's password.
    ///   - role: The `UserRole` the user is attempting to log in as.
    ///   - completion: A closure to be called with the result of the login attempt.
    ///                 Returns `Result<Bool, Error>`, where success (`true`) indicates successful
    ///                 authentication, and failure contains an `AuthError`.
    func login(username: String, password: String, role: UserRole, completion: @escaping (Result<Bool, Error>) -> Void) {
        // Simulate network delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            // Basic validation: username and password should not be empty.
            guard !username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  !password.isEmpty else {
                completion(.failure(AuthError.invalidCredentials))
                return
            }

            // Mock authentication logic based on role
            switch role {
            case .ownerAdmin:
                if username.lowercased() == "admin" && password == "password" {
                    completion(.success(true))
                } else {
                    completion(.failure(AuthError.invalidCredentials))
                }
            case .customer:
                if username.lowercased() == "customer" && password == "password" {
                    completion(.success(true))
                } else {
                    completion(.failure(AuthError.invalidCredentials))
                }
            // No default case needed as UserRole is exhaustive.
            }
        }
    }
}

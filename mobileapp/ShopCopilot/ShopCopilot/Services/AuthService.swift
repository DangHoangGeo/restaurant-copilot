import Foundation
import Supabase

/// Errors that can occur during the authentication process.
enum AuthError: Error, LocalizedError {
    /// Indicates that the provided credentials (username, password, or role) are invalid or do not match.
    case invalidCredentials
    /// Represents an unknown or unexpected error during authentication.
    case unknown
    /// Represents an error from the Supabase service.
    case supabaseError(Error)

    /// Provides a localized description for each authentication error.
    var errorDescription: String? {
        switch self {
        case .invalidCredentials:
            // Uses "error_invalid_credentials" from Localizable.strings
            return NSLocalizedString("error_invalid_credentials", comment: "Invalid credentials error message")
        case .unknown:
            // Uses "error_unknown" from Localizable.strings
            return NSLocalizedString("error_unknown", comment: "Unknown error message during authentication")
        case .supabaseError(let error):
            return error.localizedDescription
        }
    }
}

/// A service responsible for handling user authentication using Supabase.
class AuthService {
    private let supabaseClient: SupabaseClient

    init() {
        self.supabaseClient = SupabaseClient(
            supabaseURL: URL(string: Config.supabaseUrl)!,
            supabaseKey: Config.supabaseAnonKey
        )
    }

    /// Attempts to log in a user with the given email and password using Supabase.
    ///
    /// - Parameters:
    ///   - email: The user's email.
    ///   - password: The user's password.
    ///   - completion: A closure to be called with the result of the login attempt.
    ///                 Returns `Result<Session, AuthError>`, where success contains the Supabase `Session` object.
    func login(email: String, password: String, completion: @escaping (Result<Session, AuthError>) -> Void) {
        Task {
            do {
                // Basic validation: email and password should not be empty.
                guard !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                      !password.isEmpty else {
                    completion(.failure(AuthError.invalidCredentials))
                    return
                }

                let session = try await supabaseClient.auth.signIn(email: email, password: password)
                completion(.success(session))
            } catch {
                // Check if the error is specifically a GoTrueError for more detailed handling if needed
                if let goTrueError = error as? GoTrueError {
                    // Example: Distinguish between invalid credentials and other server errors
                    switch goTrueError {
                    case .api(let apiError) where apiError.statusCode == 400: // Bad Request, often invalid credentials
                        completion(.failure(AuthError.invalidCredentials))
                    default:
                        completion(.failure(AuthError.supabaseError(error)))
                    }
                } else {
                    completion(.failure(AuthError.supabaseError(error)))
                }
            }
        }
    }

    /// Signs out the currently authenticated user from Supabase.
    ///
    /// - Parameter completion: A closure to be called with the result of the sign-out attempt.
    ///                         Returns `Result<Void, AuthError>` where success indicates successful sign-out.
    func logout(completion: @escaping (Result<Void, AuthError>) -> Void) {
        Task {
            do {
                try await supabaseClient.auth.signOut()
                completion(.success(()))
            } catch {
                completion(.failure(AuthError.supabaseError(error)))
            }
        }
    }
}

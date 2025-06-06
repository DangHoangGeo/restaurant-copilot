import SwiftUI

/// A view that allows users to log in by providing their username, password, and selecting a role.
///
/// This view interacts with `AuthenticationViewModel` to perform login operations
/// and display any authentication errors.
struct LoginView: View {
    // MARK: - Environment Objects

    /// The authentication view model, injected from the environment.
    /// Used to manage login state and error messages.
    @EnvironmentObject var authViewModel: AuthenticationViewModel

    // MARK: - State Variables

    /// Holds the text input for the email.
    @State private var emailInput: String = ""
    /// Holds the text input for the password.
    @State private var passwordInput: String = ""

    // MARK: - Body

    var body: some View {
        VStack(spacing: 20) {
            // Login screen title
            Text(NSLocalizedString("login_title", comment: "Login screen title"))
                .font(.largeTitle)
                .padding(.bottom, 20)

            // Email input field
            TextField(NSLocalizedString("email_label", comment: "Email textfield placeholder"), text: $emailInput)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .autocapitalization(.none)
                .disableAutocorrection(true)
                .keyboardType(.emailAddress)

            // Password input field (secure)
            SecureField(NSLocalizedString("password_label", comment: "Password textfield placeholder"), text: $passwordInput)
                .textFieldStyle(RoundedBorderTextFieldStyle())

            // Display authentication error message, if any
            if let errorMessage = authViewModel.authError {
                Text(errorMessage) // Error message is expected to be already localized
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }

            // Login button
            Button(NSLocalizedString("login_button", comment: "Login button text")) {
                authViewModel.login(email: emailInput, password: passwordInput)
            }
            // Basic button styling
            .padding()
            .foregroundColor(.white)
            .background(Color.blue) // Example button color
            .cornerRadius(8)
            // Optional: Disable button if inputs are empty
            // .disabled(emailInput.isEmpty || passwordInput.isEmpty)

            Spacer() // Pushes the content to the top
        }
        .padding() // Overall padding for the VStack content
    }
}

// MARK: - Previews

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        // Example preview with a mock AuthenticationViewModel
        LoginView()
            .environmentObject(AuthenticationViewModel())
    }
}

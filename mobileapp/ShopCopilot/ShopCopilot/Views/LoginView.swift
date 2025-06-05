import SwiftUI

/// A view that allows users to log in by providing their username, password, and selecting a role.
///
/// This view interacts with `AuthenticationViewModel` to perform login operations
/// and display any authentication errors.
struct LoginView: View {
    // MARK: - Environment Objects

    /// The authentication view model, injected from the environment.
    /// Used to manage login state, selected role, and error messages.
    @EnvironmentObject var authViewModel: AuthenticationViewModel

    // MARK: - State Variables

    /// Holds the text input for the username.
    @State private var usernameInput: String = ""
    /// Holds the text input for the password.
    @State private var passwordInput: String = ""

    // MARK: - Body

    var body: some View {
        VStack(spacing: 20) {
            // Login screen title
            Text(NSLocalizedString("login_title", comment: "Login screen title"))
                .font(.largeTitle)
                .padding(.bottom, 20)

            // Username input field
            TextField(NSLocalizedString("username_label", comment: "Username textfield placeholder"), text: $usernameInput)
                .textFieldStyle(RoundedBorderTextFieldStyle())
                .autocapitalization(.none) // Common for usernames
                .disableAutocorrection(true) // Usernames usually don't need correction

            // Password input field (secure)
            SecureField(NSLocalizedString("password_label", comment: "Password textfield placeholder"), text: $passwordInput)
                .textFieldStyle(RoundedBorderTextFieldStyle())

            // Role selection picker
            Picker(NSLocalizedString("select_role_label", comment: "Role selection picker label"), selection: $authViewModel.selectedRole) {
                ForEach(UserRole.allCases) { role in
                    // Display the localized name of the role
                    Text(NSLocalizedString(role.localizationKey, comment: "User role display name")).tag(role)
                }
            }
            .pickerStyle(SegmentedPickerStyle()) // A common style for a few choices

            // Display authentication error message, if any
            if let errorMessage = authViewModel.authError {
                Text(errorMessage) // Error message is expected to be already localized
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
            }

            // Login button
            Button(NSLocalizedString("login_button", comment: "Login button text")) {
                authViewModel.login(username: usernameInput, password: passwordInput)
            }
            // Basic button styling
            .padding()
            .foregroundColor(.white)
            .background(Color.blue) // Example button color
            .cornerRadius(8)
            // Optional: Disable button if inputs are empty
            // .disabled(usernameInput.isEmpty || passwordInput.isEmpty)

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

import SwiftUI

/// Combined onboarding view that collects the restaurant subdomain
/// along with the user's email and password.
struct OnboardingLoginView: View {
    @EnvironmentObject var tenantViewModel: TenantViewModel
    @EnvironmentObject var authViewModel: AuthenticationViewModel

    @State private var subdomainInput: String = ""
    @State private var emailInput: String = ""
    @State private var passwordInput: String = ""
    @State private var localError: String? = nil

    var body: some View {
        VStack(spacing: 20) {
            Text(NSLocalizedString("login_title", comment: "Login screen title"))
                .font(.largeTitle)

            TextField(NSLocalizedString("tenant_id_placeholder", comment: "Placeholder for subdomain"), text: $subdomainInput)
                .textFieldStyle(.roundedBorder)
                .autocapitalization(.none)

            TextField(NSLocalizedString("email_label", comment: "Email"), text: $emailInput)
                .textFieldStyle(.roundedBorder)
                .autocapitalization(.none)
                .keyboardType(.emailAddress)

            SecureField(NSLocalizedString("password_label", comment: "Password"), text: $passwordInput)
                .textFieldStyle(.roundedBorder)

            if let msg = localError {
                Text(msg).foregroundColor(.red)
            }
            if let msg = tenantViewModel.errorMessage {
                Text(msg).foregroundColor(.red)
            }
            if let msg = authViewModel.authError {
                Text(msg).foregroundColor(.red)
            }

            Button(NSLocalizedString("login_button", comment: "Login")) {
                localError = nil
                guard !subdomainInput.trimmingCharacters(in: .whitespaces).isEmpty,
                      !emailInput.isEmpty,
                      !passwordInput.isEmpty else {
                    localError = NSLocalizedString("error_subdomain_empty", comment: "")
                    return
                }
                tenantViewModel.selectTenant(subdomain: subdomainInput)
                authViewModel.login(email: emailInput, password: passwordInput)
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .onChange(of: authViewModel.restaurantIdPublished) { newId in
            if !newId.isEmpty {
                tenantViewModel.loadTenant(byId: newId)
            }
        }
    }
}

struct OnboardingLoginView_Previews: PreviewProvider {
    static var previews: some View {
        OnboardingLoginView()
            .environmentObject(TenantViewModel())
            .environmentObject(AuthenticationViewModel(orderService: OrderService()))
    }
}

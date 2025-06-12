import SwiftUI

struct LoginView: View {
    @StateObject private var supabaseManager = SupabaseManager.shared
    @EnvironmentObject private var localizationManager: LocalizationManager
    
    @State private var subdomain = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var showError = false
    @State private var showLanguageSelector = false
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                // Language Selector
                HStack {
                    Spacer()
                    Button(action: {
                        showLanguageSelector = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "globe")
                                .font(.subheadline)
                            Text(localizationManager.supportedLanguageNames[localizationManager.currentLanguage] ?? "English")
                                .font(.subheadline)
                        }
                        .foregroundColor(.blue)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 10)
                
                // Header
                VStack(spacing: 10) {
                    Image(systemName: "fork.knife.circle.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)
                    
                    Text("app_name".localized)
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("app_subtitle".localized)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 20)
                
                Spacer()
                
                // Login Form
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("restaurant_subdomain".localized)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        TextField("restaurant_subdomain_placeholder".localized, text: $subdomain)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("email".localized)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        TextField("email_placeholder".localized, text: $email)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("password".localized)
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        SecureField("password_placeholder".localized, text: $password)
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                    }
                    
                    Button(action: {
                        Task {
                            await signIn()
                        }
                    }) {
                        HStack {
                            if isLoading {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    .scaleEffect(0.8)
                            }
                            Text(isLoading ? "signing_in".localized : "sign_in".localized)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 50)
                        .background(isFormValid ? Color.blue : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }
                    .disabled(!isFormValid || isLoading)
                }
                .padding(.horizontal, 32)
                
                Spacer()
                
                Text("login_subtitle".localized)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 20)
            }
            .navigationBarHidden(true)
            .alert("login_error".localized, isPresented: $showError) {
                Button("ok".localized) { }
            } message: {
                Text(errorMessage)
            }
            .sheet(isPresented: $showLanguageSelector) {
                LanguageSelectorView()
                    .environmentObject(localizationManager)
            }
            .onAppear {
                // Load previously used credentials for convenience
                subdomain = UserDefaults.standard.string(forKey: "lastSubdomain") ?? ""
                email = UserDefaults.standard.string(forKey: "lastEmail") ?? ""
                loadCredentials()
            }
        }
    }

    private func loadCredentials() {
        let defaults = UserDefaults.standard
        if let savedSubdomain = defaults.string(forKey: "lastUsedSubdomain") {
            self.subdomain = savedSubdomain
        }
        if let savedEmail = defaults.string(forKey: "lastUsedEmail") {
            self.email = savedEmail

        }
    }
    
    private var isFormValid: Bool {
        !subdomain.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !password.isEmpty
    }
    
    @MainActor
    private func signIn() async {
        isLoading = true
        errorMessage = ""
        
        do {
            let trimmedSubdomain = subdomain.trimmingCharacters(in: .whitespacesAndNewlines)
            let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)

            try await supabaseManager.signIn(
                subdomain: trimmedSubdomain,
                email: trimmedEmail,
                password: password
            )
            if supabaseManager.isAuthenticated {
                UserDefaults.standard.set(subdomain, forKey: "lastSubdomain")
                UserDefaults.standard.set(email, forKey: "lastEmail")
            }
        } catch {
            if let authError = error as? AuthError {
                errorMessage = authError.errorDescription ?? "Unknown error"
            } else {
                errorMessage = error.localizedDescription
            }
            showError = true
        }
        
        isLoading = false
    }
}

#Preview {
    LoginView()
}

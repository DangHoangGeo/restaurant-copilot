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
        if #available(iOS 16.0, *) {
            NavigationStack {
                contentView
            }
        } else {
            NavigationView {
                contentView
            }
            .navigationViewStyle(StackNavigationViewStyle())
        }
    }

    private var contentView: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()
            ScrollView {
                VStack(spacing: 24) {
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
                            .foregroundColor(.appPrimary)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 10)
                    
                    // Header
                    VStack(spacing: 10) {
                        Image(systemName: "fork.knife.circle.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.appPrimary)
                        Text("app_name".localized)
                            .font(.displayTitle)
                            .fontWeight(.bold)
                            .foregroundColor(.appTextPrimary)
                        Text("app_subtitle".localized)
                            .font(.bodyRegular)
                            .foregroundColor(.appTextSecondary)
                    }
                    .padding(.top, 16)
                    
                    Spacer(minLength: 0)
                    
                    // Login Form
                    VStack(spacing: 16) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("restaurant_subdomain".localized)
                                .font(.sectionHeader)
                                .foregroundColor(.appTextPrimary)
                            TextField("restaurant_subdomain_placeholder".localized, text: $subdomain)
                                .textFieldStyle(AppTextFieldStyle())
                                .background(Color.appSurface)
                                .cornerRadius(10)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                        }
                        VStack(alignment: .leading, spacing: 8) {
                            Text("email".localized)
                                .font(.sectionHeader)
                                .foregroundColor(.appTextPrimary)
                            TextField("email_placeholder".localized, text: $email)
                                .textFieldStyle(AppTextFieldStyle())
                                .background(Color.appSurface)
                                .cornerRadius(10)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                        }
                        VStack(alignment: .leading, spacing: 8) {
                            Text("password".localized)
                                .font(.sectionHeader)
                                .foregroundColor(.appTextPrimary)
                            SecureField("password_placeholder".localized, text: $password)
                                .textFieldStyle(AppTextFieldStyle())
                                .background(Color.appSurface)
                                .cornerRadius(10)
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
                                    .font(.buttonLarge)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 50)
                            .background(isFormValid ? Color.appPrimary : Color.appDisabled)
                            .foregroundColor(.white)
                            .cornerRadius(10)
                        }
                        .disabled(!isFormValid || isLoading)
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 24)
                    .background(Color.appSurface)
                    .cornerRadius(16)
                    
                    Spacer(minLength: 0)
                    
                    Text("login_subtitle".localized)
                        .font(.captionRegular)
                        .foregroundColor(.appTextSecondary)
                        .padding(.bottom, 20)
                }
                .frame(maxHeight: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
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
}

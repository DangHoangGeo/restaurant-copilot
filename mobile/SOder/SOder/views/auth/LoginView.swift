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
    @State private var appearAnimation = false
    
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
            // Enhanced gradient background matching web design
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.93, green: 0.95, blue: 1.0).opacity(0.5),  // from-blue-50/50
                    Color.appBackground,
                    Color(red: 0.98, green: 0.95, blue: 1.0).opacity(0.5)   // to-purple-50/50
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Language Selector - Enhanced styling
                    HStack {
                        Spacer()
                        Button(action: {
                            showLanguageSelector = true
                        }) {
                            HStack(spacing: 6) {
                                Image(systemName: "globe")
                                    .font(.subheadline)
                                Text(localizationManager.supportedLanguageNames[localizationManager.currentLanguage] ?? "English")
                                    .font(.subheadline)
                            }
                            .foregroundColor(.appPrimary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color.appSurface.opacity(0.9))
                            .cornerRadius(20)
                            .shadow(color: Elevation.level1.color, radius: Elevation.level1.radius, y: Elevation.level1.y)
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.top, 10)

                    Spacer().frame(height: 20)

                    // Header - Enhanced with gradient and better spacing
                    VStack(spacing: 12) {
                        // Icon with gradient background
                        ZStack {
                            Circle()
                                .fill(
                                    LinearGradient(
                                        gradient: Gradient(colors: [
                                            Color.appPrimary.opacity(0.15),
                                            Color.appPrimary.opacity(0.05)
                                        ]),
                                        startPoint: .topLeading,
                                        endPoint: .bottomTrailing
                                    )
                                )
                                .frame(width: 100, height: 100)

                            Image(systemName: "fork.knife.circle.fill")
                                .font(.system(size: 50))
                                .foregroundColor(.appPrimary)
                        }

                        Text("app_name".localized)
                            .font(.system(size: 32, weight: .bold))
                            .foregroundStyle(
                                LinearGradient(
                                    gradient: Gradient(colors: [Color.appTextPrimary, Color.appTextPrimary.opacity(0.7)]),
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )

                        Text("app_subtitle".localized)
                            .font(.bodyRegular)
                            .foregroundColor(.appTextSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 20)
                    
                    Spacer(minLength: 0)
                    
                    // Error Banner - Enhanced matching web design
                    if showError && !errorMessage.isEmpty {
                        HStack(spacing: 12) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .font(.body)
                                .foregroundColor(.appError)

                            Text(errorMessage)
                                .font(.bodyMedium)
                                .foregroundColor(.appError)
                                .fixedSize(horizontal: false, vertical: true)

                            Spacer()

                            Button(action: {
                                withAnimation {
                                    showError = false
                                    errorMessage = ""
                                }
                            }) {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.body)
                                    .foregroundColor(.appError.opacity(0.6))
                            }
                        }
                        .padding(Spacing.md)
                        .background(Color.appErrorLight)
                        .cornerRadius(CornerRadius.md)
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.md)
                                .stroke(Color.appError.opacity(0.3), lineWidth: 1)
                        )
                        .transition(.move(edge: .top).combined(with: .opacity))
                    }

                    // Login Form - Enhanced with elevation and better styling
                    VStack(spacing: 20) {
                        // Subdomain field with icon
                        VStack(alignment: .leading, spacing: 8) {
                            Text("restaurant_subdomain".localized)
                                .font(.sectionHeader)
                                .foregroundColor(.appTextPrimary)

                            HStack(spacing: 12) {
                                Image(systemName: "building.2.fill")
                                    .font(.body)
                                    .foregroundColor(.appTextSecondary)
                                    .frame(width: 20)

                                TextField("restaurant_subdomain_placeholder".localized, text: $subdomain)
                                    .font(.bodyRegular)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            }
                            .padding(Spacing.md)
                            .background(Color.appSurface)
                            .cornerRadius(CornerRadius.md)
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                    .stroke(Color.appBorder, lineWidth: 1)
                            )
                            .shadow(color: Elevation.level1.color, radius: 2, y: 1)
                        }

                        // Email field with icon
                        VStack(alignment: .leading, spacing: 8) {
                            Text("email".localized)
                                .font(.sectionHeader)
                                .foregroundColor(.appTextPrimary)

                            HStack(spacing: 12) {
                                Image(systemName: "envelope.fill")
                                    .font(.body)
                                    .foregroundColor(.appTextSecondary)
                                    .frame(width: 20)

                                TextField("email_placeholder".localized, text: $email)
                                    .font(.bodyRegular)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                            }
                            .padding(Spacing.md)
                            .background(Color.appSurface)
                            .cornerRadius(CornerRadius.md)
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                    .stroke(Color.appBorder, lineWidth: 1)
                            )
                            .shadow(color: Elevation.level1.color, radius: 2, y: 1)
                        }

                        // Password field with icon
                        VStack(alignment: .leading, spacing: 8) {
                            Text("password".localized)
                                .font(.sectionHeader)
                                .foregroundColor(.appTextPrimary)

                            HStack(spacing: 12) {
                                Image(systemName: "lock.fill")
                                    .font(.body)
                                    .foregroundColor(.appTextSecondary)
                                    .frame(width: 20)

                                SecureField("password_placeholder".localized, text: $password)
                                    .font(.bodyRegular)
                            }
                            .padding(Spacing.md)
                            .background(Color.appSurface)
                            .cornerRadius(CornerRadius.md)
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                    .stroke(Color.appBorder, lineWidth: 1)
                            )
                            .shadow(color: Elevation.level1.color, radius: 2, y: 1)
                        }

                        // Enhanced gradient button matching web design
                        Button(action: {
                            Task {
                                await signIn()
                            }
                        }) {
                            HStack(spacing: 8) {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                        .scaleEffect(0.9)
                                }
                                Text(isLoading ? "signing_in".localized : "sign_in".localized)
                                    .font(.buttonLarge)
                                    .fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(
                                Group {
                                    if isFormValid {
                                        LinearGradient(
                                            gradient: Gradient(colors: [
                                                Color(red: 0.26, green: 0.47, blue: 0.85),  // blue-600
                                                Color(red: 0.22, green: 0.42, blue: 0.78)   // blue-700
                                            ]),
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    } else {
                                        LinearGradient(
                                            gradient: Gradient(colors: [Color.appDisabled, Color.appDisabled]),
                                            startPoint: .leading,
                                            endPoint: .trailing
                                        )
                                    }
                                }
                            )
                            .foregroundColor(.white)
                            .cornerRadius(CornerRadius.md)
                            .shadow(
                                color: isFormValid ? Color.appPrimary.opacity(0.3) : Color.clear,
                                radius: 8,
                                y: 4
                            )
                        }
                        .disabled(!isFormValid || isLoading)
                        .scaleEffect(isLoading ? 0.98 : 1.0)
                        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isLoading)
                        .padding(.top, 8)
                    }
                    .padding(.horizontal, 24)
                    .padding(.vertical, 28)
                    .background(
                        ZStack {
                            // Base surface
                            Color.appSurface

                            // Subtle gradient overlay matching web design
                            LinearGradient(
                                gradient: Gradient(colors: [
                                    Color(red: 0.93, green: 0.95, blue: 1.0).opacity(0.3),
                                    Color.clear,
                                    Color(red: 0.98, green: 0.95, blue: 1.0).opacity(0.3)
                                ]),
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        }
                    )
                    .cornerRadius(20)
                    .shadow(color: Elevation.level3.color, radius: Elevation.level3.radius, y: Elevation.level3.y)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.appBorderLight, lineWidth: 1)
                    )
                    
                    Spacer(minLength: 0)

                    // Footer text with better styling
                    Text("login_subtitle".localized)
                        .font(.captionRegular)
                        .foregroundColor(.appTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                        .padding(.bottom, 20)
                }
                .frame(maxHeight: .infinity)
                .padding(.horizontal, 20)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationBarHidden(true)
        .sheet(isPresented: $showLanguageSelector) {
            LanguageSelectorView()
                .environmentObject(localizationManager)
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.6)) {
                // Trigger any appearance animations
            }
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
        withAnimation {
            showError = false
            errorMessage = ""
        }

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
            withAnimation(.spring(response: 0.4, dampingFraction: 0.7)) {
                if let authError = error as? AuthError {
                    errorMessage = authError.errorDescription ?? "Unknown error"
                } else {
                    errorMessage = error.localizedDescription
                }
                showError = true
            }
        }

        isLoading = false
    }
}

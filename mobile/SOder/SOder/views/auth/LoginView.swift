import SwiftUI

struct LoginView: View {
    @StateObject private var supabaseManager = SupabaseManager.shared
    @EnvironmentObject private var localizationManager: LocalizationManager

    @State private var branchCode = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var showError = false
    @State private var showLanguageSelector = false

    var body: some View {
        if #available(iOS 16.0, *) {
            NavigationStack { contentView }
        } else {
            NavigationView { contentView }
                .navigationViewStyle(StackNavigationViewStyle())
        }
    }

    private var contentView: some View {
        ZStack {
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.appInfoLight.opacity(0.5),
                    Color.appBackground,
                    Color.appSurfaceSecondary.opacity(0.5)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Language Selector
                    HStack {
                        Spacer()
                        Button(action: { showLanguageSelector = true }) {
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
                        .accessibilityLabel("language_selector".localized)
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.top, Spacing.sm)

                    Spacer().frame(height: Spacing.md)

                    // Header
                    VStack(spacing: 12) {
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
                            .font(.displayTitle)
                            .foregroundColor(.appTextPrimary)
                        Text("app_subtitle".localized)
                            .font(.bodyRegular)
                            .foregroundColor(.appTextSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, Spacing.md)

                    // Error Banner
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
                                withAnimation { showError = false; errorMessage = "" }
                            }) {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.body)
                                    .foregroundColor(.appError.opacity(0.6))
                            }
                            .accessibilityLabel("close".localized)
                        }
                        .padding(Spacing.md)
                        .background(Color.appErrorLight)
                        .cornerRadius(CornerRadius.md)
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.md)
                                .stroke(Color.appError.opacity(0.3), lineWidth: 1)
                        )
                        .transition(.move(edge: .top).combined(with: .opacity))
                        .padding(.horizontal, Spacing.lg)
                    }

                    // Login Form Card
                    VStack(spacing: Spacing.md) {
                        // Branch Code field
                        formField(
                            label: "branch_code".localized,
                            icon: "building.2.fill",
                            content: {
                                TextField("branch_code_placeholder".localized, text: $branchCode)
                                    .font(.bodyRegular)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                                    .accessibilityLabel("branch_code".localized)
                            }
                        )

                        // Email field
                        formField(
                            label: "email".localized,
                            icon: "envelope.fill",
                            content: {
                                TextField("email_placeholder".localized, text: $email)
                                    .font(.bodyRegular)
                                    .keyboardType(.emailAddress)
                                    .autocapitalization(.none)
                                    .disableAutocorrection(true)
                                    .accessibilityLabel("email".localized)
                            }
                        )

                        // Password field
                        formField(
                            label: "password".localized,
                            icon: "lock.fill",
                            content: {
                                SecureField("password_placeholder".localized, text: $password)
                                    .font(.bodyRegular)
                                    .accessibilityLabel("password".localized)
                            }
                        )

                        // Sign In button
                        Button(action: { Task { await signIn() } }) {
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
                                            gradient: Gradient(colors: [Color.appPrimary, Color.appPrimary.opacity(0.85)]),
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
                        .padding(.top, Spacing.sm)
                        .accessibilityLabel("sign_in".localized)
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, 28)
                    .background(Color.appSurface)
                    .cornerRadius(20)
                    .shadow(color: Elevation.level3.color, radius: Elevation.level3.radius, y: Elevation.level3.y)
                    .overlay(
                        RoundedRectangle(cornerRadius: 20)
                            .stroke(Color.appBorderLight, lineWidth: 1)
                    )
                    .padding(.horizontal, Spacing.md)

                    // Legal footer
                    VStack(spacing: 4) {
                        Text("login_legal_footer".localized)
                            .font(.captionRegular)
                            .foregroundColor(.appTextTertiary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, Spacing.xl)
                    }
                    .padding(.bottom, Spacing.md)
                }
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .navigationBarHidden(true)
        .sheet(isPresented: $showLanguageSelector) {
            LanguageSelectorView()
                .environmentObject(localizationManager)
        }
        .onAppear { loadSavedCredentials() }
    }

    @ViewBuilder
    private func formField<Content: View>(
        label: String,
        icon: String,
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundColor(.appTextSecondary)
                    .frame(width: 20)
                content()
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
    }

    private func loadSavedCredentials() {
        branchCode = UserDefaults.standard.string(forKey: "lastUsedBranchCode") ?? ""
        email = UserDefaults.standard.string(forKey: "lastUsedEmail") ?? ""
    }

    private var isFormValid: Bool {
        !branchCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !password.isEmpty
    }

    @MainActor
    private func signIn() async {
        isLoading = true
        withAnimation { showError = false; errorMessage = "" }

        do {
            let trimmedBranchCode = branchCode.trimmingCharacters(in: .whitespacesAndNewlines)
            let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)

            try await supabaseManager.signIn(
                branchCode: trimmedBranchCode,
                email: trimmedEmail,
                password: password
            )

            if supabaseManager.isAuthenticated {
                UserDefaults.standard.set(trimmedBranchCode, forKey: "lastUsedBranchCode")
                UserDefaults.standard.set(trimmedEmail, forKey: "lastUsedEmail")
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

#Preview {
    LoginView()
        .environmentObject(LocalizationManager.shared)
}

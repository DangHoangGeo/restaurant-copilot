import SwiftUI

struct LoginView: View {
    @StateObject private var supabaseManager = SupabaseManager.shared
    @EnvironmentObject private var localizationManager: LocalizationManager

    @State private var branchCode = ""
    @State private var email = ""
    @State private var password = ""
    @State private var showPassword = false
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var showError = false
    @State private var showLanguageSelector = false

    @FocusState private var focusedField: LoginField?

    private enum LoginField: Hashable {
        case branchCode, email, password
    }

    var body: some View {
        if #available(iOS 16.0, *) {
            NavigationStack { contentView }
        } else {
            NavigationView { contentView }
                .navigationViewStyle(StackNavigationViewStyle())
        }
    }

    // MARK: - Main Content

    private var contentView: some View {
        ZStack {
            // Subtle tinted background consistent with welcome screen palette
            LinearGradient(
                gradient: Gradient(colors: [
                    Color.appWelcomeGradientStart.opacity(0.05),
                    Color.appBackground,
                    Color.appAccent.opacity(0.04)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            ScrollView {
                VStack(spacing: Spacing.lg) {
                    languageSelectorRow
                    headerSection
                    if showError && !errorMessage.isEmpty {
                        errorBanner
                            .transition(.move(edge: .top).combined(with: .opacity))
                    }
                    formCard
                    legalFooter
                }
                .animation(.spring(response: 0.4, dampingFraction: 0.75), value: showError)
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

    // MARK: - Language Selector

    private var languageSelectorRow: some View {
        HStack {
            Spacer()
            Button(action: { showLanguageSelector = true }) {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "globe")
                        .font(.system(size: 13, weight: .medium))
                    Text(localizationManager.supportedLanguageNames[localizationManager.currentLanguage] ?? "English")
                        .font(.system(size: 13, weight: .medium))
                }
                .foregroundColor(.appPrimary)
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .background(Color.appPrimary.opacity(0.08))
                .cornerRadius(CornerRadius.lg)
            }
            .accessibilityLabel("language_selector".localized)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.top, Spacing.sm)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: Spacing.sm) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [Color.appPrimary.opacity(0.12), Color.appPrimary.opacity(0.04)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 88, height: 88)
                Image(systemName: "fork.knife.circle.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.appPrimary)
            }
            VStack(spacing: 4) {
                Text("login_title".localized)
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.appTextPrimary)
                Text("login_subtitle".localized)
                    .font(.bodyMedium)
                    .foregroundColor(.appTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.lg)
            }
        }
        .padding(.top, Spacing.md)
    }

    // MARK: - Error Banner

    private var errorBanner: some View {
        HStack(spacing: Spacing.sm) {
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
                .stroke(Color.appError.opacity(0.25), lineWidth: 1)
        )
        .padding(.horizontal, Spacing.md)
        .accessibilityElement(children: .combine)
    }

    // MARK: - Form Card

    private var formCard: some View {
        VStack(spacing: Spacing.md) {
            // Branch Code / Workspace field
            formField(
                label: "branch_code".localized,
                icon: "building.2.fill",
                hint: "branch_code_hint".localized,
                isFocused: focusedField == .branchCode
            ) {
                TextField("branch_code_placeholder".localized, text: $branchCode)
                    .font(.bodyRegular)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                    .focused($focusedField, equals: .branchCode)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .email }
                    .accessibilityLabel("branch_code".localized)
            }

            // Email field
            formField(
                label: "email".localized,
                icon: "envelope.fill",
                isFocused: focusedField == .email
            ) {
                TextField("email_placeholder".localized, text: $email)
                    .font(.bodyRegular)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                    .focused($focusedField, equals: .email)
                    .submitLabel(.next)
                    .onSubmit { focusedField = .password }
                    .accessibilityLabel("email".localized)
            }

            // Password field with show/hide toggle
            formField(
                label: "password".localized,
                icon: "lock.fill",
                isFocused: focusedField == .password,
                trailingIcon: {
                    Button(action: { showPassword.toggle() }) {
                        Image(systemName: showPassword ? "eye.slash.fill" : "eye.fill")
                            .font(.system(size: 16))
                            .foregroundColor(.appTextSecondary)
                            .frame(width: 28, height: 28)
                    }
                    .accessibilityLabel(showPassword ? "login_hide_password".localized : "login_show_password".localized)
                }
            ) {
                Group {
                    if showPassword {
                        TextField("password_placeholder".localized, text: $password)
                            .submitLabel(.go)
                            .onSubmit { Task { await signIn() } }
                    } else {
                        SecureField("password_placeholder".localized, text: $password)
                            .submitLabel(.go)
                            .onSubmit { Task { await signIn() } }
                    }
                }
                .font(.bodyRegular)
                .focused($focusedField, equals: .password)
                .accessibilityLabel("password".localized)
            }

            signInButton
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.vertical, Spacing.lg)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.xl)
        .shadow(color: Elevation.level2.color, radius: Elevation.level2.radius, y: Elevation.level2.y)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.xl)
                .stroke(Color.appBorderLight, lineWidth: 1)
        )
        .padding(.horizontal, Spacing.md)
    }

    // MARK: - Form Field Builder

    @ViewBuilder
    private func formField<Content: View>(
        label: String,
        icon: String,
        hint: String? = nil,
        isFocused: Bool,
        @ViewBuilder trailingIcon: () -> some View = { EmptyView() },
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 16))
                    .foregroundColor(isFocused ? .appPrimary : .appTextSecondary)
                    .frame(width: 20)
                    .animation(.easeInOut(duration: 0.15), value: isFocused)

                content()

                trailingIcon()
            }
            .padding(Spacing.md)
            .background(Color.appSurface)
            .cornerRadius(CornerRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(
                        isFocused ? Color.appPrimary : Color.appBorder,
                        lineWidth: isFocused ? 2 : 1
                    )
                    .animation(.easeInOut(duration: 0.18), value: isFocused)
            )
            .shadow(
                color: isFocused ? Color.appPrimary.opacity(0.1) : Elevation.level1.color,
                radius: isFocused ? 6 : 2,
                y: 1
            )
            .animation(.easeInOut(duration: 0.18), value: isFocused)

            if let hint = hint {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 10))
                    Text(hint)
                        .font(.captionRegular)
                }
                .foregroundColor(.appTextTertiary)
                .padding(.leading, 2)
            }
        }
    }

    // MARK: - Sign In Button

    private var signInButton: some View {
        Button(action: { Task { await signIn() } }) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        .scaleEffect(0.9)
                } else {
                    Image(systemName: "arrow.right.circle.fill")
                        .font(.system(size: 18))
                }
                Text(isLoading ? "signing_in".localized : "sign_in".localized)
                    .font(.system(size: 17, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(
                Group {
                    if isFormValid && !isLoading {
                        LinearGradient(
                            colors: [Color.appPrimary, Color.appPrimary.opacity(0.82)],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    } else {
                        LinearGradient(
                            colors: [Color.appDisabled, Color.appDisabled],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    }
                }
            )
            .foregroundColor(.white)
            .cornerRadius(CornerRadius.lg)
            .shadow(
                color: isFormValid ? Color.appPrimary.opacity(0.32) : Color.clear,
                radius: 10,
                y: 5
            )
        }
        .disabled(!isFormValid || isLoading)
        .scaleEffect(isLoading ? 0.98 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isLoading)
        .padding(.top, Spacing.xs)
        .accessibilityLabel("sign_in".localized)
    }

    // MARK: - Legal Footer

    private var legalFooter: some View {
        Text("login_legal_footer".localized)
            .font(.captionRegular)
            .foregroundColor(.appTextTertiary)
            .multilineTextAlignment(.center)
            .padding(.horizontal, Spacing.xl)
            .padding(.bottom, Spacing.md)
    }

    // MARK: - Helpers

    private var isFormValid: Bool {
        !branchCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !password.isEmpty
    }

    private func loadSavedCredentials() {
        branchCode = UserDefaults.standard.string(forKey: "lastUsedBranchCode") ?? ""
        email = UserDefaults.standard.string(forKey: "lastUsedEmail") ?? ""
    }

    @MainActor
    private func signIn() async {
        guard isFormValid else { return }
        focusedField = nil
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
            withAnimation(.spring(response: 0.4, dampingFraction: 0.75)) {
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

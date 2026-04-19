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
    @State private var animateIn = false

    @FocusState private var focusedField: LoginField?

    private enum LoginField: Hashable {
        case branchCode, email, password
    }

    var body: some View {
        NavigationStack { contentView }
    }

    private var contentView: some View {
        ZStack {
            AppScreenBackground()

            ScrollView(showsIndicators: false) {
                VStack(spacing: Spacing.lg) {
                    topBar

                    AuthHeroCluster(
                        variant: .signIn,
                        subtitle: "sign_in".localized
                    )
                    .padding(.horizontal, Spacing.md)
                    .padding(.top, Spacing.sm)
                    .scaleEffect(animateIn ? 1 : 0.96)
                    .opacity(animateIn ? 1 : 0)

                    if showError && !errorMessage.isEmpty {
                        errorBanner
                            .transition(.move(edge: .top).combined(with: .opacity))
                    }

                    formCard
                        .opacity(animateIn ? 1 : 0)
                        .offset(y: animateIn ? 0 : 24)

                    legalFooter
                        .opacity(animateIn ? 1 : 0)
                        .offset(y: animateIn ? 0 : 20)
                }
                .padding(.bottom, Spacing.xxl)
                .animation(.spring(response: 0.4, dampingFraction: 0.75), value: showError)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showLanguageSelector) {
            LanguageSelectorView()
                .environmentObject(localizationManager)
        }
        .onAppear {
            loadSavedCredentials()
            withAnimation(.spring(response: 0.72, dampingFraction: 0.84)) {
                animateIn = true
            }
        }
    }

    private var topBar: some View {
        HStack {
            Spacer()

            AuthLanguageButton(
                title: localizationManager.supportedLanguageNames[localizationManager.currentLanguage] ?? "English",
                action: { showLanguageSelector = true }
            )
            .accessibilityLabel("language_selector".localized)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.top, Spacing.sm)
    }

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
                withAnimation {
                    showError = false
                    errorMessage = ""
                }
            }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.body)
                    .foregroundColor(.appError.opacity(0.6))
            }
            .accessibilityLabel("close".localized)
        }
        .padding(Spacing.md)
        .background(Color.appErrorLight)
        .cornerRadius(CornerRadius.lg)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.lg)
                .stroke(Color.appError.opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal, Spacing.md)
        .accessibilityElement(children: .combine)
    }

    private var formCard: some View {
        VStack(spacing: Spacing.md) {
            formField(
                label: "branch_code".localized,
                icon: "building.2.fill",
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

    private var legalFooter: some View {
        HStack(spacing: Spacing.xs) {
            Link("terms_of_service".localized, destination: legalURL(path: "terms"))
                .foregroundColor(.appTextSecondary)

            Text("·")
                .foregroundColor(.appTextTertiary)

            Link("privacy_policy".localized, destination: legalURL(path: "privacy"))
                .foregroundColor(.appTextSecondary)
        }
        .font(.captionRegular)
        .padding(.bottom, Spacing.md)
    }

    @ViewBuilder
    private func formField<Content: View>(
        label: String,
        icon: String,
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
                    .foregroundColor(isFocused ? .appHighlight : .appTextSecondary)
                    .frame(width: 20)
                    .animation(.easeInOut(duration: 0.15), value: isFocused)

                content()
                    .foregroundColor(.appTextPrimary)

                trailingIcon()
            }
            .padding(Spacing.md)
            .background(Color.appSurfaceSecondary)
            .cornerRadius(CornerRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(
                        isFocused ? Color.appHighlightSoft : Color.appBorder,
                        lineWidth: isFocused ? 2 : 1
                    )
                    .animation(.easeInOut(duration: 0.18), value: isFocused)
            )
            .shadow(
                color: isFocused ? Color.appHighlight.opacity(0.12) : Elevation.level1.color,
                radius: isFocused ? 6 : 2,
                y: 1
            )
            .animation(.easeInOut(duration: 0.18), value: isFocused)
        }
    }

    private var signInButton: some View {
        Button(action: { Task { await signIn() } }) {
            HStack(spacing: Spacing.sm) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: .appOnHighlight))
                        .scaleEffect(0.9)
                } else {
                    Image(systemName: "arrow.right.circle.fill")
                        .font(.system(size: 18))
                }

                Text(isLoading ? "signing_in".localized : "sign_in".localized)
                    .font(.buttonLarge)
            }
        }
        .buttonStyle(PrimaryButtonStyle(isEnabled: isFormValid && !isLoading))
        .disabled(!isFormValid || isLoading)
        .scaleEffect(isLoading ? 0.98 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isLoading)
        .padding(.top, Spacing.xs)
        .accessibilityLabel("sign_in".localized)
    }

    private var isFormValid: Bool {
        !branchCode.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !email.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !password.isEmpty
    }

    private func legalURL(path: String) -> URL {
        let locale = localizationManager.currentLanguage
        return URL(string: "https://coorder.ai/\(locale)/\(path)")
            ?? URL(string: "https://coorder.ai/en/\(path)")!
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
        withAnimation {
            showError = false
            errorMessage = ""
        }

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

import SwiftUI

struct WelcomeView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @State private var showLanguageSelector = false
    @State private var animateContent = false

    let onGetStarted: () -> Void

    var body: some View {
        ZStack {
            AppScreenBackground()

            VStack(spacing: 0) {
                topBar

                Spacer(minLength: Spacing.md)

                AuthHeroCluster(
                    variant: .welcome,
                    subtitle: "welcome_tagline".localized
                )
                .padding(.horizontal, Spacing.md)
                .scaleEffect(animateContent ? 1 : 0.94)
                .opacity(animateContent ? 1 : 0)

                Spacer()

                Spacer()

                Button(action: onGetStarted) {
                    HStack(spacing: Spacing.sm) {
                        Text("welcome_get_started".localized)
                            .font(.buttonLarge)

                        Image(systemName: "arrow.right.circle.fill")
                            .font(.system(size: 19))
                    }
                }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.horizontal, Spacing.lg)
                .padding(.bottom, Spacing.xxl)
                .opacity(animateContent ? 1 : 0)
                .offset(y: animateContent ? 0 : 28)
            }
            .padding(.top, Spacing.md)
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation(.spring(response: 0.72, dampingFraction: 0.82)) {
                animateContent = true
            }
        }
        .sheet(isPresented: $showLanguageSelector) {
            LanguageSelectorView()
                .environmentObject(localizationManager)
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
}

#Preview {
    WelcomeView(onGetStarted: {})
        .environmentObject(LocalizationManager.shared)
}

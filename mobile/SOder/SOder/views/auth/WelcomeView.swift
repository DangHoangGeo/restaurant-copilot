import SwiftUI

/// First-launch welcome / onboarding screen.
/// Shows brand identity, three key feature highlights, and a Get Started CTA.
/// Follows foundation rule: owner/manager UX is mobile-first and operationally simple.
struct WelcomeView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @State private var showLanguageSelector = false
    @State private var animateContent = false

    /// Called when the user taps "Get Started" to proceed to login.
    let onGetStarted: () -> Void

    var body: some View {
        ZStack {
            backgroundGradient
            decorativeCircles
            contentStack
        }
        .ignoresSafeArea()
        .onAppear {
            withAnimation { animateContent = true }
        }
        .sheet(isPresented: $showLanguageSelector) {
            LanguageSelectorView()
                .environmentObject(localizationManager)
        }
    }

    // MARK: - Background

    private var backgroundGradient: some View {
        LinearGradient(
            gradient: Gradient(stops: [
                .init(color: Color.appWelcomeGradientStart, location: 0.0),
                .init(color: Color.appWelcomeGradientMid,   location: 0.45),
                .init(color: Color.appWelcomeGradientEnd,   location: 1.0)
            ]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()
    }

    private var decorativeCircles: some View {
        GeometryReader { geo in
            Circle()
                .fill(Color.white.opacity(0.04))
                .frame(width: geo.size.width * 1.5)
                .position(x: -geo.size.width * 0.05, y: geo.size.height * 0.12)
            Circle()
                .fill(Color.white.opacity(0.03))
                .frame(width: geo.size.width * 0.85)
                .position(x: geo.size.width * 1.05, y: geo.size.height * 0.78)
            Circle()
                .fill(Color.appWelcomeAccent.opacity(0.06))
                .frame(width: geo.size.width * 0.6)
                .position(x: geo.size.width * 0.5, y: geo.size.height * 0.55)
        }
    }

    // MARK: - Content

    private var contentStack: some View {
        VStack(spacing: 0) {
            languageSelectorRow
            Spacer()
            brandingSection
            Spacer().frame(height: Spacing.xxl + Spacing.md)
            featuresSection
            Spacer()
            ctaSection
        }
        .padding(.top, Spacing.md)
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
                .foregroundColor(.white.opacity(0.85))
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.sm)
                .background(Color.white.opacity(0.12))
                .cornerRadius(CornerRadius.lg)
            }
            .accessibilityLabel("language_selector".localized)
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.top, Spacing.sm)
    }

    // MARK: - Branding

    private var brandingSection: some View {
        VStack(spacing: Spacing.lg) {
            logoMark
            brandText
        }
        .opacity(animateContent ? 1 : 0)
        .scaleEffect(animateContent ? 1 : 0.88)
        .animation(.spring(response: 0.65, dampingFraction: 0.75).delay(0.1), value: animateContent)
    }

    private var logoMark: some View {
        ZStack {
            Circle()
                .fill(Color.white.opacity(0.07))
                .frame(width: 124, height: 124)
            Circle()
                .fill(Color.white.opacity(0.06))
                .frame(width: 100, height: 100)
            Image(systemName: "fork.knife.circle.fill")
                .font(.system(size: 54))
                .foregroundStyle(
                    LinearGradient(
                        colors: [Color.white, Color.appWelcomeAccent],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
        }
    }

    private var brandText: some View {
        VStack(spacing: Spacing.xs) {
            Text("app_name".localized)
                .font(.system(size: 40, weight: .bold, design: .rounded))
                .foregroundColor(.white)
                .kerning(-0.5)
            Text("welcome_tagline".localized)
                .font(.system(size: 16, weight: .regular))
                .foregroundColor(.white.opacity(0.68))
                .multilineTextAlignment(.center)
                .lineSpacing(3)
                .padding(.horizontal, Spacing.xl)
        }
    }

    // MARK: - Feature Highlights

    private var featuresSection: some View {
        VStack(spacing: Spacing.sm) {
            featureRow(
                icon: "list.bullet.clipboard.fill",
                text: "welcome_feature_orders".localized,
                delay: 0.35
            )
            featureRow(
                icon: "flame.fill",
                text: "welcome_feature_kitchen".localized,
                delay: 0.44
            )
            featureRow(
                icon: "chart.bar.xaxis",
                text: "welcome_feature_finance".localized,
                delay: 0.53
            )
        }
        .padding(.horizontal, Spacing.lg)
    }

    private func featureRow(icon: String, text: String, delay: Double) -> some View {
        HStack(spacing: Spacing.md) {
            ZStack {
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .fill(Color.white.opacity(0.11))
                    .frame(width: 44, height: 44)
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundColor(.white.opacity(0.9))
            }
            Text(text)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.white.opacity(0.82))
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 16))
                .foregroundColor(Color.appWelcomeAccent)
        }
        .opacity(animateContent ? 1 : 0)
        .offset(x: animateContent ? 0 : -24)
        .animation(.easeOut(duration: 0.45).delay(delay), value: animateContent)
    }

    // MARK: - CTA

    private var ctaSection: some View {
        VStack(spacing: Spacing.md) {
            getStartedButton
            legalFooter
        }
        .padding(.horizontal, Spacing.lg)
        .padding(.bottom, Spacing.xxl)
        .opacity(animateContent ? 1 : 0)
        .offset(y: animateContent ? 0 : 32)
        .animation(.easeOut(duration: 0.5).delay(0.62), value: animateContent)
    }

    private var getStartedButton: some View {
        Button(action: onGetStarted) {
            HStack(spacing: Spacing.sm) {
                Text("welcome_get_started".localized)
                    .font(.system(size: 17, weight: .semibold))
                Image(systemName: "arrow.right.circle.fill")
                    .font(.system(size: 19))
            }
            .foregroundColor(Color.appWelcomeGradientStart)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(Color.white)
            .cornerRadius(CornerRadius.xl)
            .shadow(color: Color.black.opacity(0.25), radius: 18, y: 8)
        }
        .accessibilityLabel("welcome_get_started".localized)
    }

    private var legalFooter: some View {
        Text("login_legal_footer".localized)
            .font(.system(size: 11))
            .foregroundColor(.white.opacity(0.42))
            .multilineTextAlignment(.center)
            .padding(.horizontal, Spacing.md)
    }
}

#Preview {
    WelcomeView(onGetStarted: {})
        .environmentObject(LocalizationManager.shared)
}

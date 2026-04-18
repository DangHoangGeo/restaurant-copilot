import SwiftUI

struct AuthLanguageButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: "globe")
                    .font(.system(size: 13, weight: .medium))

                Text(title)
                    .font(.monoLabel)
            }
            .foregroundColor(.appTextPrimary)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(Color.appSurfaceSecondary)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .stroke(Color.appBorderLight, lineWidth: 1)
            )
            .cornerRadius(CornerRadius.lg)
        }
        .buttonStyle(.plain)
    }
}

struct AuthHeroCluster: View {
    enum Variant: Equatable {
        case welcome
        case signIn

        var height: CGFloat {
            switch self {
            case .welcome:
                return 220
            case .signIn:
                return 150
            }
        }

        var titleFont: Font {
            switch self {
            case .welcome:
                return .heroTitle
            case .signIn:
                return .displayTitle
            }
        }

        var subtitleFont: Font {
            switch self {
            case .welcome:
                return .bodyLarge
            case .signIn:
                return .monoLabel
            }
        }

        var subtitleColor: Color {
            switch self {
            case .welcome:
                return .appTextSecondary
            case .signIn:
                return .appTextTertiary
            }
        }

        var iconScale: CGFloat {
            switch self {
            case .welcome:
                return 1.0
            case .signIn:
                return 0.88
            }
        }
    }

    let variant: Variant
    let subtitle: String

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { timeline in
            let time = timeline.date.timeIntervalSinceReferenceDate
            let primaryDrift = wave(time, speed: 0.72, amplitude: 10)
            let secondaryDrift = wave(time, speed: 0.96, amplitude: 12, phase: 1.6)
            let tertiaryDrift = wave(time, speed: 0.84, amplitude: 8, phase: 2.2)

            ZStack {
                Circle()
                    .fill(Color.appHeroGlow.opacity(0.9))
                    .frame(width: variant == .welcome ? 208 : 178, height: variant == .welcome ? 208 : 178)
                    .blur(radius: 36)

                Circle()
                    .fill(Color.appPrimary.opacity(0.11))
                    .frame(width: variant == .welcome ? 270 : 220, height: variant == .welcome ? 270 : 220)
                    .blur(radius: 54)

                floatingIcon(
                    icon: "fork.knife.circle.fill",
                    tint: .appWelcomeAccent,
                    size: 62 * variant.iconScale
                )
                .offset(x: -122, y: -34 + primaryDrift)

                floatingIcon(
                    icon: "bell.fill",
                    tint: .appPrimary,
                    size: 48 * variant.iconScale
                )
                .offset(x: 118, y: -24 + secondaryDrift)

                floatingIcon(
                    icon: "sparkles",
                    tint: .appHighlight,
                    size: 42 * variant.iconScale
                )
                .offset(x: -88, y: 60 + tertiaryDrift)

                floatingIcon(
                    icon: "checkmark",
                    tint: .appSuccess,
                    size: 44 * variant.iconScale
                )
                .offset(x: 94, y: 56 + primaryDrift)

                VStack(spacing: variant == .welcome ? Spacing.sm : 6) {
                    Text("app_name".localized)
                        .font(variant.titleFont)
                        .foregroundColor(.appWelcomeOnDark)
                        .multilineTextAlignment(.center)
                        .minimumScaleFactor(0.8)

                    Text(subtitle)
                        .font(variant.subtitleFont)
                        .kerning(variant == .signIn ? 2 : 0)
                        .foregroundColor(variant.subtitleColor)
                        .multilineTextAlignment(.center)
                }
                .padding(.horizontal, variant == .welcome ? 56 : 44)
            }
            .frame(maxWidth: .infinity)
            .frame(height: variant.height)
        }
    }

    private func floatingIcon(icon: String, tint: Color, size: CGFloat) -> some View {
        Image(systemName: icon)
            .font(.system(size: size * 0.42, weight: .semibold))
            .foregroundColor(tint)
            .frame(width: size, height: size)
            .background(
                Circle()
                    .fill(Color.appSurface.opacity(0.78))
                    .overlay(
                        Circle()
                            .stroke(Color.appBorderLight, lineWidth: 1)
                    )
            )
            .shadow(color: tint.opacity(0.18), radius: 16, y: 6)
    }
}

private func wave(_ time: TimeInterval, speed: Double, amplitude: Double, phase: Double = 0) -> CGFloat {
    CGFloat(sin((time * speed) + phase) * amplitude)
}

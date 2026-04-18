import SwiftUI
import UIKit

public extension Color {
    static let appPrimary = Color("iappPrimary")
    static let appSecondaryText = Color("iappSecondaryText")
    static let appAccent = Color("iappAccent")

    static let appBackground = Color("iappBackground")
    static let appSurface = Color("iappSurface")
    static let appSurfaceSecondary = Color(red: 0.135, green: 0.103, blue: 0.075)
    static let appSurfaceElevated = Color(red: 0.170, green: 0.132, blue: 0.095)

    static let appError = Color("iappError")
    static let appSuccess = Color("iappSuccess")
    static let appWarning = Color("iappWarning")
    static let appInfo = Color("iappInfo")

    static let appSuccessLight = Color.appSuccess.opacity(0.18)
    static let appWarningLight = Color.appWarning.opacity(0.18)
    static let appErrorLight = Color.appError.opacity(0.16)
    static let appInfoLight = Color.appInfo.opacity(0.18)

    static let appDisabled = Color("iappDisabled")
    static let appBorder = Color("iappBorder")
    static let appBorderLight = Color.appBorder.opacity(0.7)
    static let appTextPrimary = Color("iappTextPrimary")
    static let appTextSecondary = Color("iappTextSecondary")
    static let appTextTertiary = Color(red: 0.55, green: 0.49, blue: 0.43)

    static let appHoverOverlay = Color.white.opacity(0.05)
    static let appPressedOverlay = Color.black.opacity(0.2)
    static let appFocusRing = Color.appHighlight.opacity(0.3)

    static let appWelcomeGradientStart = Color(red: 0.056, green: 0.040, blue: 0.030)
    static let appWelcomeGradientMid = Color(red: 0.095, green: 0.068, blue: 0.047)
    static let appWelcomeGradientEnd = Color(red: 0.115, green: 0.082, blue: 0.056)
    static let appWelcomeAccent = Color(red: 0.306, green: 0.850, blue: 0.620)
    static let appWelcomeOnDark = Color(red: 0.945, green: 0.906, blue: 0.855)

    static let appHighlight = Color(red: 0.935, green: 0.886, blue: 0.795)
    static let appHighlightSoft = Color(red: 0.780, green: 0.692, blue: 0.563)
    static let appOnHighlight = Color(red: 0.145, green: 0.102, blue: 0.072)
    static let appHeroGlow = Color(red: 0.294, green: 0.784, blue: 0.580).opacity(0.15)
}

public extension Font {
    static let displayTitle = Font.system(size: 40, weight: .medium, design: .serif)
    static let heroTitle = Font.system(size: 52, weight: .medium, design: .serif)
    static let cardTitle = Font.system(size: 30, weight: .medium, design: .serif)
    static let sectionHeader = Font.system(size: 16, weight: .semibold, design: .default)
    static let monoLabel = Font.system(size: 13, weight: .medium, design: .monospaced)
    static let monoCaption = Font.system(size: 12, weight: .regular, design: .monospaced)
    static let metricValue = Font.system(size: 28, weight: .semibold, design: .rounded)

    static let bodyLarge = Font.system(size: 17, weight: .regular, design: .default)
    static let bodyMedium = Font.system(size: 15, weight: .regular, design: .default)
    static let bodyRegular = Font.system(size: 16, weight: .regular, design: .default)

    static let captionBold = Font.system(size: 12, weight: .semibold, design: .monospaced)
    static let captionRegular = Font.system(size: 13, weight: .regular, design: .default)
    static let footnote = Font.system(size: 12, weight: .regular, design: .default)

    static let buttonLarge = Font.system(size: 15, weight: .semibold, design: .monospaced)
    static let buttonMedium = Font.system(size: 13, weight: .semibold, design: .monospaced)
    static let buttonSmall = Font.system(size: 12, weight: .medium, design: .monospaced)
}

public struct Spacing {
    public static let xxs: CGFloat = 2
    public static let xs: CGFloat = 4
    public static let sm: CGFloat = 8
    public static let md: CGFloat = 16
    public static let lg: CGFloat = 24
    public static let xl: CGFloat = 32
    public static let xxl: CGFloat = 40
}

public struct CornerRadius {
    public static let xs: CGFloat = 6
    public static let sm: CGFloat = 10
    public static let md: CGFloat = 16
    public static let lg: CGFloat = 22
    public static let xl: CGFloat = 28
}

public struct Motion {
    public static let fast: Double = 0.12
    public static let medium: Double = 0.28
}

public struct Elevation {
    public static let none = (color: Color.clear, radius: CGFloat(0), y: CGFloat(0))
    public static let level1 = (color: Color.black.opacity(0.16), radius: CGFloat(10), y: CGFloat(4))
    public static let level2 = (color: Color.black.opacity(0.22), radius: CGFloat(18), y: CGFloat(8))
    public static let level3 = (color: Color.black.opacity(0.28), radius: CGFloat(24), y: CGFloat(12))
    public static let level4 = (color: Color.black.opacity(0.35), radius: CGFloat(32), y: CGFloat(18))

    public static let buttonPressed = (color: Color.black.opacity(0.12), radius: CGFloat(6), y: CGFloat(2))
    public static let cardHover = (color: Color.black.opacity(0.24), radius: CGFloat(22), y: CGFloat(12))
}

enum AppAppearance {
    static func configure() {
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithOpaqueBackground()
        tabAppearance.backgroundColor = UIColor(red: 0.075, green: 0.056, blue: 0.039, alpha: 1.0)
        tabAppearance.shadowColor = UIColor(red: 0.235, green: 0.180, blue: 0.140, alpha: 1.0)

        let selected = UIColor(red: 0.933, green: 0.886, blue: 0.796, alpha: 1.0)
        let normal = UIColor(red: 0.700, green: 0.646, blue: 0.582, alpha: 1.0)
        let stacked = tabAppearance.stackedLayoutAppearance
        let inline = tabAppearance.inlineLayoutAppearance
        let compact = tabAppearance.compactInlineLayoutAppearance

        stacked.normal.iconColor = normal
        stacked.normal.titleTextAttributes = [
            .foregroundColor: normal,
            .font: UIFont.monospacedSystemFont(ofSize: 11, weight: .medium)
        ]
        stacked.selected.iconColor = selected
        stacked.selected.titleTextAttributes = [
            .foregroundColor: selected,
            .font: UIFont.monospacedSystemFont(ofSize: 11, weight: .medium)
        ]

        inline.normal.iconColor = normal
        inline.normal.titleTextAttributes = [
            .foregroundColor: normal,
            .font: UIFont.monospacedSystemFont(ofSize: 11, weight: .medium)
        ]
        inline.selected.iconColor = selected
        inline.selected.titleTextAttributes = [
            .foregroundColor: selected,
            .font: UIFont.monospacedSystemFont(ofSize: 11, weight: .medium)
        ]

        compact.normal.iconColor = normal
        compact.normal.titleTextAttributes = [
            .foregroundColor: normal,
            .font: UIFont.monospacedSystemFont(ofSize: 11, weight: .medium)
        ]
        compact.selected.iconColor = selected
        compact.selected.titleTextAttributes = [
            .foregroundColor: selected,
            .font: UIFont.monospacedSystemFont(ofSize: 11, weight: .medium)
        ]

        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
        UITabBar.appearance().unselectedItemTintColor = normal

        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithOpaqueBackground()
        navAppearance.backgroundColor = UIColor(red: 0.075, green: 0.056, blue: 0.039, alpha: 1.0)
        navAppearance.shadowColor = UIColor(red: 0.235, green: 0.180, blue: 0.140, alpha: 1.0)
        navAppearance.titleTextAttributes = [
            .foregroundColor: UIColor(red: 0.945, green: 0.906, blue: 0.855, alpha: 1.0),
            .font: UIFont.monospacedSystemFont(ofSize: 14, weight: .medium)
        ]
        navAppearance.largeTitleTextAttributes = [
            .foregroundColor: UIColor(red: 0.945, green: 0.906, blue: 0.855, alpha: 1.0),
            .font: UIFont.systemFont(ofSize: 32, weight: .medium)
        ]

        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().compactAppearance = navAppearance
        UINavigationBar.appearance().tintColor = selected
    }
}

public struct AppScreenBackground: View {
    public init() {}

    public var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    Color.appWelcomeGradientStart,
                    Color.appBackground,
                    Color.appWelcomeGradientMid
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            RadialGradient(
                colors: [Color.appHeroGlow, Color.clear],
                center: .topTrailing,
                startRadius: 20,
                endRadius: 280
            )

            RadialGradient(
                colors: [Color.appPrimary.opacity(0.15), Color.clear],
                center: .bottomLeading,
                startRadius: 40,
                endRadius: 360
            )
        }
        .ignoresSafeArea()
    }
}

public struct AppSectionEyebrow: View {
    private let text: String

    public init(_ text: String) {
        self.text = text
    }

    public var body: some View {
        HStack(spacing: Spacing.sm) {
            Circle()
                .fill(Color.appWelcomeAccent)
                .frame(width: 8, height: 8)
                .shadow(color: Color.appWelcomeAccent.opacity(0.5), radius: 10, y: 0)

            Text(text.uppercased())
                .font(.monoLabel)
                .kerning(2.2)
                .foregroundColor(.appTextSecondary)
        }
    }
}

public struct AppHeaderPill: View {
    private let text: String
    private let tint: Color
    private let fill: Color

    public init(_ text: String, tint: Color = .appWelcomeAccent, fill: Color = .appSurfaceSecondary) {
        self.text = text
        self.tint = tint
        self.fill = fill
    }

    public var body: some View {
        HStack(spacing: Spacing.sm) {
            Circle()
                .fill(tint)
                .frame(width: 10, height: 10)
                .shadow(color: tint.opacity(0.4), radius: 8, y: 0)

            Text(text)
                .font(.monoLabel)
                .foregroundColor(.appTextPrimary)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .fill(fill)
                .overlay(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .stroke(Color.appBorderLight, lineWidth: 1)
                )
        )
    }
}

public struct AppMetricCard: View {
    private let title: String
    private let value: String
    private let tint: Color

    public init(title: String, value: String, tint: Color = .appTextPrimary) {
        self.title = title
        self.value = value
        self.tint = tint
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text(title.uppercased())
                .font(.monoLabel)
                .foregroundColor(.appTextSecondary)
                .kerning(1.8)

            Text(value)
                .font(.metricValue)
                .foregroundColor(tint)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .frame(minHeight: 92, alignment: .topLeading)
        .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.lg)
    }
}

public struct PrimaryButtonStyle: ButtonStyle {
    public let isEnabled: Bool

    public init(isEnabled: Bool = true) {
        self.isEnabled = isEnabled
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.buttonLarge)
            .tracking(0.8)
            .foregroundColor(isEnabled ? .appOnHighlight : .appTextTertiary)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(isEnabled ? Color.appHighlight : Color.appDisabled)
                    .shadow(
                        color: buttonShadow(configuration: configuration).color,
                        radius: buttonShadow(configuration: configuration).radius,
                        y: buttonShadow(configuration: configuration).y
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .stroke(Color.white.opacity(isEnabled ? 0.12 : 0), lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .animation(.easeInOut(duration: Motion.fast), value: configuration.isPressed)
            .disabled(!isEnabled)
    }

    private func buttonShadow(configuration: Configuration) -> (color: Color, radius: CGFloat, y: CGFloat) {
        if !isEnabled {
            return (.clear, 0, 0)
        }

        if configuration.isPressed {
            return Elevation.buttonPressed
        }

        return (Color.appHighlight.opacity(0.14), 14, 8)
    }
}

public struct SecondaryButtonStyle: ButtonStyle {
    public let isEnabled: Bool

    public init(isEnabled: Bool = true) {
        self.isEnabled = isEnabled
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.buttonLarge)
            .tracking(0.8)
            .foregroundColor(isEnabled ? Color.appTextPrimary : Color.appTextTertiary)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(configuration.isPressed ? Color.appSurfaceElevated : Color.appSurfaceSecondary)
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .stroke(isEnabled ? Color.appBorderLight : Color.appDisabled, lineWidth: 1)
            )
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .animation(.easeInOut(duration: Motion.fast), value: configuration.isPressed)
            .disabled(!isEnabled)
    }
}

public struct SmallButtonStyle: ButtonStyle {
    public let isEnabled: Bool

    public init(isEnabled: Bool = true) {
        self.isEnabled = isEnabled
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.buttonSmall)
            .tracking(0.6)
            .foregroundColor(isEnabled ? .appTextPrimary : .appTextTertiary)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(
                Capsule()
                    .fill(isEnabled ? Color.appSurfaceElevated : Color.appDisabled)
                    .overlay(
                        Capsule()
                            .stroke(Color.appBorderLight, lineWidth: 1)
                    )
            )
            .opacity(configuration.isPressed ? 0.8 : 1)
            .scaleEffect(configuration.isPressed ? 0.96 : 1)
            .animation(.easeInOut(duration: Motion.fast), value: configuration.isPressed)
    }
}

public struct DestructiveButtonStyle: ButtonStyle {
    public let isEnabled: Bool

    public init(isEnabled: Bool = true) {
        self.isEnabled = isEnabled
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.buttonLarge)
            .tracking(0.8)
            .foregroundColor(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(isEnabled ? Color.appError : Color.appDisabled)
            )
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .animation(.easeInOut(duration: Motion.fast), value: configuration.isPressed)
    }
}

public struct IconButtonStyle: ButtonStyle {
    public init() {}

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.title3)
            .foregroundColor(.appTextPrimary)
            .frame(width: 44, height: 44)
            .background(
                Circle()
                    .fill(configuration.isPressed ? Color.appSurfaceElevated : Color.appSurfaceSecondary)
            )
            .overlay(
                Circle()
                    .stroke(Color.appBorderLight, lineWidth: 1)
            )
    }
}

public struct AppTextFieldStyle: TextFieldStyle {
    public let isError: Bool

    public init(isError: Bool = false) {
        self.isError = isError
    }

    public func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(.bodyRegular)
            .foregroundColor(.appTextPrimary)
            .padding(Spacing.md)
            .background(Color.appSurfaceSecondary)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(isError ? Color.appError : Color.appBorderLight, lineWidth: 1)
            )
    }
}

public struct CardStyle: ViewModifier {
    public let padding: CGFloat
    public let cornerRadius: CGFloat
    public let elevation: (color: Color, radius: CGFloat, y: CGFloat)
    public let surfaceColor: Color

    public init(
        padding: CGFloat = Spacing.md,
        cornerRadius: CGFloat = CornerRadius.md,
        elevation: (color: Color, radius: CGFloat, y: CGFloat) = Elevation.level1,
        surfaceColor: Color = .appSurface
    ) {
        self.padding = padding
        self.cornerRadius = cornerRadius
        self.elevation = elevation
        self.surfaceColor = surfaceColor
    }

    public func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(surfaceColor)
            .cornerRadius(cornerRadius)
            .shadow(color: elevation.color, radius: elevation.radius, x: 0, y: elevation.y)
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(Color.appBorderLight, lineWidth: 1)
            )
    }
}

public struct ElevatedCardStyle: ViewModifier {
    public let padding: CGFloat
    public let cornerRadius: CGFloat

    public init(padding: CGFloat = Spacing.md, cornerRadius: CGFloat = CornerRadius.md) {
        self.padding = padding
        self.cornerRadius = cornerRadius
    }

    public func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.appSurfaceElevated)
            .cornerRadius(cornerRadius)
            .shadow(color: Elevation.level2.color, radius: Elevation.level2.radius, x: 0, y: Elevation.level2.y)
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(Color.appBorderLight, lineWidth: 1)
            )
    }
}

public extension View {
    func cardStyle(
        padding: CGFloat = Spacing.md,
        cornerRadius: CGFloat = CornerRadius.md,
        elevation: (color: Color, radius: CGFloat, y: CGFloat) = Elevation.level1,
        surfaceColor: Color = .appSurface
    ) -> some View {
        modifier(CardStyle(padding: padding, cornerRadius: cornerRadius, elevation: elevation, surfaceColor: surfaceColor))
    }

    func elevatedCardStyle(padding: CGFloat = Spacing.md, cornerRadius: CGFloat = CornerRadius.md) -> some View {
        modifier(ElevatedCardStyle(padding: padding, cornerRadius: cornerRadius))
    }

    func appPanel(
        padding: CGFloat = Spacing.md,
        cornerRadius: CGFloat = CornerRadius.md,
        surfaceColor: Color = .appSurface
    ) -> some View {
        modifier(CardStyle(padding: padding, cornerRadius: cornerRadius, elevation: Elevation.level1, surfaceColor: surfaceColor))
    }
}

public struct StatusChipStyle: ViewModifier {
    public let status: StatusChipStatus
    public let showIcon: Bool

    public init(status: StatusChipStatus, showIcon: Bool = true) {
        self.status = status
        self.showIcon = showIcon
    }

    public func body(content: Content) -> some View {
        HStack(spacing: Spacing.xs) {
            if showIcon {
                Image(systemName: status.iconName)
                    .font(.captionRegular)
            }
            content
        }
        .font(.captionBold)
        .foregroundColor(status.color)
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xs)
        .background(
            Capsule()
                .fill(status.color.opacity(0.16))
        )
        .overlay(
            Capsule()
                .stroke(status.color.opacity(0.25), lineWidth: 1)
        )
    }
}

public enum StatusChipStatus {
    case success, warning, error, neutral, info

    var color: Color {
        switch self {
        case .success:
            return .appSuccess
        case .warning:
            return .appWarning
        case .error:
            return .appError
        case .neutral:
            return .appTextSecondary
        case .info:
            return .appInfo
        }
    }

    var iconName: String {
        switch self {
        case .success:
            return "checkmark.circle.fill"
        case .warning:
            return "exclamationmark.triangle.fill"
        case .error:
            return "xmark.circle.fill"
        case .neutral:
            return "circle.fill"
        case .info:
            return "info.circle.fill"
        }
    }
}

public extension View {
    func statusChipStyle(status: StatusChipStatus, showIcon: Bool = true) -> some View {
        modifier(StatusChipStyle(status: status, showIcon: showIcon))
    }
}

public struct QuickActionButtonStyle: ViewModifier {
    public let style: ButtonStyle
    public let isEnabled: Bool

    public enum ButtonStyle {
        case filled, outlined
    }

    public init(style: ButtonStyle, isEnabled: Bool = true) {
        self.style = style
        self.isEnabled = isEnabled
    }

    public func body(content: Content) -> some View {
        content
            .font(.buttonMedium)
            .foregroundColor(foregroundColor)
            .padding(.vertical, Spacing.md)
            .padding(.horizontal, Spacing.lg)
            .background(backgroundColor)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(strokeColor, lineWidth: strokeWidth)
            )
            .cornerRadius(CornerRadius.md)
            .opacity(isEnabled ? 1 : 0.6)
    }

    private var foregroundColor: Color {
        switch style {
        case .filled:
            return .appOnHighlight
        case .outlined:
            return isEnabled ? .appTextPrimary : .appTextTertiary
        }
    }

    private var backgroundColor: Color {
        switch style {
        case .filled:
            return isEnabled ? .appHighlight : .appDisabled
        case .outlined:
            return .clear
        }
    }

    private var strokeColor: Color {
        switch style {
        case .filled:
            return .clear
        case .outlined:
            return isEnabled ? .appBorderLight : .appDisabled
        }
    }

    private var strokeWidth: CGFloat {
        switch style {
        case .filled:
            return 0
        case .outlined:
            return 1
        }
    }
}

public extension View {
    func quickActionButtonStyle(_ style: QuickActionButtonStyle.ButtonStyle, isEnabled: Bool = true) -> some View {
        modifier(QuickActionButtonStyle(style: style, isEnabled: isEnabled))
    }
}

public struct StatCard: View {
    public let title: String
    public let value: String
    public let delta: String?
    public let icon: String
    public let color: Color

    public init(title: String, value: String, delta: String? = nil, icon: String, color: Color = .appPrimary) {
        self.title = title
        self.value = value
        self.delta = delta
        self.icon = icon
        self.color = color
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundColor(color)

                Spacer()

                if let delta = delta {
                    Text(delta)
                        .font(.captionRegular)
                        .foregroundColor(.appTextSecondary)
                        .padding(.horizontal, Spacing.xs)
                        .padding(.vertical, 2)
                        .background(Color.appSurfaceSecondary)
                        .cornerRadius(CornerRadius.xs)
                }
            }

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(value)
                    .font(.metricValue)
                    .foregroundColor(.appTextPrimary)

                Text(title)
                    .font(.bodyMedium)
                    .foregroundColor(.appTextSecondary)
                    .lineLimit(1)
            }
        }
        .cardStyle()
    }
}

public struct FilterChipStyle: ViewModifier {
    public let isSelected: Bool
    public let color: Color

    public init(isSelected: Bool, color: Color = Color.appPrimary) {
        self.isSelected = isSelected
        self.color = color
    }

    public func body(content: Content) -> some View {
        content
            .font(.captionBold)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .fill(isSelected ? Color.appHighlight : Color.appSurfaceSecondary)
            )
            .foregroundColor(isSelected ? Color.appOnHighlight : color)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.lg)
                    .stroke(isSelected ? Color.clear : Color.appBorderLight, lineWidth: 1)
            )
    }
}

public extension View {
    func filterChipStyle(isSelected: Bool, color: Color = Color.appPrimary) -> some View {
        modifier(FilterChipStyle(isSelected: isSelected, color: color))
    }
}

public struct StatusBadgeStyle: ViewModifier {
    let status: OrderStatus

    init(status: OrderStatus) {
        self.status = status
    }

    public func body(content: Content) -> some View {
        content
            .font(.captionBold)
            .foregroundColor(statusTextColor)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .fill(statusColor.opacity(0.16))
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .stroke(statusColor.opacity(0.25), lineWidth: 1)
            )
    }

    private var statusColor: Color {
        switch status {
        case .draft:
            return Color.appTextSecondary
        case .new:
            return Color.appInfo
        case .serving:
            return Color.appSuccess
        case .completed:
            return Color.appSuccess
        case .canceled:
            return Color.appError
        }
    }

    private var statusTextColor: Color {
        switch status {
        case .completed:
            return Color.appSuccess
        default:
            return statusColor
        }
    }
}

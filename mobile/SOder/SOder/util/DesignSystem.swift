import SwiftUI

public extension Color {
    // Primary Colors - More sophisticated enterprise palette
    static let appPrimary = Color("iappPrimary")           // #1B4F72 - Keep primary for consistency
    static let appSecondaryText = Color("iappSecondaryText") // #2C3E50
    static let appAccent = Color("iappAccent")             // #117A65
    
    // Background Colors - Enhanced depth and contrast
    static let appBackground = Color("iappBackground")     // #F8F9FA - Lighter, more neutral
    static let appSurface = Color("iappSurface")          // #FFFFFF
    static let appSurfaceSecondary = Color(red: 0.97, green: 0.98, blue: 0.99) // #F7F8F9 - Subtle secondary surface
    static let appSurfaceElevated = Color.white           // For cards that need more elevation
    
    // Status Colors - More vibrant and meaningful
    static let appError = Color("iappError")              // #C0392B
    static let appSuccess = Color("iappSuccess")          // #1E8449
    static let appWarning = Color("iappWarning")          // #D68910
    static let appInfo = Color("iappInfo")               // #2874A6
    
    // Enhanced Status Colors for better hierarchy
    static let appSuccessLight = Color(red: 0.92, green: 0.99, blue: 0.94)  // Light green background
    static let appWarningLight = Color(red: 1.0, green: 0.98, blue: 0.88)   // Light orange background
    static let appErrorLight = Color(red: 1.0, green: 0.93, blue: 0.93)     // Light red background
    static let appInfoLight = Color(red: 0.91, green: 0.96, blue: 1.0)      // Light blue background
    
    // Neutral Colors - Better contrast and hierarchy
    static let appDisabled = Color("iappDisabled")        // Light grey - #D1D1D6
    static let appBorder = Color("iappBorder")           // #D5DBDB
    static let appBorderLight = Color(red: 0.91, green: 0.93, blue: 0.94)   // Lighter border for subtle separations
    static let appTextPrimary = Color("iappTextPrimary")  // Primary text - #17202A
    static let appTextSecondary = Color("iappTextSecondary") // Secondary text - #566573
    static let appTextTertiary = Color(red: 0.47, green: 0.54, blue: 0.61)  // Tertiary text for less important info
    
    // Interactive States
    static let appHoverOverlay = Color.black.opacity(0.05)     // For hover effects
    static let appPressedOverlay = Color.black.opacity(0.1)    // For pressed states
    static let appFocusRing = Color.appPrimary.opacity(0.3)    // For focus indicators

    // Welcome Screen - deep dark gradient for branded onboarding
    static let appWelcomeGradientStart = Color(red: 0.055, green: 0.130, blue: 0.220) // #0E2138 deep navy
    static let appWelcomeGradientMid   = Color(red: 0.075, green: 0.175, blue: 0.305) // #132C4E navy
    static let appWelcomeGradientEnd   = Color(red: 0.040, green: 0.240, blue: 0.210) // #0A3D35 deep teal
    static let appWelcomeAccent        = Color(red: 0.298, green: 0.851, blue: 0.749) // #4CD9BF mint highlight
    static let appWelcomeOnDark        = Color.white.opacity(0.85)                     // Text on dark bg
}
// MARK: - Typography
public extension Font {
    static let displayTitle   = Font.largeTitle.weight(.bold)
    static let cardTitle      = Font.title2.weight(.bold)
    static let sectionHeader  = Font.headline.weight(.semibold)

    static let bodyLarge      = Font.body
    static let bodyMedium     = Font.subheadline
    static let bodyRegular    = Font.body

    static let captionBold    = Font.caption.weight(.bold)
    static let captionRegular = Font.caption
    static let footnote       = Font.footnote

    static let buttonLarge    = Font.body.weight(.semibold)
    static let buttonMedium   = Font.subheadline.weight(.medium)
    static let buttonSmall    = Font.caption.weight(.medium)
}

// MARK: - Spacing
public struct Spacing {
    public static let xxs: CGFloat = 2
    public static let xs:  CGFloat = 4
    public static let sm:  CGFloat = 8
    public static let md:  CGFloat = 16
    public static let lg:  CGFloat = 24
    public static let xl:  CGFloat = 32
    public static let xxl: CGFloat = 40
}

// MARK: - Corner Radius
public struct CornerRadius {
    public static let xs: CGFloat = 4
    public static let sm: CGFloat = 8
    public static let md: CGFloat = 12
    public static let lg: CGFloat = 16
    public static let xl: CGFloat = 24
}

// MARK: - Motion & Elevation
public struct Motion {
    public static let fast: Double   = 0.1
    public static let medium: Double = 0.3
}

public struct Elevation {
    // Enhanced shadow system for better depth perception
    public static let none = (color: Color.clear, radius: CGFloat(0.0), y: CGFloat(0.0))
    public static let level1 = (color: Color.black.opacity(0.04), radius: CGFloat(2.0), y: CGFloat(1.0))   // Subtle card elevation
    public static let level2 = (color: Color.black.opacity(0.08), radius: CGFloat(4.0), y: CGFloat(2.0))   // Standard card elevation
    public static let level3 = (color: Color.black.opacity(0.12), radius: CGFloat(8.0), y: CGFloat(4.0))   // Modal/elevated content
    public static let level4 = (color: Color.black.opacity(0.16), radius: CGFloat(16.0), y: CGFloat(8.0))  // High elevation (tooltips, etc.)
    
    // Specialized shadows
    public static let buttonPressed = (color: Color.black.opacity(0.02), radius: CGFloat(1.0), y: CGFloat(0.5))
    public static let cardHover = (color: Color.black.opacity(0.1), radius: CGFloat(6.0), y: CGFloat(3.0))
}

// MARK: - Enhanced Button Styles
public struct PrimaryButtonStyle: ButtonStyle {
    public let isEnabled: Bool
    public init(isEnabled: Bool = true) { self.isEnabled = isEnabled }
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.buttonLarge)
            .foregroundColor(isEnabled ? .white : .appTextSecondary)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(isEnabled ? Color.appPrimary : Color.appDisabled)
                    .shadow(
                        color: configuration.isPressed ? Elevation.buttonPressed.color : Elevation.level1.color,
                        radius: configuration.isPressed ? Elevation.buttonPressed.radius : Elevation.level1.radius,
                        y: configuration.isPressed ? Elevation.buttonPressed.y : Elevation.level1.y
                    )
            )
            .overlay(
                // Add subtle gradient for depth
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(
                        LinearGradient(
                            gradient: Gradient(colors: [
                                Color.white.opacity(configuration.isPressed ? 0 : 0.1),
                                Color.clear
                            ]),
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: Motion.fast), value: configuration.isPressed)
            .disabled(!isEnabled)
    }
}

public struct SecondaryButtonStyle: ButtonStyle {
    public let isEnabled: Bool
    public init(isEnabled: Bool = true) { self.isEnabled = isEnabled }
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.buttonLarge)
            .foregroundColor(isEnabled ? Color.appPrimary : Color.appDisabled)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(configuration.isPressed ? Color.appPrimary.opacity(0.05) : Color.appSurface)
                    .shadow(
                        color: Elevation.level1.color,
                        radius: Elevation.level1.radius,
                        y: Elevation.level1.y
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(isEnabled ? Color.appPrimary : Color.appDisabled, lineWidth: 1.5)
            )
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: Motion.fast), value: configuration.isPressed)
            .disabled(!isEnabled)
    }
}

public struct SmallButtonStyle: ButtonStyle {
    public let isEnabled: Bool
    public init(isEnabled: Bool = true) { self.isEnabled = isEnabled }
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.buttonSmall)
            .foregroundColor(.appSurface)
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .fill(isEnabled ? Color.appPrimary : Color.appDisabled)
            )
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: Motion.fast), value: configuration.isPressed)
    }
}

public struct DestructiveButtonStyle: ButtonStyle {
    public let isEnabled: Bool
    public init(isEnabled: Bool = true) { self.isEnabled = isEnabled }
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.buttonLarge)
            .foregroundColor(.appSurface)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .fill(isEnabled ? Color.appError : Color.appDisabled)
            )
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: Motion.fast), value: configuration.isPressed)
    }
}

public struct IconButtonStyle: ButtonStyle {
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.title2)
            .foregroundColor(.appPrimary)
            .frame(width: 44, height: 44)
            .background(Color.appPrimary.opacity(configuration.isPressed ? 0.2 : 0))
            .clipShape(Circle())
    }
}

// MARK: - TextField Style
public struct AppTextFieldStyle: TextFieldStyle {
    public let isError: Bool
    public init(isError: Bool = false) { self.isError = isError }
    public func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .font(.bodyRegular)
            .padding(Spacing.md)
            .background(Color.appSurface)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .stroke(isError ? Color.appError : Color.appBorder, lineWidth: 1)
            )
    }
}

// MARK: - Enhanced Card Styles
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
                // Add subtle border for better definition
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(Color.appBorderLight, lineWidth: 0.5)
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
                    .stroke(Color.appBorderLight, lineWidth: 0.5)
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
}

// MARK: - Status Chip Style
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
        .foregroundColor(.appSurface)
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xs)
        .background(
            RoundedRectangle(cornerRadius: CornerRadius.md)
                .fill(status.color)
        )
    }
}

public enum StatusChipStatus {
    case success, warning, error, neutral, info
    
    var color: Color {
        switch self {
        case .success: return .appSuccess
        case .warning: return .appWarning
        case .error: return .appError
        case .neutral: return .appTextSecondary
        case .info: return .appInfo
        }
    }
    
    var iconName: String {
        switch self {
        case .success: return "checkmark.circle.fill"
        case .warning: return "exclamationmark.triangle.fill"
        case .error: return "xmark.circle.fill"
        case .neutral: return "circle.fill"
        case .info: return "info.circle.fill"
        }
    }
}

public extension View {
    func statusChipStyle(status: StatusChipStatus, showIcon: Bool = true) -> some View {
        modifier(StatusChipStyle(status: status, showIcon: showIcon))
    }
}

// MARK: - Quick Action Button Style
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
            .opacity(isEnabled ? 1.0 : 0.6)
    }
    
    private var foregroundColor: Color {
        switch style {
        case .filled: return .appSurface
        case .outlined: return isEnabled ? .appPrimary : .appDisabled
        }
    }
    
    private var backgroundColor: Color {
        switch style {
        case .filled: return isEnabled ? .appPrimary : .appDisabled
        case .outlined: return .clear
        }
    }
    
    private var strokeColor: Color {
        switch style {
        case .filled: return .clear
        case .outlined: return isEnabled ? .appPrimary : .appDisabled
        }
    }
    
    private var strokeWidth: CGFloat {
        switch style {
        case .filled: return 0
        case .outlined: return 2
        }
    }
}

public extension View {
    func quickActionButtonStyle(_ style: QuickActionButtonStyle.ButtonStyle, isEnabled: Bool = true) -> some View {
        modifier(QuickActionButtonStyle(style: style, isEnabled: isEnabled))
    }
}

// MARK: - Stat Card Style
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
                        .background(Color.appBackground)
                        .cornerRadius(CornerRadius.xs)
                }
            }
            
            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text(value)
                    .font(.cardTitle)
                    .fontWeight(.bold)
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

// MARK: - Filter Chip Style
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
                    .fill(isSelected ? color : color.opacity(0.1))
            )
            .foregroundColor(isSelected ? Color.appSurface : color)
    }
}

public extension View {
    func filterChipStyle(isSelected: Bool, color: Color = Color.appPrimary) -> some View {
        modifier(FilterChipStyle(isSelected: isSelected, color: color))
    }
}

// MARK: - Status Badge Style
public struct StatusBadgeStyle: ViewModifier {
    let status: OrderStatus
    init(status: OrderStatus) { self.status = status }
    public func body(content: Content) -> some View {
        content
            .font(.captionBold)
            .foregroundColor(Color.appSurface)
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, 4)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .fill(statusColor)
            )
    }
    private var statusColor: Color {
        switch status {
        case .draft:     return Color.appTextSecondary
        case .new:       return Color.appInfo
        case .serving:   return Color.appSuccess // changed from appWarning to appSuccess
        case .completed: return Color.appSuccess
        case .canceled:  return Color.appError
        }
    }
}

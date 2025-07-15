import SwiftUI

public extension Color {
    // Primary Colors
    static let appPrimary = Color("iappPrimary")           // #1B4F72
    static let appSecondaryText = Color("iappSecondaryText") // #2C3E50
    static let appAccent = Color("iappAccent")             // #117A65
    
    // Background Colors
    static let appBackground = Color("iappBackground")     // #F4F6F7
    static let appSurface = Color("iappSurface")          // #FFFFFF
    
    // Status Colors
    static let appError = Color("iappError")              // #C0392B
    static let appSuccess = Color("iappSuccess")          // #1E8449
    static let appWarning = Color("iappWarning")          // #D68910
    static let appInfo = Color("iappInfo")               // #2874A6
    
    // Neutral Colors
    static let appDisabled = Color("iappDisabled")        // Light grey - #D1D1D6
    static let appBorder = Color("iappBorder")           // #D5DBDB
    static let appTextPrimary = Color("iappTextPrimary")  // Primary text - #17202A
    static let appTextSecondary = Color("iappTextSecondary") // Secondary text - #566573
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
}

// MARK: - Motion & Elevation
public struct Motion {
    public static let fast: Double   = 0.1
    public static let medium: Double = 0.3
}

public struct Elevation {
    public static let level1 = (color: Color.black.opacity(0.05), radius: 2.0, y: 1.0)
    public static let level2 = (color: Color.black.opacity(0.1),  radius: 4.0, y: 2.0)
}

// MARK: - Button Styles
public struct PrimaryButtonStyle: ButtonStyle {
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
                    .fill(isEnabled ? Color.appPrimary : Color.appDisabled)
            )
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: Motion.fast), value: configuration.isPressed)
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
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .fill(Color.appSurface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .stroke(isEnabled ? Color.appPrimary : Color.appDisabled, lineWidth: 2)
            )
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: Motion.fast), value: configuration.isPressed)
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

// MARK: - Card Style
public struct CardStyle: ViewModifier {
    public let padding: CGFloat
    public let cornerRadius: CGFloat
    public init(padding: CGFloat = Spacing.md, cornerRadius: CGFloat = CornerRadius.md) {
        self.padding = padding
        self.cornerRadius = cornerRadius
    }
    public func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Color.appSurface)
            .cornerRadius(cornerRadius)
            .shadow(color: Elevation.level1.color, radius: Elevation.level1.radius, x: 0, y: Elevation.level1.y)
    }
}

public extension View {
    func cardStyle(padding: CGFloat = Spacing.md, cornerRadius: CGFloat = CornerRadius.md) -> some View {
        modifier(CardStyle(padding: padding, cornerRadius: cornerRadius))
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
        case .serving:   return Color.appWarning
        case .completed: return Color.appSuccess
        case .canceled:  return Color.appError
        }
    }
}

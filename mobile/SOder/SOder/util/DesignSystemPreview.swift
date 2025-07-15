import SwiftUI

struct DesignSystemPreview: View {
    var body: some View {
        ScrollView {
            VStack(spacing: Spacing.lg) {
                // Header
                VStack(spacing: Spacing.md) {
                    Text("SOder Design System")
                        .font(.displayTitle)
                        .foregroundColor(.appTextPrimary)
                    
                    Text("Consistent UI components and styles")
                        .font(.bodyRegular)
                        .foregroundColor(.appTextSecondary)
                }
                
                // Colors Section
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Colors")
                        .font(.sectionHeader)
                        .foregroundColor(.appTextPrimary)
                    
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: Spacing.md) {
                        ColorSwatch(color: .appPrimary, name: "Primary")
                        ColorSwatch(color: .appAccent, name: "Accent")
                        ColorSwatch(color: .appSuccess, name: "Success")
                        ColorSwatch(color: .appWarning, name: "Warning")
                        ColorSwatch(color: .appError, name: "Error")
                        ColorSwatch(color: .appTextSecondary, name: "Secondary")
                    }
                }
                .cardStyle()
                
                // Typography Section
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Typography")
                        .font(.sectionHeader)
                        .foregroundColor(.appTextPrimary)
                    
                    VStack(alignment: .leading, spacing: Spacing.sm) {
                        Text("Display Title")
                            .font(.displayTitle)
                        Text("Card Title")
                            .font(.cardTitle)
                        Text("Section Header")
                            .font(.sectionHeader)
                        Text("Body Medium")
                            .font(.bodyMedium)
                        Text("Body Regular")
                            .font(.bodyRegular)
                        Text("Caption Bold")
                            .font(.captionBold)
                        Text("Caption Regular")
                            .font(.captionRegular)
                    }
                }
                .cardStyle()
                
                // Buttons Section
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Buttons")
                        .font(.sectionHeader)
                        .foregroundColor(.appTextPrimary)
                    
                    VStack(spacing: Spacing.md) {
                        Button("Primary Button") {}
                            .buttonStyle(PrimaryButtonStyle())
                        
                        Button("Secondary Button") {}
                            .buttonStyle(SecondaryButtonStyle())
                        
                        Button("Small Button") {}
                            .buttonStyle(SmallButtonStyle())
                        
                        Button("Destructive Button") {}
                            .buttonStyle(DestructiveButtonStyle())
                    }
                }
                .cardStyle()
                
                // Form Elements Section
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Form Elements")
                        .font(.sectionHeader)
                        .foregroundColor(.appTextPrimary)
                    
                    VStack(spacing: Spacing.md) {
                        TextField("Enter text...", text: .constant(""))
                            .textFieldStyle(AppTextFieldStyle())
                        
                        TextField("Error state", text: .constant(""))
                            .textFieldStyle(AppTextFieldStyle(isError: true))
                    }
                }
                .cardStyle()
                
                // Filter Chips Section
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Filter Chips")
                        .font(.sectionHeader)
                        .foregroundColor(.appTextPrimary)
                    
                    HStack(spacing: Spacing.sm) {
                        Button("Selected") {}
                            .filterChipStyle(isSelected: true)
                        
                        Button("Unselected") {}
                            .filterChipStyle(isSelected: false)
                        
                        Button("Warning") {}
                            .filterChipStyle(isSelected: true, color: .appWarning)
                    }
                }
                .cardStyle()
                
                // Status Badges Section
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Text("Status Badges")
                        .font(.sectionHeader)
                        .foregroundColor(.appTextPrimary)
                    
                    HStack(spacing: Spacing.sm) {
                        StatusBadge(status: "new")
                        StatusBadge(status: "serving")
                        StatusBadge(status: "completed")
                        StatusBadge(status: "canceled")
                    }
                }
                .cardStyle()
            }
            .padding(Spacing.lg)
        }
        .background(Color.appBackground)
    }
}

struct ColorSwatch: View {
    let color: Color
    let name: String
    
    var body: some View {
        VStack(spacing: Spacing.sm) {
            Rectangle()
                .fill(color)
                .frame(height: 60)
                .cornerRadius(8)
            
            Text(name)
                .font(.captionBold)
                .foregroundColor(.appTextPrimary)
        }
    }
}

#Preview {
    DesignSystemPreview()
}

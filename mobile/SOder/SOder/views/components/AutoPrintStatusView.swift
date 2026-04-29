import SwiftUI

struct AutoPrintStatusView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    let isEnabled: Bool
    let isActivePrinting: Bool
    let autoPrintStats: AutoPrintStats
    let lastResult: String?

    var body: some View {
        if isEnabled {
            HStack(spacing: Spacing.sm) {
                Circle()
                    .fill(isActivePrinting ? Color.appWarning : Color.appSuccess)
                    .frame(width: 8, height: 8)
                    .scaleEffect(isActivePrinting ? 1.2 : 1.0)
                    .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: isActivePrinting)

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    if isActivePrinting {
                        Text("status_auto_printing".localized)
                            .font(.captionRegular)
                            .fontWeight(.medium)
                            .foregroundColor(.appWarning)
                    } else {
                        Text("status_auto_print".localized)
                            .font(.captionRegular)
                            .fontWeight(.medium)
                            .foregroundColor(.appSuccess)
                    }

                    if let lastResult = lastResult {
                        Text(lastResult)
                            .font(.footnote)
                            .foregroundColor(.appTextSecondary)
                            .lineLimit(1)
                    } else if autoPrintStats.totalNewOrdersPrinted > 0 || autoPrintStats.totalReadyItemsPrinted > 0 {
                        Text(String(format: "status_auto_print_stats".localized,
                                    autoPrintStats.totalNewOrdersPrinted,
                                    autoPrintStats.totalReadyItemsPrinted))
                            .font(.footnote)
                            .foregroundColor(.appTextSecondary)
                    }
                }

                Image(systemName: "printer.fill")
                    .font(.captionRegular)
                    .foregroundColor(isActivePrinting ? .appWarning : .appSuccess)
            }
            .padding(.horizontal, Spacing.sm)
            .padding(.vertical, Spacing.xs)
            .background(Color.appSurface)
            .cornerRadius(CornerRadius.sm)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.sm)
                    .stroke(Color.appBorderLight, lineWidth: 1)
            )
        }
    }
}

#Preview {
    VStack(spacing: Spacing.md) {
        AutoPrintStatusView(
            isEnabled: true,
            isActivePrinting: false,
            autoPrintStats: AutoPrintStats(),
            lastResult: nil
        )
        AutoPrintStatusView(
            isEnabled: true,
            isActivePrinting: true,
            autoPrintStats: AutoPrintStats(),
            lastResult: "✅ Auto-printed for Table 5"
        )
        AutoPrintStatusView(
            isEnabled: true,
            isActivePrinting: false,
            autoPrintStats: {
                var stats = AutoPrintStats()
                stats.totalNewOrdersPrinted = 5
                stats.totalReadyItemsPrinted = 12
                return stats
            }(),
            lastResult: nil
        )
    }
    .padding()
    .environmentObject(LocalizationManager.shared)
}

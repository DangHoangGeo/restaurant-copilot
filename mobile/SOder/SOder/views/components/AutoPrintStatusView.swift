import SwiftUI

struct AutoPrintStatusView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    let isEnabled: Bool
    let isActivePrinting: Bool
    let autoPrintStats: AutoPrintStats
    let lastResult: String?
    
    var body: some View {
        if isEnabled {
            HStack(spacing: 8) {
                // Status indicator
                Circle()
                    .fill(isActivePrinting ? Color.orange : Color.green)
                    .frame(width: 8, height: 8)
                    .scaleEffect(isActivePrinting ? 1.2 : 1.0)
                    .animation(.easeInOut(duration: 0.5).repeatForever(autoreverses: true), value: isActivePrinting)
                
                VStack(alignment: .leading, spacing: 2) {
                    // Status text
                    if isActivePrinting {
                        Text("status_auto_printing".localized)
                        .font(.caption)
                        .foregroundColor(.orange)
                        .fontWeight(.medium)
                    } else {
                        Text("status_auto_print".localized)
                        .font(.caption)
                        .foregroundColor(.green)
                        .fontWeight(.medium)
                    }
                    
                    // Show last result or statistics
                    if let lastResult = lastResult {
                        Text(lastResult)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    } else if autoPrintStats.totalNewOrdersPrinted > 0 || autoPrintStats.totalReadyItemsPrinted > 0 {
                        Text(String(format: "status_auto_print_stats".localized, autoPrintStats.totalNewOrdersPrinted, autoPrintStats.totalReadyItemsPrinted))
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }
                
                // Printer icon
                Image(systemName: "printer.fill")
                    .font(.caption)
                    .foregroundColor(isActivePrinting ? .orange : .green)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(Color(.systemGray6))
            .cornerRadius(12)
        }
    }
}

#Preview {
    VStack(spacing: 16) {
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
}

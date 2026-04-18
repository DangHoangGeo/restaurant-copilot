import SwiftUI

struct PrinterLogsView: View {
    @EnvironmentObject private var printerManager: PrinterManager

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                headerSection

            if printerManager.printLogs.isEmpty {
                    ContentUnavailableView(
                        "printer_logs_empty_title".localized,
                        systemImage: "doc.text",
                        description: Text("printer_logs_empty_description".localized)
                    )
                    .frame(maxWidth: .infinity, minHeight: 280)
                    .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.xl, surfaceColor: Color.appSurface.opacity(0.96))
            } else {
                    VStack(alignment: .leading, spacing: Spacing.md) {
                        Text("printer_logs_recent_activity".localized)
                            .font(.sectionHeader)
                            .foregroundColor(.appTextPrimary)

                        ForEach(Array(reversedLogs.enumerated()), id: \.offset) { _, log in
                            PrinterLogRow(log: log)
                        }
                    }
                }
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.lg)
        .background(Color.appBackground.ignoresSafeArea())
        .navigationTitle("printer_logs_title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("printer_logs_clear".localized) {
                    printerManager.printLogs.removeAll()
                }
                .disabled(printerManager.printLogs.isEmpty)
            }
        }
    }

    private var reversedLogs: [String] {
        printerManager.printLogs.reversed()
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            AppSectionEyebrow("printer")

            Text("printer_logs_title".localized)
                .font(.heroTitle)
                .foregroundColor(.appTextPrimary)

            Text("printer_logs_subtitle".localized)
                .font(.bodyMedium)
                .foregroundColor(.appTextSecondary)
        }
    }
}

private struct PrinterLogRow: View {
    let log: String

    private var parts: (time: String?, message: String) {
        guard log.hasPrefix("["),
              let closingBracketIndex = log.firstIndex(of: "]") else {
            return (nil, log)
        }

        let time = String(log[log.index(after: log.startIndex)..<closingBracketIndex])
        let messageStart = log.index(after: closingBracketIndex)
        let rawMessage = log[messageStart...].trimmingCharacters(in: .whitespaces)
        return (time, rawMessage)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            if let time = parts.time {
                Text(time)
                    .font(.monoCaption)
                    .foregroundColor(.appTextSecondary)
            }

            Text(parts.message)
                .font(.bodyMedium)
                .foregroundColor(.appTextPrimary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.94))
    }
}

#Preview {
    NavigationView {
        PrinterLogsView()
            .environmentObject(PrinterManager.shared)
    }
}

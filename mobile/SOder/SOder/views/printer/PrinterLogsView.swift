import SwiftUI

struct PrinterLogsView: View {
    @EnvironmentObject private var printerManager: PrinterManager

    var body: some View {
        List {
            if printerManager.printLogs.isEmpty {
                ContentUnavailableView(
                    "printer_logs_empty_title".localized,
                    systemImage: "doc.text",
                    description: Text("printer_logs_empty_description".localized)
                )
            } else {
                ForEach(Array(printerManager.printLogs.enumerated()), id: \.offset) { index, log in
                    Text(log)
                        .font(.caption)
                        .foregroundColor(.appTextPrimary)
                        .padding(.vertical, 4)
                }
            }
        }
        .navigationTitle("printer_logs_title".localized)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("printer_logs_clear".localized) {
                    printerManager.printLogs.removeAll()
                }
                .disabled(printerManager.printLogs.isEmpty)
            }
        }
    }
}

#Preview {
    NavigationView {
        PrinterLogsView()
            .environmentObject(PrinterManager.shared)
    }
}

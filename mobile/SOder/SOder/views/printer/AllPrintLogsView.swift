
import SwiftUI

struct AllPrintLogsView: View {
    @ObservedObject var printerManager: PrinterManager
    @Environment(\.presentationMode) var presentationMode

    var body: some View {
        NavigationView {
            List {
                ForEach(printerManager.printLogs, id: \.self) { log in
                    Text(log)
                        .font(.caption)
                }
            }
            .navigationTitle("printer_print_logs_title".localized)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("printer_done_button".localized) {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
    }
}

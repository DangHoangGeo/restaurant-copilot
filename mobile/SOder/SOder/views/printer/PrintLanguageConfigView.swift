import SwiftUI

struct PrintLanguageConfigView: View {
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            content
                .navigationTitle("print_language_config_title")
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("printer_done_button") {
                            dismiss()
                        }
                        .fontWeight(.semibold)
                    }
                }
        }
    }
    
    private var content: some View {
        Form {
            Section("print_language_selection_title") {
                ForEach(PrintLanguage.allCases, id: \.self) { language in
                    languageRow(language)
                }
            }
            
            Section("print_language_fallback_title") {
                VStack(alignment: .leading, spacing: 8) {
                    Text("print_language_fallback_description")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if !settingsManager.printLanguage.isPrinterSupported {
                        Text("print_language_current_fallback_message")
                            .font(.caption)
                            .foregroundColor(.orange)
                            .padding(.top, 4)
                    }
                }
            }
        }
    }
    
    private func languageRow(_ language: PrintLanguage) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(language.displayName)
                    .font(.headline)
            }
            
            Spacer()
            
            if !language.isPrinterSupported {
                VStack {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundColor(.orange)
                    Text("print_language_not_supported")
                        .font(.caption2)
                        .foregroundColor(.orange)
                        .multilineTextAlignment(.center)
                }
            }
            
            if settingsManager.printLanguage == language {
                Image(systemName: "checkmark")
                    .foregroundColor(.blue)
                    .fontWeight(.semibold)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            settingsManager.setPrintLanguage(language)
        }
    }
}


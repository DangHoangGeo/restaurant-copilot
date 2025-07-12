import SwiftUI

struct PrintLanguageConfigView: View {
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @Environment(\.dismiss) private var dismiss
    @State private var showSuccessMessage = false
    
    var body: some View {
        content
                .navigationTitle("print_language_config_title".localized)
                .navigationBarTitleDisplayMode(.large)
                .toolbar {
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button("printer_done_button".localized) {
                            dismiss()
                        }
                        .fontWeight(.semibold)
                        .accessibilityLabel("printer_done_button".localized)
                        .accessibilityHint("accessibility_button_hint".localized)
                    }
                }
                .alert("print_language_changed_success".localized, isPresented: $showSuccessMessage) {
                    Button("ok".localized) { }
                }
    }
    
    private var content: some View {
        Form {
            Section(header: HStack {
                Image(systemName: "globe")
                    .foregroundColor(.blue)
                Text("print_language_selection_title".localized)
            }) {
                ForEach(PrintLanguage.allCases, id: \.self) { language in
                    languageRow(language)
                }
            }
            
            Section(header: HStack {
                Image(systemName: "info.circle")
                    .foregroundColor(.blue)
                Text("print_language_fallback_title".localized)
            }) {
                VStack(alignment: .leading, spacing: 12) {
                    Label {
                        Text("print_language_fallback_description".localized)
                            .font(.callout)
                            .foregroundColor(.secondary)
                    } icon: {
                        Image(systemName: "arrow.left.arrow.right")
                            .foregroundColor(.blue)
                    }
                    
                    if !settingsManager.printLanguage.isPrinterSupported {
                        Label {
                            Text("print_language_current_fallback_message".localized)
                                .font(.callout)
                                .fontWeight(.medium)
                        } icon: {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                        }
                        .padding(.top, 4)
                    }
                }
                .padding(.vertical, 4)
            }
            
            // Current status section
            Section(header: HStack {
                Image(systemName: "printer")
                    .foregroundColor(.blue)
                Text("print_language_current_status".localized)
            }) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("print_language_selected_language".localized)
                            .fontWeight(.medium)
                        Spacer()
                        Text(settingsManager.printLanguage.displayName)
                            .foregroundColor(.secondary)
                    }
                    
                    HStack {
                        Text("print_language_printer_support".localized)
                            .fontWeight(.medium)
                        Spacer()
                        HStack {
                            Image(systemName: settingsManager.printLanguage.isPrinterSupported ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundColor(settingsManager.printLanguage.isPrinterSupported ? .green : .orange)
                            Text(settingsManager.printLanguage.isPrinterSupported ? "print_language_supported".localized : "print_language_not_supported".localized)
                                .foregroundColor(settingsManager.printLanguage.isPrinterSupported ? .green : .orange)
                                .fontWeight(.medium)
                        }
                    }
                }
            }
        }
    }
    
    private func languageRow(_ language: PrintLanguage) -> some View {
        HStack(spacing: 16) {
            // Language flag/icon
            Text(language.flagEmoji)
                .font(.title2)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(language.displayName)
                    .font(.headline)
                    .fontWeight(.medium)
                
                Text(language.nativeName)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            // Support status and selection indicator
            HStack(spacing: 8) {
                if !language.isPrinterSupported {
                    VStack(spacing: 2) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.orange)
                            .font(.caption)
                        Text("print_language_fallback_mode".localized)
                            .font(.caption2)
                            .foregroundColor(.orange)
                            .multilineTextAlignment(.center)
                    }
                }
                
                if settingsManager.printLanguage == language {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.blue)
                        .font(.title3)
                        .fontWeight(.semibold)
                }
            }
        }
        .padding(.vertical, 8)
        .accessibilityLabel(language.displayName)
        .accessibilityHint("accessibility_row_hint".localized)
        .contentShape(Rectangle())
        .onTapGesture {
            let previousLanguage = settingsManager.printLanguage
            settingsManager.setPrintLanguage(language)
            
            // Show success message if language changed
            if previousLanguage != language {
                withAnimation(.easeInOut(duration: 0.3)) {
                    showSuccessMessage = true
                }
            }
        }
    }
}


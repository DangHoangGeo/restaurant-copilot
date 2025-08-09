import SwiftUI

struct PrintLanguageConfigView: View {
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @Environment(\.dismiss) private var dismiss
    @State private var showSuccessMessage = false
    @State private var testingLanguage: PrintLanguage?
    @State private var testResults: [PrintLanguage: Bool] = [:]
    
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
            
            // Language capability indicator and controls
            HStack(spacing: 8) {
                languageCapabilityIndicator(language)
                
                // Test button
                if testingLanguage == language {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    Button(action: {
                        Task {
                            await testLanguageCapability(language)
                        }
                    }) {
                        Image(systemName: "testtube.2")
                            .foregroundColor(.blue)
                            .font(.caption)
                    }
                    .buttonStyle(BorderlessButtonStyle())
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
    
    @ViewBuilder
    private func languageCapabilityIndicator(_ language: PrintLanguage) -> some View {
        if let activePrinter = settingsManager.activePrinter {
            let printerId = activePrinter.id
            let hasBeenTested = settingsManager.hasTestedLanguage(for: printerId, language: language)
            let isSupported = settingsManager.isLanguageSupported(for: printerId, language: language)
            
            if hasBeenTested {
                VStack(spacing: 2) {
                    Image(systemName: isSupported ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundColor(isSupported ? .green : .orange)
                        .font(.caption)
                    Text(isSupported ? "Supported" : "Fallback")
                        .font(.caption2)
                        .foregroundColor(isSupported ? .green : .orange)
                        .multilineTextAlignment(.center)
                }
            } else {
                VStack(spacing: 2) {
                    Image(systemName: "questionmark.circle.fill")
                        .foregroundColor(.gray)
                        .font(.caption)
                    Text("Untested")
                        .font(.caption2)
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                }
            }
        } else {
            VStack(spacing: 2) {
                Image(systemName: "printer.slash")
                    .foregroundColor(.gray)
                    .font(.caption)
                Text("No Printer")
                    .font(.caption2)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
            }
        }
    }
    
    private func testLanguageCapability(_ language: PrintLanguage) async {
        guard let activePrinter = settingsManager.activePrinter else { return }
        
        await MainActor.run {
            testingLanguage = language
        }
        
        let printerService = PrinterService.shared
        let isSupported = await printerService.testPrintSampleForPrinter(activePrinter, language: language)
        
        await MainActor.run {
            settingsManager.updateLanguageCapability(for: activePrinter.id, language: language, isSupported: isSupported)
            testResults[language] = isSupported
            testingLanguage = nil
        }
    }
}


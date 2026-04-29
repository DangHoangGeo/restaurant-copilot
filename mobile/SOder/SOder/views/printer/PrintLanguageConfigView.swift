import SwiftUI

struct PrintLanguageConfigView: View {
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared
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
            Section(header: HStack(spacing: Spacing.sm) {
                Image(systemName: "globe")
                    .foregroundColor(.appInfo)
                Text("print_language_selection_title".localized)
            }) {
                ForEach(PrintLanguage.allCases, id: \.self) { language in
                    languageRow(language)
                }
            }

            Section(header: HStack(spacing: Spacing.sm) {
                Image(systemName: "info.circle")
                    .foregroundColor(.appInfo)
                Text("print_language_fallback_title".localized)
            }) {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    Label {
                        Text("print_language_fallback_description".localized)
                            .font(.bodyMedium)
                            .foregroundColor(.appTextSecondary)
                    } icon: {
                        Image(systemName: "arrow.left.arrow.right")
                            .foregroundColor(.appInfo)
                    }

                    if !settingsManager.printLanguage.isPrinterSupported {
                        Label {
                            Text("print_language_current_fallback_message".localized)
                                .font(.bodyMedium)
                                .fontWeight(.medium)
                        } icon: {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.appWarning)
                        }
                        .padding(.top, Spacing.xs)
                    }
                }
                .padding(.vertical, Spacing.xs)
            }

            Section(header: HStack(spacing: Spacing.sm) {
                Image(systemName: "printer")
                    .foregroundColor(.appInfo)
                Text("print_language_current_status".localized)
            }) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack {
                        Text("print_language_selected_language".localized)
                            .font(.bodyMedium)
                            .fontWeight(.medium)
                        Spacer()
                        Text(settingsManager.printLanguage.displayName)
                            .font(.bodyMedium)
                            .foregroundColor(.appTextSecondary)
                    }

                    HStack {
                        Text("print_language_printer_support".localized)
                            .font(.bodyMedium)
                            .fontWeight(.medium)
                        Spacer()
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: settingsManager.printLanguage.isPrinterSupported
                                ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundColor(settingsManager.printLanguage.isPrinterSupported
                                    ? .appSuccess : .appWarning)
                            Text(settingsManager.printLanguage.isPrinterSupported
                                ? "print_language_supported".localized
                                : "print_language_not_supported".localized)
                                .font(.bodyMedium)
                                .foregroundColor(settingsManager.printLanguage.isPrinterSupported
                                    ? .appSuccess : .appWarning)
                                .fontWeight(.medium)
                        }
                    }
                }
            }
        }
    }

    private func languageRow(_ language: PrintLanguage) -> some View {
        HStack(spacing: Spacing.md) {
            Text(language.flagEmoji)
                .font(.compactPageTitle)

            VStack(alignment: .leading, spacing: Spacing.xs) {
                Text(language.displayName)
                    .font(.sectionHeader)
                    .fontWeight(.medium)
                    .foregroundColor(.appTextPrimary)

                Text(language.nativeName)
                    .font(.bodyMedium)
                    .foregroundColor(.appTextSecondary)
            }

            Spacer()

            HStack(spacing: Spacing.sm) {
                languageCapabilityIndicator(language)

                if testingLanguage == language {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    Button(action: {
                        Task { await testLanguageCapability(language) }
                    }) {
                        Image(systemName: "testtube.2")
                            .foregroundColor(.appInfo)
                            .font(.captionRegular)
                    }
                    .buttonStyle(BorderlessButtonStyle())
                }

                if settingsManager.printLanguage == language {
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundColor(.appInfo)
                        .font(.sectionHeader)
                        .fontWeight(.semibold)
                }
            }
        }
        .padding(.vertical, Spacing.sm)
        .contentShape(Rectangle())
        .onTapGesture {
            let previousLanguage = settingsManager.printLanguage
            settingsManager.setPrintLanguage(language)
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
                VStack(spacing: Spacing.xxs) {
                    Image(systemName: isSupported ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundColor(isSupported ? .appSuccess : .appWarning)
                        .font(.captionRegular)
                    Text(isSupported
                        ? "print_language_capability_supported".localized
                        : "print_language_capability_fallback".localized)
                        .font(.footnote)
                        .foregroundColor(isSupported ? .appSuccess : .appWarning)
                        .multilineTextAlignment(.center)
                }
            } else {
                VStack(spacing: Spacing.xxs) {
                    Image(systemName: "questionmark.circle.fill")
                        .foregroundColor(.appTextSecondary)
                        .font(.captionRegular)
                    Text("print_language_capability_untested".localized)
                        .font(.footnote)
                        .foregroundColor(.appTextSecondary)
                        .multilineTextAlignment(.center)
                }
            }
        } else {
            VStack(spacing: Spacing.xxs) {
                Image(systemName: "printer.slash")
                    .foregroundColor(.appTextSecondary)
                    .font(.captionRegular)
                Text("print_language_no_printer".localized)
                    .font(.footnote)
                    .foregroundColor(.appTextSecondary)
                    .multilineTextAlignment(.center)
            }
        }
    }

    private func testLanguageCapability(_ language: PrintLanguage) async {
        guard let activePrinter = settingsManager.activePrinter else { return }

        await MainActor.run { testingLanguage = language }

        let printerService = PrinterService.shared
        let isSupported = await printerService.testPrintSampleForPrinter(activePrinter, language: language)

        await MainActor.run {
            settingsManager.updateLanguageCapability(for: activePrinter.id, language: language, isSupported: isSupported)
            testResults[language] = isSupported
            testingLanguage = nil
        }
    }
}

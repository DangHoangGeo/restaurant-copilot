import SwiftUI

struct PrinterModeSelectionView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared
    @State private var showingDualModeAlert = false
    @State private var validationErrors: [String] = []
    
    var body: some View {
        VStack(spacing: 20) {
            // Header
            VStack(spacing: 8) {
                Image(systemName: "printer.dotmatrix")
                    .font(.system(size: 50))
                    .foregroundColor(.blue)
                
                Text("printer_mode_selection_header_title".localized)
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("printer_mode_selection_header_subtitle".localized)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.top)
            
            // Mode Selection Cards
            VStack(spacing: 16) {
                ForEach(PrinterMode.allCases, id: \.self) { mode in
                    PrinterModeCard(
                        mode: mode,
                        isSelected: settingsManager.printerMode == mode,
                        canSelect: mode == .single || settingsManager.canEnableDualMode(),
                        onTap: { selectMode(mode) }
                    )
                }
            }
            .padding(.horizontal)
            
            // Current Status
            if settingsManager.printerMode == .dual {
                DualPrinterStatusView()
                    .padding(.horizontal)
            }
            
            // Validation Errors
            if !validationErrors.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    Text("printer_mode_selection_issues_title".localized)
                        .font(.headline)
                        .foregroundColor(.red)
                    
                    ForEach(validationErrors, id: \.self) { error in
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.red)
                            Text(error)
                                .font(.caption)
                        }
                    }
                }
                .padding()
                .background(Color.red.opacity(0.1))
                .cornerRadius(12)
                .padding(.horizontal)
            }
            
            Spacer()
        }
        .navigationTitle("printer_mode_title".localized)
        .onAppear {
            validateCurrentSetup()
        }
        .alert("printer_mode_selection_alert_enable_dual_title".localized, isPresented: $showingDualModeAlert) {
            Button("cancel".localized, role: .cancel) { }
            Button("printer_mode_selection_alert_auto_assign_button".localized) {
                settingsManager.autoAssignDualPrinters()
                settingsManager.setPrinterMode(.dual)
                validateCurrentSetup()
            }
            Button("printer_mode_selection_alert_manual_setup_button".localized) {
                settingsManager.setPrinterMode(.dual)
                validateCurrentSetup()
            }
        } message: {
            Text("printer_mode_selection_alert_message".localized)
        }
    }
    
    private func selectMode(_ mode: PrinterMode) {
        if mode == .dual && !settingsManager.canEnableDualMode() {
            // Show error that at least 2 printers are needed
            return
        }
        
        if mode == .dual && settingsManager.printerMode == .single {
            showingDualModeAlert = true
        } else {
            settingsManager.setPrinterMode(mode)
            validateCurrentSetup()
        }
    }
    
    private func validateCurrentSetup() {
        validationErrors = settingsManager.validateDualModeSetup()
    }
}

struct PrinterModeCard: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    let mode: PrinterMode
    let isSelected: Bool
    let canSelect: Bool
    let onTap: () -> Void
    
    var body: some View {
        Button(action: canSelect ? onTap : {}) {
            HStack(spacing: 16) {
                // Icon
                Image(systemName: mode.icon)
                    .font(.system(size: 30))
                    .foregroundColor(isSelected ? .white : .blue)
                    .frame(width: 50, height: 50)
                    .background(
                        Circle()
                            .fill(isSelected ? Color.blue : Color.blue.opacity(0.1))
                    )
                
                // Content
                VStack(alignment: .leading, spacing: 4) {
                    Text(mode.displayName)
                        .font(.headline)
                        .foregroundColor(canSelect ? .primary : .secondary)
                    
                    Text(mode.description)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.leading)
                }
                
                Spacer()
                
                // Selection indicator
                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.blue)
                } else if !canSelect {
                    Image(systemName: "lock.circle.fill")
                        .font(.system(size: 24))
                        .foregroundColor(.gray)
                }
            }
            .padding()
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemBackground))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? Color.blue : Color.gray.opacity(0.3), lineWidth: isSelected ? 2 : 1)
                    )
            )
        }
        .disabled(!canSelect)
        .opacity(canSelect ? 1.0 : 0.6)
    }
}

struct DualPrinterStatusView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared
    
    var body: some View {
        VStack(spacing: 12) {
            Text("printer_mode_selection_dual_assignment_title".localized)
                .font(.headline)
            
            HStack(spacing: 20) {
                // Kitchen Printer Status
                VStack(spacing: 8) {
                    Image(systemName: "list.clipboard")
                        .font(.system(size: 24))
                        .foregroundColor(settingsManager.hasKitchenPrinter() ? .green : .orange)
                    
                    Text("printer_mode_selection_kitchen_printer_title".localized)
                        .font(.caption)
                        .fontWeight(.medium)
                    
                    Text(settingsManager.kitchenPrinter?.name ?? "printer_mode_selection_not_assigned".localized)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
                
                // Checkout Printer Status
                VStack(spacing: 8) {
                    Image(systemName: "doc.text")
                        .font(.system(size: 24))
                        .foregroundColor(settingsManager.hasCheckoutPrinter() ? .green : .orange)
                    
                    Text("printer_mode_selection_checkout_printer_title".localized)
                        .font(.caption)
                        .fontWeight(.medium)
                    
                    Text(settingsManager.checkoutPrinter?.name ?? "printer_mode_selection_not_assigned".localized)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(12)
            }
            
            // Quick actions
            HStack(spacing: 12) {
                Button("printer_mode_selection_alert_auto_assign_button".localized) {
                    settingsManager.autoAssignDualPrinters()
                }
                .buttonStyle(.bordered)
                .disabled(settingsManager.configuredPrinters.count < 2)
                
                NavigationLink(destination: DualPrinterAssignmentView()) {
                    Text("printer_mode_selection_alert_manual_setup_button".localized)
                }
                .buttonStyle(.bordered)
            }
        }
        .padding()
        .background(Color(.systemGray6).opacity(0.5))
        .cornerRadius(16)
    }
}

struct DualPrinterAssignmentView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        Form {
            Section {
                Text("printer_mode_selection_dual_assign_description".localized)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Section("printer_mode_selection_kitchen_printer_title".localized) {
                Picker("printer_mode_selection_kitchen_picker_label".localized, selection: Binding(
                    get: { settingsManager.kitchenPrinter?.id ?? "" },
                    set: { newValue in
                        let printer = settingsManager.configuredPrinters.first { $0.id == newValue }
                        settingsManager.setKitchenPrinter(printer)
                    }
                )) {
                    Text("printer_mode_selection_picker_none".localized).tag("")
                    ForEach(settingsManager.configuredPrinters) { printer in
                        Text(printer.name).tag(printer.id)
                    }
                }
                .pickerStyle(.menu)
            }
            
            Section("printer_mode_selection_checkout_printer_title".localized) {
                Picker("printer_mode_selection_checkout_picker_label".localized, selection: Binding(
                    get: { settingsManager.checkoutPrinter?.id ?? "" },
                    set: { newValue in
                        let printer = settingsManager.configuredPrinters.first { $0.id == newValue }
                        settingsManager.setCheckoutPrinter(printer)
                    }
                )) {
                    Text("printer_mode_selection_picker_none".localized).tag("")
                    ForEach(settingsManager.configuredPrinters) { printer in
                        Text(printer.name).tag(printer.id)
                    }
                }
                .pickerStyle(.menu)
            }
            
            Section {
                Button("printer_mode_selection_test_kitchen_button".localized) {
                    Task {
                        do {
                            try await PrinterService.shared.testKitchenPrinter()
                        } catch {
                            print("Kitchen printer test failed: \(error)")
                        }
                    }
                }
                .disabled(!settingsManager.hasKitchenPrinter())
                
                Button("printer_mode_selection_test_checkout_button".localized) {
                    Task {
                        do {
                            try await PrinterService.shared.testCheckoutPrinter()
                        } catch {
                            print("Checkout printer test failed: \(error)")
                        }
                    }
                }
                .disabled(!settingsManager.hasCheckoutPrinter())
            }
        }
        .navigationTitle("printer_mode_selection_dual_setup_title".localized)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("done".localized) {
                    dismiss()
                }
            }
        }
    }
}

#Preview {
    NavigationView {
        PrinterModeSelectionView()
    }
}
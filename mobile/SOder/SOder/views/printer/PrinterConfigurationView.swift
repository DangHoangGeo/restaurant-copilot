import SwiftUI

struct PrinterConfigurationView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @State private var showingAddPrinter = false
    @State private var showingEditPrinter: ConfiguredPrinter?
    @State private var showingRestaurantSettings = false
    @State private var showingDeleteAlert = false
    @State private var printerToDelete: ConfiguredPrinter?
    
    var body: some View {
        NavigationView {
            List {
                // Current Status Section
                Section("printer_config_status_title".localized) {
                    HStack {
                        Image(systemName: settingsManager.hasUserConfiguredPrinters() ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                            .foregroundColor(settingsManager.hasUserConfiguredPrinters() ? .green : .orange)
                        
                        VStack(alignment: .leading) {
                            Text(settingsManager.hasUserConfiguredPrinters() ? "printer_config_status_configured_title".localized : "printer_config_status_default_title".localized)
                                .font(.headline)
                            Text(settingsManager.isUsingDefaultPrinter() ? "printer_config_status_default_subtitle".localized : "printer_config_status_custom_subtitle".localized)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        if settingsManager.isUsingDefaultPrinter() {
                            Button("printer_config_setup_button".localized) {
                                showingAddPrinter = true
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    .padding(.vertical, 4)
                }
                
                // Active Printer Section
                if let activePrinter = settingsManager.activePrinter {
                    Section("printer_config_active_printer_title".localized) {
                        PrinterConfigRowView(printer: activePrinter, isActive: true) {
                            showingEditPrinter = activePrinter
                        } onDeactivate: {
                            settingsManager.clearActivePrinter()
                        }
                    }
                }
                
                // Configured Printers Section
                if !settingsManager.configuredPrinters.isEmpty {
                    Section("printer_config_configured_printers_title".localized) {
                        ForEach(settingsManager.configuredPrinters) { printer in
                            if printer.id != settingsManager.activePrinter?.id {
                                PrinterConfigRowView(printer: printer, isActive: false) {
                                    showingEditPrinter = printer
                                } onActivate: {
                                    settingsManager.setActivePrinter(printer)
                                } onDelete: {
                                    printerToDelete = printer
                                    showingDeleteAlert = true
                                }
                            }
                        }
                        
                        Button(action: {
                            showingAddPrinter = true
                        }) {
                            HStack {
                                Image(systemName: "plus.circle")
                                Text("printer_config_add_another_button".localized)
                            }
                        }
                        .foregroundColor(.blue)
                    }
                } else {
                    Section("printer_config_get_started_title".localized) {
                        Button(action: {
                            showingAddPrinter = true
                        }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("printer_config_add_first_button".localized)
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .foregroundColor(.blue)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("printer_config_why_configure_title".localized)
                                .font(.headline)
                            Text("printer_config_why_configure_item1".localized)
                            Text("printer_config_why_configure_item2".localized)
                            Text("printer_config_why_configure_item3".localized)
                            Text("printer_config_why_configure_item4".localized)
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.vertical, 4)
                    }
                }
                
                // Restaurant Settings Section
                Section("printer_config_restaurant_info_title".localized) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(settingsManager.restaurantSettings.name)
                            .font(.headline)
                        if !settingsManager.restaurantSettings.address.isEmpty {
                            Text(settingsManager.restaurantSettings.address)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        if !settingsManager.restaurantSettings.phone.isEmpty {
                            Text(settingsManager.restaurantSettings.phone)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                    
                    Button("printer_config_edit_restaurant_button".localized) {
                        showingRestaurantSettings = true
                    }
                    .foregroundColor(.blue)
                }
                
                // Default Printer Info (only show if using default)
                if settingsManager.isUsingDefaultPrinter() {
                    Section("printer_config_default_settings_title".localized) {
                        let defaultConfig = PrinterConfig.shared.defaultPrinter
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Image(systemName: "exclamationmark.triangle")
                                    .foregroundColor(.orange)
                                Text("printer_config_fallback_title".localized)
                                    .font(.headline)
                            }
                            Text(String(format: "printer_config_default_ip_label".localized, defaultConfig.ipAddress))
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text(String(format: "printer_config_default_port_label".localized, defaultConfig.port))
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("printer_config_default_usage_info".localized)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .italic()
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("printer_config_title".localized)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("add_printer".localized) {
                        showingAddPrinter = true
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddPrinter) {
            AddPrinterView()
        }
        .sheet(item: $showingEditPrinter) { printer in
            EditPrinterView(printer: printer)
        }
        .sheet(isPresented: $showingRestaurantSettings) {
            RestaurantSettingsView()
        }
        .alert("printer_config_delete_alert_title".localized, isPresented: $showingDeleteAlert) {
            Button("cancel".localized, role: .cancel) { }
            Button("delete".localized, role: .destructive) {
                if let printer = printerToDelete {
                    settingsManager.removePrinter(id: printer.id)
                    printerToDelete = nil
                }
            }
        } message: {
            Text("printer_config_delete_alert_message".localized)
        }
    }
}

struct PrinterConfigRowView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    let printer: ConfiguredPrinter
    let isActive: Bool
    let onEdit: () -> Void
    var onActivate: (() -> Void)?
    var onDeactivate: (() -> Void)?
    var onDelete: (() -> Void)?
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Image(systemName: printer.printerType.icon)
                        .foregroundColor(isActive ? .green : .blue)
                    Text(printer.name)
                        .font(.headline)
                    if isActive {
                        Text("printer_config_row_active_badge".localized)
                            .font(.caption)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(.green.opacity(0.2))
                            .foregroundColor(.green)
                            .clipShape(Capsule())
                    }
                }
                
                Text(printer.printerType.displayName)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                Text("\(printer.ipAddress):\(printer.port)")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                if let notes = printer.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .italic()
                }
            }
            
            Spacer()
            
            VStack(spacing: 8) {
                Button("edit".localized) {
                    onEdit()
                }
                .buttonStyle(.bordered)
                .font(.caption)
                
                if isActive {
                    Button("printer_config_row_deactivate_button".localized) {
                        onDeactivate?()
                    }
                    .buttonStyle(.bordered)
                    .font(.caption)
                    .foregroundColor(.orange)
                } else {
                    Button("printer_config_row_activate_button".localized) {
                        onActivate?()
                    }
                    .buttonStyle(.borderedProminent)
                    .font(.caption)
                }
                
                if !isActive, let onDelete = onDelete {
                    Button("delete".localized) {
                        onDelete()
                    }
                    .buttonStyle(.bordered)
                    .font(.caption)
                    .foregroundColor(.red)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    PrinterConfigurationView()
}
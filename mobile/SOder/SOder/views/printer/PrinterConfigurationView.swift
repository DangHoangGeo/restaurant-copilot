import SwiftUI

struct PrinterConfigurationView: View {
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
                Section("Configuration Status") {
                    HStack {
                        Image(systemName: settingsManager.hasUserConfiguredPrinters() ? "checkmark.circle.fill" : "exclamationmark.triangle.fill")
                            .foregroundColor(settingsManager.hasUserConfiguredPrinters() ? .green : .orange)
                        
                        VStack(alignment: .leading) {
                            Text(settingsManager.hasUserConfiguredPrinters() ? "Printers Configured" : "Using Default Settings")
                                .font(.headline)
                            Text(settingsManager.isUsingDefaultPrinter() ? "Configure your own printer for better control" : "Custom printer configuration active")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        
                        Spacer()
                        
                        if settingsManager.isUsingDefaultPrinter() {
                            Button("Setup") {
                                showingAddPrinter = true
                            }
                            .buttonStyle(.bordered)
                        }
                    }
                    .padding(.vertical, 4)
                }
                
                // Active Printer Section
                if let activePrinter = settingsManager.activePrinter {
                    Section("Active Printer") {
                        PrinterConfigRowView(printer: activePrinter, isActive: true) {
                            showingEditPrinter = activePrinter
                        } onDeactivate: {
                            settingsManager.clearActivePrinter()
                        }
                    }
                }
                
                // Configured Printers Section
                if !settingsManager.configuredPrinters.isEmpty {
                    Section("Configured Printers") {
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
                                Text("Add Another Printer")
                            }
                        }
                        .foregroundColor(.blue)
                    }
                } else {
                    Section("Get Started") {
                        Button(action: {
                            showingAddPrinter = true
                        }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("Add Your First Printer")
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .foregroundColor(.blue)
                        
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Why configure your printer?")
                                .font(.headline)
                            Text("• Better connection reliability")
                            Text("• Custom timeout and retry settings")
                            Text("• Multiple printer support")
                            Text("• Personalized restaurant details on receipts")
                        }
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.vertical, 4)
                    }
                }
                
                // Restaurant Settings Section
                Section("Restaurant Information") {
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
                    
                    Button("Edit Restaurant Details") {
                        showingRestaurantSettings = true
                    }
                    .foregroundColor(.blue)
                }
                
                // Default Printer Info (only show if using default)
                if settingsManager.isUsingDefaultPrinter() {
                    Section("Default Printer Settings") {
                        let defaultConfig = PrinterConfig.shared.defaultPrinter
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Image(systemName: "exclamationmark.triangle")
                                    .foregroundColor(.orange)
                                Text("Fallback Configuration")
                                    .font(.headline)
                            }
                            Text("IP: \(defaultConfig.ipAddress)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("Port: \(defaultConfig.port)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                            Text("This is used when no custom printer is configured")
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .italic()
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("Printer Configuration")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add Printer") {
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
        .alert("Delete Printer", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                if let printer = printerToDelete {
                    settingsManager.removePrinter(id: printer.id)
                    printerToDelete = nil
                }
            }
        } message: {
            Text("Are you sure you want to delete this printer configuration?")
        }
    }
}

struct PrinterConfigRowView: View {
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
                        Text("Active")
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
                Button("Edit") {
                    onEdit()
                }
                .buttonStyle(.bordered)
                .font(.caption)
                
                if isActive {
                    Button("Deactivate") {
                        onDeactivate?()
                    }
                    .buttonStyle(.bordered)
                    .font(.caption)
                    .foregroundColor(.orange)
                } else {
                    Button("Activate") {
                        onActivate?()
                    }
                    .buttonStyle(.borderedProminent)
                    .font(.caption)
                }
                
                if !isActive, let onDelete = onDelete {
                    Button("Delete") {
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
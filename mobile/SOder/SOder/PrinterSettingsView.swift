import SwiftUI

struct PrinterSettingsView: View {
    @StateObject private var printerManager = PrinterManager()
    @State private var showingConnectionAlert = false
    @State private var connectionMessage = ""
    @State private var isConnecting = false
    
    var body: some View {
        NavigationView {
            List {
                // Current Printer Status Section
                Section("Current Status") {
                    HStack {
                        Image(systemName: printerManager.isConnected ? "printer.fill" : "printer")
                            .foregroundColor(printerManager.isConnected ? .green : .gray)
                        
                        VStack(alignment: .leading) {
                            Text("Printer Status")
                                .font(.headline)
                            Text(printerManager.printerStatus)
                                .font(.subheadline)
                                .foregroundColor(printerManager.isConnected ? .green : .secondary)
                        }
                        
                        Spacer()
                        
                        if printerManager.isConnected {
                            Button("Disconnect") {
                                printerManager.disconnectPrinter()
                            }
                            .buttonStyle(.bordered)
                            .foregroundColor(.red)
                        }
                    }
                    .padding(.vertical, 4)
                }
                
                // Available Printers Section
                Section("Available Printers") {
                    if printerManager.availablePrinters.isEmpty {
                        HStack {
                            Image(systemName: "magnifyingglass")
                                .foregroundColor(.gray)
                            Text("No printers found")
                                .foregroundColor(.secondary)
                            
                            Spacer()
                            
                            Button("Scan") {
                                printerManager.checkAvailablePrinters()
                            }
                            .buttonStyle(.bordered)
                        }
                        .padding(.vertical, 4)
                    } else {
                        ForEach(printerManager.availablePrinters) { printer in
                            PrinterRowView(
                                printer: printer,
                                isSelected: printerManager.selectedPrinter?.id == printer.id,
                                isConnecting: isConnecting
                            ) {
                                connectToPrinter(printer)
                            }
                        }
                    }
                    
                    Button("Refresh Printers") {
                        printerManager.checkAvailablePrinters()
                    }
                    .foregroundColor(.blue)
                }
                
                // Test Printing Section
                if printerManager.isConnected {
                    Section("Test Printing") {
                        Button(action: {
                            Task {
                                await testPrint()
                            }
                        }) {
                            HStack {
                                Image(systemName: "doc.text")
                                Text("Print Test Receipt")
                                Spacer()
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                }
                
                // Manual Printer Setup Section
                Section("Manual Setup") {
                    NavigationLink(destination: ManualPrinterSetupView(printerManager: printerManager)) {
                        HStack {
                            Image(systemName: "plus")
                            Text("Add Network Printer")
                        }
                    }
                }
                
                // Error Message
                if let errorMessage = printerManager.errorMessage {
                    Section("Error") {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Printer Settings")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        // This would dismiss the view in a navigation context
                    }
                }
            }
            .alert("Printer Connection", isPresented: $showingConnectionAlert) {
                Button("OK") { }
            } message: {
                Text(connectionMessage)
            }
        }
        .onAppear {
            printerManager.checkAvailablePrinters()
        }
    }
    
    private func connectToPrinter(_ printer: PrinterInfo) {
        isConnecting = true
        Task {
            await printerManager.connectToPrinter(printer)
            
            await MainActor.run {
                isConnecting = false
                connectionMessage = printerManager.isConnected
                    ? "Successfully connected to \(printer.name)"
                    : "Failed to connect to \(printer.name)"
                showingConnectionAlert = true
            }
        }
    }
    
    private func testPrint() async {
        let success = await printerManager.printTestReceipt()
        
        await MainActor.run {
            connectionMessage = success
                ? "Test receipt printed successfully!"
                : "Failed to print test receipt"
            showingConnectionAlert = true
        }
    }
}

struct PrinterRowView: View {
    let printer: PrinterInfo
    let isSelected: Bool
    let isConnecting: Bool
    let onConnect: () -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(printer.name)
                    .font(.headline)
                
                HStack {
                    Image(systemName: printer.type.icon)
                        .font(.caption)
                    Text(printer.type.displayName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    if printer.type == .network {
                        Text("• \(printer.address)")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            
            Spacer()
            
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundColor(.green)
            } else if isConnecting {
                ProgressView()
                    .scaleEffect(0.8)
            } else {
                Button("Connect") {
                    onConnect()
                }
                .buttonStyle(.bordered)
                .foregroundColor(.blue)
            }
        }
        .padding(.vertical, 4)
    }
}

struct ManualPrinterSetupView: View {
    let printerManager: PrinterManager
    
    @State private var printerName = ""
    @State private var ipAddress = ""
    @State private var port = "9100"
    @Environment(\.presentationMode) var presentationMode
    
    var body: some View {
        NavigationView {
            Form {
                Section("Printer Information") {
                    TextField("Printer Name", text: $printerName)
                    TextField("IP Address", text: $ipAddress)
                        .keyboardType(.numbersAndPunctuation)
                    TextField("Port", text: $port)
                        .keyboardType(.numberPad)
                }
                
                Section("Connection") {
                    Button("Add Printer") {
                        addNetworkPrinter()
                    }
                    .disabled(printerName.isEmpty || ipAddress.isEmpty)
                }
                
                Section {
                    Text("Enter the IP address and port of your network printer. Most receipt printers use port 9100.")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            .navigationTitle("Add Network Printer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        presentationMode.wrappedValue.dismiss()
                    }
                }
            }
        }
    }
    
    private func addNetworkPrinter() {
        let newPrinter = PrinterInfo(
            id: ipAddress,
            name: printerName,
            type: .network,
            address: "\(ipAddress):\(port)",
            isConnected: false
        )
        
        // In a real app, you would add this to the printer manager's available printers
        // and save it to UserDefaults or another persistence mechanism
        
        presentationMode.wrappedValue.dismiss()
    }
}

#Preview {
    PrinterSettingsView()
}
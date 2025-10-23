import SwiftUI
import CoreBluetooth

struct BluetoothPrinterSetupView: View {
    @ObservedObject private var bluetoothService = BluetoothPrinterService.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Form {
            // Status Section
            Section("bluetooth_status_section".localized) {
                HStack {
                    Image(systemName: bluetoothService.isConnected ? "checkmark.circle.fill" : "circle")
                        .foregroundColor(bluetoothService.isConnected ? .appSuccess : .appTextSecondary)
                    Text("bluetooth_connection_status".localized)
                    Spacer()
                    Text(bluetoothService.connectionStatus)
                        .foregroundColor(.appTextSecondary)
                        .font(.caption)
                }

                if bluetoothService.isScanning {
                    HStack {
                        ProgressView()
                            .scaleEffect(0.8)
                        Text("bluetooth_scanning_status".localized)
                            .foregroundColor(.appTextSecondary)
                            .font(.caption)
                    }
                }
            }

            // Scan Control Section
            Section("bluetooth_scan_section".localized) {
                if !bluetoothService.isScanning {
                    Button(action: {
                        bluetoothService.startScan()
                    }) {
                        HStack {
                            Image(systemName: "magnifyingglass")
                            Text("bluetooth_start_scan".localized)
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                } else {
                    Button(action: {
                        bluetoothService.stopScan()
                    }) {
                        HStack {
                            Image(systemName: "stop.fill")
                            Text("bluetooth_stop_scan".localized)
                        }
                    }
                    .buttonStyle(SecondaryButtonStyle())
                }

                if bluetoothService.isConnected {
                    Button(action: {
                        bluetoothService.disconnect()
                    }) {
                        HStack {
                            Image(systemName: "xmark.circle")
                            Text("bluetooth_disconnect".localized)
                        }
                    }
                    .buttonStyle(DestructiveButtonStyle())
                }
            }

            // Discovered Devices Section
            if !bluetoothService.discoveredPeripherals.isEmpty {
                Section("bluetooth_discovered_devices_section".localized) {
                    ForEach(bluetoothService.discoveredPeripherals, id: \.identifier) { peripheral in
                        Button(action: {
                            bluetoothService.connect(to: peripheral)
                        }) {
                            HStack {
                                Image(systemName: "printer")
                                    .foregroundColor(.appPrimary)

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(peripheral.name ?? "bluetooth_unnamed_device".localized)
                                        .foregroundColor(.appTextPrimary)
                                        .font(.headline)

                                    Text(peripheral.identifier.uuidString)
                                        .foregroundColor(.appTextSecondary)
                                        .font(.caption)
                                }

                                Spacer()

                                if bluetoothService.isConnected && bluetoothService.printerPeripheral?.identifier == peripheral.identifier {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.appSuccess)
                                }
                            }
                        }
                        .buttonStyle(BorderlessButtonStyle())
                    }
                }
            } else if !bluetoothService.isScanning {
                Section {
                    ContentUnavailableView(
                        "bluetooth_no_devices_title".localized,
                        systemImage: "bluetooth.slash",
                        description: Text("bluetooth_no_devices_description".localized)
                    )
                }
            }

            // Help Section
            Section("bluetooth_help_section".localized) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HelpText(icon: "1.circle.fill", text: "bluetooth_help_step1".localized)
                    HelpText(icon: "2.circle.fill", text: "bluetooth_help_step2".localized)
                    HelpText(icon: "3.circle.fill", text: "bluetooth_help_step3".localized)
                    HelpText(icon: "4.circle.fill", text: "bluetooth_help_step4".localized)
                }
                .font(.caption)
                .foregroundColor(.appTextSecondary)
            }
        }
        .navigationTitle("bluetooth_printer_setup_title".localized)
        .navigationBarTitleDisplayMode(.large)
    }
}

struct HelpText: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.sm) {
            Image(systemName: icon)
                .foregroundColor(.appPrimary)
                .font(.caption)
            Text(text)
        }
    }
}

#Preview {
    NavigationView {
        BluetoothPrinterSetupView()
    }
}

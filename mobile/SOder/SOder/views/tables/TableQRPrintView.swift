import SwiftUI

struct TableQRPrintView: View {
    let table: Table
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var printerManager: PrinterManager
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared
    @State private var isPrinting = false
    @State private var showSuccessAlert = false
    @State private var showErrorAlert = false
    @State private var errorMessage = ""
    @State private var isViewReady = false

    private var qrCodeUrl: String {
        // Construct the QR code URL
        let rootDomain = "coorder.ai" // This should ideally come from config
        let subdomain = settingsManager.restaurantSettings.name
            .lowercased()
            .replacingOccurrences(of: " ", with: "")

        if let qrCode = table.qr_code {
            return "https://\(subdomain).\(rootDomain)/en/menu?code=\(qrCode)"
        } else {
            return "https://\(subdomain).\(rootDomain)/en/menu"
        }
    }

    var body: some View {
        NavigationView {
            Group {
                if isViewReady {
                    ScrollView {
                        VStack(spacing: 24) {
                            // Preview Card
                            PreviewCard(
                                restaurantName: settingsManager.restaurantSettings.name,
                                tableName: table.name,
                                qrCodeUrl: qrCodeUrl,
                                wifiSsid: settingsManager.restaurantSettings.wifiSsid,
                                wifiPassword: settingsManager.restaurantSettings.wifiPassword
                            )
                            .padding()

                    // Table Information
                    GroupBox {
                        VStack(alignment: .leading, spacing: 12) {
                            InfoRow(label: "tables_print_table_name".localized, value: table.name)
                            InfoRow(label: "tables_print_capacity".localized, value: "\(table.capacity)")
                            InfoRow(label: "tables_print_status".localized, value: table.status.displayName)

                            if let notes = table.notes, !notes.isEmpty {
                                InfoRow(label: "tables_print_notes".localized, value: notes)
                            }
                        }
                        .padding(.vertical, 4)
                    } label: {
                        Label("tables_print_info".localized, systemImage: "info.circle")
                    }
                    .padding(.horizontal)

                    // WiFi Information
                    if let ssid = settingsManager.restaurantSettings.wifiSsid,
                       !ssid.isEmpty {
                        GroupBox {
                            VStack(alignment: .leading, spacing: 12) {
                                InfoRow(label: "tables_print_wifi_ssid".localized, value: ssid)
                                if let password = settingsManager.restaurantSettings.wifiPassword, !password.isEmpty {
                                    InfoRow(label: "tables_print_wifi_password".localized, value: password)
                                }
                            }
                            .padding(.vertical, 4)
                        } label: {
                            Label("tables_print_wifi_info".localized, systemImage: "wifi")
                        }
                        .padding(.horizontal)
                    }

                    // Printer Status
                    GroupBox {
                        HStack {
                            Image(systemName: printerManager.isConnected ? "printer.fill" : "printer")
                                .foregroundColor(printerManager.isConnected ? .green : .gray)

                            VStack(alignment: .leading, spacing: 4) {
                                Text(printerManager.isConnected ? "tables_print_printer_connected".localized : "tables_print_printer_disconnected".localized)
                                    .font(.headline)

                                if let printer = printerManager.selectedPrinter {
                                    Text(printer.name)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }

                            Spacer()

                            if printerManager.isConnected {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                            }
                        }
                        .padding(.vertical, 4)
                    } label: {
                        Label("tables_print_printer_status".localized, systemImage: "antenna.radiowaves.left.and.right")
                    }
                    .padding(.horizontal)

                    // Print Button
                    Button(action: printQRCode) {
                        HStack {
                            if isPrinting {
                                ProgressView()
                                    .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            } else {
                                Image(systemName: "printer.fill")
                            }

                            Text(isPrinting ? "tables_print_printing".localized : "tables_print_button".localized)
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(printerManager.isConnected && !isPrinting ? Color.blue : Color.gray)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .disabled(!printerManager.isConnected || isPrinting)
                    .padding(.horizontal)
                    .padding(.top, 8)
                    }
                    .padding(.vertical)
                }
                } else {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .navigationTitle("tables_print_title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("common_close".localized) {
                        dismiss()
                    }
                }
            }
            .alert("tables_print_success_title".localized, isPresented: $showSuccessAlert) {
                Button("common_ok".localized, role: .cancel) {
                    dismiss()
                }
            } message: {
                Text("tables_print_success_message".localized)
            }
            .alert("tables_print_error_title".localized, isPresented: $showErrorAlert) {
                Button("common_ok".localized, role: .cancel) { }
            } message: {
                Text(errorMessage)
            }
            .onAppear {
                // Ensure view is ready before rendering content
                DispatchQueue.main.async {
                    isViewReady = true
                }
            }
        }
    }

    private func printQRCode() {
        isPrinting = true

        Task {
            let success = await printerManager.printTableQRCode(table: table, qrCodeUrl: qrCodeUrl)

            await MainActor.run {
                isPrinting = false

                if success {
                    showSuccessAlert = true
                } else {
                    errorMessage = printerManager.errorMessage ?? "tables_print_unknown_error".localized
                    showErrorAlert = true
                }
            }
        }
    }
}

// MARK: - Preview Card
struct PreviewCard: View {
    let restaurantName: String
    let tableName: String
    let qrCodeUrl: String
    let wifiSsid: String?
    let wifiPassword: String?

    var body: some View {
        VStack(spacing: 16) {
            Text("tables_print_preview".localized)
                .font(.headline)
                .foregroundColor(.secondary)

            // Preview of printed output
            VStack(spacing: 12) {
                // Restaurant Name
                Text(restaurantName)
                    .font(.title2)
                    .fontWeight(.bold)
                    .multilineTextAlignment(.center)

                // Table Name
                Text(tableName)
                    .font(.system(size: 36, weight: .bold))
                    .multilineTextAlignment(.center)

                // QR Code Placeholder
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(.systemGray5))
                        .frame(width: 180, height: 180)

                    VStack(spacing: 8) {
                        Image(systemName: "qrcode")
                            .font(.system(size: 60))
                            .foregroundColor(.gray)

                        Text("tables_print_qr_preview".localized)
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }

                // Footer
                VStack(spacing: 4) {
                    Text("tables_print_thank_you".localized)
                        .font(.subheadline)

                    if let ssid = wifiSsid, !ssid.isEmpty {
                        Text("WiFi: \(ssid)")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        if let password = wifiPassword, !password.isEmpty {
                            Text("Pass: \(password)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    Text("powered by coorder.ai")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                        .padding(.top, 4)
                }
            }
            .padding(24)
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 4)
        }
    }
}

// MARK: - Info Row
struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)

            Spacer()

            Text(value)
                .font(.subheadline)
                .fontWeight(.medium)
        }
    }
}

// MARK: - Preview
struct TableQRPrintView_Previews: PreviewProvider {
    static var previews: some View {
        let mockTable = Table(
            id: "test-id",
            restaurant_id: "test-restaurant",
            name: "Table 5",
            status: .available,
            capacity: 4,
            is_outdoor: false,
            is_accessible: false,
            notes: "Near window",
            qr_code: "QR123456",
            created_at: nil,
            updated_at: nil
        )

        TableQRPrintView(table: mockTable)
            .environmentObject(PrinterManager.shared)
    }
}

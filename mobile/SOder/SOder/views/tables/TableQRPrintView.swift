import SwiftUI

struct TableQRPrintView: View {
    let table: Table

    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject var printerManager: PrinterManager
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared
    @StateObject private var supabaseManager = SupabaseManager.shared
    @State private var isPrinting = false
    @State private var showSuccessAlert = false
    @State private var showErrorAlert = false
    @State private var errorMessage = ""

    private var qrCodeUrl: String {
        let rootDomain = "coorder.ai"
        let subdomain = resolvedSubdomain

        if let qrCode = table.qr_code, !qrCode.isEmpty {
            return "https://\(subdomain).\(rootDomain)/en/menu?code=\(qrCode)"
        }

        return "https://\(subdomain).\(rootDomain)/en/menu"
    }

    private var resolvedSubdomain: String {
        if let branchSubdomain = supabaseManager.currentRestaurant?.subdomain, !branchSubdomain.isEmpty {
            return branchSubdomain
        }

        let fallbackName = settingsManager.receiptHeader.restaurantName.isEmpty
            ? settingsManager.restaurantSettings.name
            : settingsManager.receiptHeader.restaurantName

        let sanitized = fallbackName
            .lowercased()
            .replacingOccurrences(of: " ", with: "")
            .replacingOccurrences(of: "[^a-z0-9-]", with: "", options: .regularExpression)

        return sanitized.isEmpty ? "restaurant" : sanitized
    }

    private var displayRestaurantName: String {
        settingsManager.receiptHeader.restaurantName.isEmpty
            ? (supabaseManager.currentRestaurant?.name ?? settingsManager.restaurantSettings.name)
            : settingsManager.receiptHeader.restaurantName
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    previewCard
                    tableDetailsCard

                    if let ssid = settingsManager.restaurantSettings.wifiSsid, !ssid.isEmpty {
                        wifiDetailsCard(ssid: ssid, password: settingsManager.restaurantSettings.wifiPassword)
                    }

                    printerStatusCard

                    Button(action: printQRCode) {
                        HStack {
                            if isPrinting {
                                ProgressView()
                                    .progressViewStyle(.circular)
                            } else {
                                Image(systemName: "printer.fill")
                            }

                            Text(isPrinting ? "tables_print_printing".localized : "tables_print_button".localized)
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle(isEnabled: printerManager.isConnected && !isPrinting))
                    .disabled(!printerManager.isConnected || isPrinting)
                }
                .padding(.horizontal, Spacing.md)
                .padding(.vertical, Spacing.lg)
            }
            .background(Color.appBackground.ignoresSafeArea())
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
        }
    }

    private var previewCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("tables_print_preview".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            VStack(spacing: Spacing.md) {
                Text(displayRestaurantName)
                    .font(.cardTitle)
                    .foregroundColor(.appTextPrimary)
                    .multilineTextAlignment(.center)

                Text(table.name)
                    .font(.heroTitle)
                    .foregroundColor(.appTextPrimary)
                    .multilineTextAlignment(.center)

                ZStack {
                    RoundedRectangle(cornerRadius: CornerRadius.lg)
                        .fill(Color.appSurfaceSecondary)
                        .frame(width: 180, height: 180)

                    VStack(spacing: Spacing.sm) {
                        Image(systemName: "qrcode")
                            .font(.system(size: 56, weight: .medium))
                            .foregroundColor(.appTextSecondary)

                        Text("tables_print_qr_preview".localized)
                            .font(.caption)
                            .foregroundColor(.appTextSecondary)
                    }
                }

                Text(qrCodeUrl)
                    .font(.caption)
                    .foregroundColor(.appTextSecondary)
                    .multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity)
            .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.xl, surfaceColor: Color.appSurface.opacity(0.96))
        }
    }

    private var tableDetailsCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("tables_print_info".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            VStack(alignment: .leading, spacing: Spacing.sm) {
                infoRow(label: "tables_print_table_name".localized, value: table.name)
                infoRow(label: "tables_print_capacity".localized, value: "\(table.capacity)")
                infoRow(label: "tables_print_status".localized, value: table.status.displayName)

                if let notes = table.notes, !notes.isEmpty {
                    infoRow(label: "tables_print_notes".localized, value: notes)
                }
            }
            .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
        }
    }

    private func wifiDetailsCard(ssid: String, password: String?) -> some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("tables_print_wifi_info".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            VStack(alignment: .leading, spacing: Spacing.sm) {
                infoRow(label: "tables_print_wifi_ssid".localized, value: ssid)

                if let password, !password.isEmpty {
                    infoRow(label: "tables_print_wifi_password".localized, value: password)
                }
            }
            .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
        }
    }

    private var printerStatusCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("tables_print_printer_status".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            HStack(spacing: Spacing.md) {
                Image(systemName: printerManager.isConnected ? "printer.fill" : "printer.dotmatrix")
                    .foregroundColor(printerManager.isConnected ? .appSuccess : .appWarning)

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(printerManager.isConnected ? "tables_print_printer_connected".localized : "tables_print_printer_disconnected".localized)
                        .font(.bodyMedium.weight(.semibold))
                        .foregroundColor(.appTextPrimary)

                    Text(printerManager.selectedPrinter?.name ?? "tables_floor_printer_hint".localized)
                        .font(.caption)
                        .foregroundColor(.appTextSecondary)
                }

                Spacer()
            }
            .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
        }
    }

    private func infoRow(label: String, value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: Spacing.md) {
            Text(label)
                .font(.monoCaption)
                .foregroundColor(.appTextSecondary)

            Spacer()

            Text(value)
                .font(.bodyMedium)
                .foregroundColor(.appTextPrimary)
                .multilineTextAlignment(.trailing)
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

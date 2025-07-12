import SwiftUI

struct ReceiptHeaderConfigView: View {
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @Environment(\.dismiss) private var dismiss
    
    @State private var restaurantName: String = ""
    @State private var address: String = ""
    @State private var phone: String = ""
    @State private var hasChanges: Bool = false
    
    var body: some View {
        Form {
                Section {
                    VStack(alignment: .leading, spacing: 16) {
                        // Restaurant Name
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "building.2")
                                    .foregroundColor(.blue)
                                    .frame(width: 20)
                                Text("receipt_header_restaurant_name_label".localized)
                                    .font(.headline)
                            }
                            TextField("receipt_header_restaurant_name_placeholder".localized, text: $restaurantName)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .onChange(of: restaurantName) { _ in hasChanges = true }
                        }
                        
                        // Address
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "location")
                                    .foregroundColor(.blue)
                                    .frame(width: 20)
                                Text("receipt_header_address_label".localized)
                                    .font(.headline)
                            }
                            TextField("receipt_header_address_placeholder".localized, text: $address)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .onChange(of: address) { _ in hasChanges = true }
                        }
                        
                        // Phone
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Image(systemName: "phone")
                                    .foregroundColor(.blue)
                                    .frame(width: 20)
                                Text("receipt_header_phone_label".localized)
                                    .font(.headline)
                            }
                            TextField("receipt_header_phone_placeholder".localized, text: $phone)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .keyboardType(.phonePad)
                                .onChange(of: phone) { _ in hasChanges = true }
                        }
                    }
                    .padding(.vertical, 8)
                } header: {
                    Text("receipt_header_settings_title".localized)
                } footer: {
                    Text("receipt_header_settings_description".localized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section {
                   Button(action: autoFetchSettings) {
                        HStack {
                            Image(systemName: "arrow.clockwise")
                                .foregroundColor(.blue)
                            Text("receipt_header_auto_fetch_button".localized)
                                .foregroundColor(.blue)
                            Spacer()
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    .accessibilityLabel("receipt_header_auto_fetch_button".localized)
                    .accessibilityHint("accessibility_button_hint".localized)
                } header: {
                    Text("receipt_header_auto_fetch_title".localized)
                } footer: {
                    Text("receipt_header_auto_fetch_description".localized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                // Preview Section
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Image(systemName: "doc.text")
                                .foregroundColor(.green)
                            Text("receipt_header_preview_title".localized)
                                .font(.headline)
                                .foregroundColor(.green)
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text(restaurantName.isEmpty ? "Your Restaurant Name" : restaurantName)
                                .font(.headline)
                                .fontWeight(.bold)
                            if !address.isEmpty {
                                Text(address)
                                    .font(.subheadline)
                            }
                            if !phone.isEmpty {
                                Text("Tel: \(phone)")
                                    .font(.subheadline)
                            }
                        }
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .center)
                        .background(Color(.systemGray6))
                        .cornerRadius(8)
                    }
                } header: {
                    Text("receipt_header_preview_section".localized)
                }
            }
            .navigationTitle("receipt_header_config_title".localized)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("printer_cancel_button".localized) {
                        dismiss()
                    }
                    .accessibilityLabel("printer_cancel_button".localized)
                    .accessibilityHint("accessibility_button_hint".localized)
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("printer_save_button".localized) {
                        saveSettings()
                        dismiss()
                    }
                    .accessibilityLabel("printer_save_button".localized)
                    .accessibilityHint("accessibility_button_hint".localized)
                    .fontWeight(.semibold)
                    .disabled(!hasChanges)
                }
            }                .onAppear {
                    loadCurrentSettings()
                }
        }
    
    private func loadCurrentSettings() {
        restaurantName = settingsManager.receiptHeader.restaurantName
        address = settingsManager.receiptHeader.address
        phone = settingsManager.receiptHeader.phone
    }
    
    private func saveSettings() {
        let updatedHeader = ReceiptHeaderSettings(
            restaurantName: restaurantName,
            address: address,
            phone: phone
        )
        settingsManager.updateReceiptHeader(updatedHeader)
    }
    
    private func autoFetchSettings() {
        // Auto-fetch from restaurant settings if available
        restaurantName = settingsManager.restaurantSettings.name
        address = settingsManager.restaurantSettings.address
        phone = settingsManager.restaurantSettings.phone
    }
}

#Preview {
    ReceiptHeaderConfigView()
}

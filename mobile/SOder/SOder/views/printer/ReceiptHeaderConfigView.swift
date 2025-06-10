import SwiftUI

struct ReceiptHeaderConfigView: View {
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @Environment(\.dismiss) private var dismiss
    
    @State private var restaurantName: String = ""
    @State private var address: String = ""
    @State private var phone: String = ""
    
    var body: some View {
        NavigationView {
            Form {
                Section("receipt_header_settings_title") {
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("receipt_header_restaurant_name_label")
                                .font(.headline)
                            TextField("receipt_header_restaurant_name_placeholder", text: $restaurantName)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("receipt_header_address_label")
                                .font(.headline)
                            TextField("receipt_header_address_placeholder", text: $address)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                        }
                        
                        VStack(alignment: .leading, spacing: 4) {
                            Text("receipt_header_phone_label")
                                .font(.headline)
                            TextField("receipt_header_phone_placeholder", text: $phone)
                                .textFieldStyle(RoundedBorderTextFieldStyle())
                                .keyboardType(.phonePad)
                        }
                    }
                }
                
                Section {
                    Button("receipt_header_auto_fetch_button") {
                        autoFetchSettings()
                    }
                    .foregroundColor(.blue)
                }
            }
            .navigationTitle("receipt_header_config_title")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("printer_cancel_button") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("printer_save_button") {
                        saveSettings()
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .onAppear {
                loadCurrentSettings()
            }
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

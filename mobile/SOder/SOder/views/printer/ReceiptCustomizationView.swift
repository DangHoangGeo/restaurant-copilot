import SwiftUI

struct ReceiptCustomizationView: View {
    @StateObject private var settingsManager = PrinterSettingsManager.shared
    @State private var selectedEncoding: String.Encoding = .utf8
    @State private var customTemplate: String = ""
    @State private var showingPreview = false
    @State private var isLoading = false
    
    private let availableEncodings: [(String.Encoding, String)] = [
        (.utf8, "UTF-8"),
        (.shiftJIS, "Shift JIS"),
        (.japaneseEUC, "Japanese EUC"),
        (.iso2022JP, "ISO 2022 JP")
    ]
    
    var body: some View {
        Form {
                Section("encoding_settings".localized) {
                    Picker("receipt_encoding".localized, selection: $selectedEncoding) {
                        ForEach(availableEncodings, id: \.0.rawValue) { encoding in
                            Text(encoding.1).tag(encoding.0)
                        }
                    }
                    .pickerStyle(MenuPickerStyle())
                    .accessibilityLabel("receipt_encoding".localized)
                    .accessibilityHint("Select the character encoding for receipt printing")
                    
                    Text("encoding_description".localized)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Section("custom_template".localized) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("receipt_template".localized)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        TextEditor(text: $customTemplate)
                            .font(.system(.caption, design: .monospaced))
                            .frame(minHeight: 200)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                            .accessibilityLabel("receipt_template".localized)
                            .accessibilityHint("Enter custom receipt template using template syntax")
                        
                        if customTemplate.isEmpty {
                            Text("template_placeholder".localized)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Section("template_help".localized) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("available_variables".localized)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        TemplateVariableRow(variable: "{{restaurant.name}}", description: "restaurant_name_desc".localized)
                        TemplateVariableRow(variable: "{{order.id}}", description: "order_id_desc".localized)
                        TemplateVariableRow(variable: "{{order.table_name}}", description: "table_name_desc".localized)
                        TemplateVariableRow(variable: "{{#items}}...{{/items}}", description: "items_loop_desc".localized)
                        TemplateVariableRow(variable: "{{quantity}}", description: "item_quantity_desc".localized)
                        TemplateVariableRow(variable: "{{name}}", description: "item_name_desc".localized)
                        TemplateVariableRow(variable: "{{price}}", description: "item_price_desc".localized)
                        TemplateVariableRow(variable: "{{total_price}}", description: "order_total_desc".localized)
                        
                        Text("format_tags".localized)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .padding(.top, 8)
                        
                        TemplateVariableRow(variable: "[CENTER]...[/CENTER]", description: "center_align_desc".localized)
                        TemplateVariableRow(variable: "[BOLD]...[/BOLD]", description: "bold_text_desc".localized)
                        TemplateVariableRow(variable: "[SEPARATOR]", description: "separator_desc".localized)
                        TemplateVariableRow(variable: "[CUT]", description: "cut_paper_desc".localized)
                    }
                }
                
                Section("actions".localized) {
                    Button("test_template".localized) {
                        showingPreview = true
                    }
                    .frame(maxWidth: .infinity)
                    .buttonStyle(.bordered)
                    .accessibilityLabel("test_template".localized)
                    .accessibilityHint("Preview how the receipt will look with current settings")
                    
                    Button("load_default_template".localized) {
                        loadDefaultTemplate()
                    }
                    .frame(maxWidth: .infinity)
                    .buttonStyle(.bordered)
                    .foregroundColor(.blue)
                    .accessibilityLabel("load_default_template".localized)
                    .accessibilityHint("Load the default template for customization")
                    
                    Button("reset_to_default".localized) {
                        resetToDefault()
                    }
                    .frame(maxWidth: .infinity)
                    .buttonStyle(.bordered)
                    .foregroundColor(.orange)
                    .accessibilityLabel("reset_to_default".localized)
                    .accessibilityHint("Reset template and encoding to default values")
                }
            }
            .navigationTitle("receipt_customization".localized)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("save".localized) {
                        saveSettings()
                    }
                    .fontWeight(.semibold)
                    .accessibilityLabel("accessibility_save_printer_label".localized)
                    .accessibilityHint("accessibility_save_printer_hint".localized)
                }
            }
            .sheet(isPresented: $showingPreview) {
                ReceiptPreviewView(
                    encoding: selectedEncoding,
                    template: customTemplate.isEmpty ? nil : customTemplate
                )
            }
            .onAppear {
                loadCurrentSettings()
            }
        }
    
    private func loadCurrentSettings() {
        selectedEncoding = settingsManager.receiptEncoding
        customTemplate = settingsManager.customReceiptTemplate
    }
    
    private func loadDefaultTemplate() {
        customTemplate = getDefaultTemplate()
    }
    
    private func resetToDefault() {
        customTemplate = ""
        selectedEncoding = .utf8
    }
    
    private func saveSettings() {
        settingsManager.receiptEncoding = selectedEncoding
        settingsManager.customReceiptTemplate = customTemplate
        
        // Save will be handled by the settings manager's internal save mechanism
    }
    
    private func getDefaultTemplate() -> String {
        return """
        [CENTER][BOLD]{{restaurant.name}}[/BOLD][/CENTER]
        [CENTER]{{restaurant.address}}[/CENTER]
        [CENTER]{{restaurant.phone}}[/CENTER]
        
        [SEPARATOR]
        
        Order: {{order.id}}
        Table: {{order.table_name}}
        Date: {{order.date}}
        Time: {{order.time}}
        
        [SEPARATOR]
        
        {{#items}}
        {{quantity}}x {{name}} - ¥{{price}}
        {{#notes}}  Note: {{notes}}{{/notes}}
        {{/items}}
        
        [SEPARATOR]
        
        [BOLD]Total: ¥{{total_price}}[/BOLD]
        
        [CENTER]Thank you for your visit![/CENTER]
        [CENTER]ありがとうございました！[/CENTER]
        [CUT]
        """
    }
}

struct TemplateVariableRow: View {
    let variable: String
    let description: String
    
    var body: some View {
        HStack {
            Text(variable)
                .font(.system(.caption, design: .monospaced))
                .foregroundColor(.blue)
                .frame(maxWidth: .infinity, alignment: .leading)
            
            Text(description)
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(variable): \(description)")
    }
}

struct ReceiptPreviewView: View {
    let encoding: String.Encoding
    let template: String?
    
    @State private var previewText = ""
    @State private var isLoading = true
    
    var body: some View {
        NavigationView {
            VStack {
                if isLoading {
                    ProgressView("generating_preview".localized)
                        .padding()
                } else {
                    ScrollView {
                        Text(previewText)
                            .font(.system(.caption, design: .monospaced))
                            .padding()
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            .navigationTitle("receipt_preview".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("done".localized) {
                        // Dismiss handled by parent sheet
                    }
                }
            }
            .onAppear {
                generatePreview()
            }
        }
        .navigationViewStyle(StackNavigationViewStyle()) // Ensure stack style for sheet presentation
    }
    
    private func generatePreview() {
        Task {
            let formatter = PrintFormatter()
            let testData = generateTestData()
            
            let templateToUse = template ?? getDefaultTemplate()
            let previewData = formatter.format(template: templateToUse, data: testData, encoding: encoding)
            
            await MainActor.run {
                previewText = String(data: previewData, encoding: encoding) ?? "preview_not_available".localized
                isLoading = false
            }
        }
    }
    
    private func generateTestData() -> [String: Any] {
        return [
            "restaurant": [
                "name": "Test Restaurant",
                "address": "123 Test Street, Tokyo",
                "phone": "080-1234-5678"
            ],
            "order": [
                "id": "001",
                "table_name": "Table 1",
                "date": "2025/01/15",
                "time": "12:34"
            ],
            "items": [
                [
                    "quantity": 2, 
                    "name": "Chicken Teriyaki", 
                    "price": 800,
                    "notes": "Extra sauce"
                ],
                [
                    "quantity": 1, 
                    "name": "Miso Soup", 
                    "price": 300,
                    "notes": ""
                ],
                [
                    "quantity": 1, 
                    "name": "Green Tea", 
                    "price": 200,
                    "notes": ""
                ]
            ],
            "total_price": 2100
        ]
    }
    
    private func getDefaultTemplate() -> String {
        return """
        [CENTER][BOLD]{{restaurant.name}}[/BOLD][/CENTER]
        [CENTER]{{restaurant.address}}[/CENTER]
        [CENTER]{{restaurant.phone}}[/CENTER]
        
        [SEPARATOR]
        
        Order: {{order.id}}
        Table: {{order.table_name}}
        Date: {{order.date}}
        Time: {{order.time}}
        
        [SEPARATOR]
        
        {{#items}}
        {{quantity}}x {{name}} - ¥{{price}}
        {{#notes}}  Note: {{notes}}{{/notes}}
        {{/items}}
        
        [SEPARATOR]
        
        [BOLD]Total: ¥{{total_price}}[/BOLD]
        
        [CENTER]Thank you for your visit![/CENTER]
        [CENTER]ありがとうございました！[/CENTER]
        [CUT]
        """
    }
}

#Preview {
    ReceiptCustomizationView()
}

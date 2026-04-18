import SwiftUI

struct ReceiptCustomizationView: View {
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared
    @State private var showingPreview = false
    @State private var editingHeader: ReceiptHeaderSettings
    @State private var showSaveSuccessAlert = false

    init() {
        _editingHeader = State(initialValue: PrinterSettingsManager.shared.receiptHeader)
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Spacing.lg) {
                standardReceiptCard
                languageSection
                businessDetailsSection
                optionalDetailsSection
                actionsSection
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.lg)
        }
        .background(Color.appBackground.ignoresSafeArea())
        .navigationTitle("receipt_customization".localized)
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("save".localized) { persistSettings(showAlert: true) }
                    .fontWeight(.semibold)
                    .accessibilityLabel("accessibility_save_printer_label".localized)
                    .accessibilityHint("accessibility_save_printer_hint".localized)
            }
        }
        .sheet(isPresented: $showingPreview) {
            ReceiptPreviewView()
        }
        .alert("receipt_settings_saved_title".localized, isPresented: $showSaveSuccessAlert) {
            Button("ok".localized) { }
        } message: {
            Text("receipt_settings_saved_message".localized)
        }
        .onAppear {
            settingsManager.syncFromCurrentRestaurant()
            loadCurrentSettings()
        }
    }

    private func loadCurrentSettings() {
        editingHeader = settingsManager.receiptHeader
    }

    private var standardReceiptCard: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            Text("printer_standard_receipt_title".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            Text("printer_standard_receipt_subtitle".localized)
                .font(.bodyMedium)
                .foregroundColor(.appTextSecondary)

            Button {
                settingsManager.syncFromCurrentRestaurant()
                editingHeader = settingsManager.receiptHeader
            } label: {
                HStack {
                    Image(systemName: "arrow.clockwise")
                    Text("receipt_header_auto_fetch_button".localized)
                }
            }
            .buttonStyle(SecondaryButtonStyle())
        }
        .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.xl, surfaceColor: Color.appSurface.opacity(0.94))
    }

    private var languageSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            sectionHeader(title: "languages_section_title".localized, icon: "globe")

            simplePickerRow(
                icon: "doc.text",
                title: "receipt_language_title".localized,
                selection: $settingsManager.selectedReceiptLanguage
            )

            simplePickerRow(
                icon: "list.clipboard",
                title: "kitchen_language_title".localized,
                selection: $settingsManager.selectedKitchenLanguage
            )
        }
    }

    private var businessDetailsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            sectionHeader(title: "restaurant_information_title".localized, icon: "building.2")

            VStack(alignment: .leading, spacing: Spacing.md) {
                TextField("restaurant_name_placeholder".localized, text: $editingHeader.restaurantName)
                    .textFieldStyle(RoundedBorderTextFieldStyle())

                TextField("address_placeholder".localized, text: $editingHeader.address)
                    .textFieldStyle(RoundedBorderTextFieldStyle())

                TextField("phone_number_placeholder".localized, text: $editingHeader.phone)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.phonePad)

                TextField("website_optional_placeholder".localized, text: $editingHeader.website)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
                    .keyboardType(.URL)
                    .textInputAutocapitalization(.never)

                Toggle("show_website_on_receipt".localized, isOn: $editingHeader.showWebsite)
                    .toggleStyle(SwitchToggleStyle(tint: .appPrimary))
            }
            .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
        }
    }

    private var optionalDetailsSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            sectionHeader(title: "printer_optional_details_title".localized, icon: "slider.horizontal.3")

            VStack(alignment: .leading, spacing: Spacing.md) {
                TextField("tax_code_optional_placeholder".localized, text: $editingHeader.taxCode)
                    .textFieldStyle(RoundedBorderTextFieldStyle())

                Toggle("show_tax_code_on_receipt".localized, isOn: $editingHeader.showTaxCode)
                    .toggleStyle(SwitchToggleStyle(tint: .appPrimary))

                TextField("thank_you_message_placeholder".localized, text: $editingHeader.footerMessage)
                    .textFieldStyle(RoundedBorderTextFieldStyle())
            }
            .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
        }
    }

    private var actionsSection: some View {
        VStack(spacing: Spacing.md) {
            Button {
                persistSettings(showAlert: false)
                showingPreview = true
            } label: {
                HStack {
                    Image(systemName: "doc.text.magnifyingglass")
                    Text("save_and_preview".localized)
                }
            }
            .buttonStyle(PrimaryButtonStyle())

            Text("printer_receipt_preview_help".localized)
                .font(.caption)
                .foregroundColor(.appTextSecondary)
        }
    }

    private func sectionHeader(title: String, icon: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: icon)
                .foregroundColor(.appPrimary)
            Text(title)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)
        }
    }

    private func simplePickerRow(
        icon: String,
        title: String,
        selection: Binding<PrintLanguage>
    ) -> some View {
        HStack {
            Image(systemName: icon)
                .foregroundColor(.appPrimary)

            Text(title)
                .font(.bodyMedium.weight(.semibold))
                .foregroundColor(.appTextPrimary)

            Spacer()

            Picker("", selection: selection) {
                ForEach(PrintLanguage.allCases, id: \.self) { language in
                    Text(language.displayName).tag(language)
                }
            }
            .pickerStyle(.menu)
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
    }

    private func persistSettings(showAlert: Bool) {
        settingsManager.setReceiptTheme(.standard)
        settingsManager.setKitchenTheme(.standard)
        settingsManager.updateReceiptHeader(editingHeader)
        if showAlert { showSaveSuccessAlert = true }
    }
}

// MARK: - Preview (uses real header/footer + fake order data)
struct ReceiptPreviewView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared
    @State private var previewText = ""
    @State private var isLoading = true
    
    // Localize a key for a specific receipt language (independent of UI language)
    private func tr(_ key: String, for language: PrintLanguage) -> String {
        if let path = Bundle.main.path(forResource: language.rawValue, ofType: "lproj"),
           let bundle = Bundle(path: path) {
            return NSLocalizedString(key, bundle: bundle, comment: "")
        }
        if let path = Bundle.main.path(forResource: "en", ofType: "lproj"),
           let bundle = Bundle(path: path) {
            return NSLocalizedString(key, bundle: bundle, comment: "")
        }
        return key
    }
    
    var body: some View {
        NavigationView {
            VStack {
                if isLoading {
                    ProgressView("generating_preview".localized).padding()
                } else {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 0) {
                            receiptPreviewContent
                        }
                        .padding(.horizontal, Spacing.md)
                        .padding(.vertical, Spacing.lg)
                    }
                    .background(Color.appBackground)
                }
            }
            .navigationTitle("receipt_preview".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("done".localized) { dismiss() }
                }
            }
            .onAppear { generatePreview() }
        }
        .navigationViewStyle(StackNavigationViewStyle())
    }
    
    private var receiptPreviewContent: some View {
        VStack(alignment: .leading, spacing: 2) {
            VStack(alignment: .leading, spacing: 0) {
                Text(previewText)
                    .font(.system(.caption, design: .monospaced))
                    .lineSpacing(1)
                    .foregroundColor(.black)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(Spacing.md)
            .background(Color.white)
            .cornerRadius(CornerRadius.xs)
            .shadow(color: .black.opacity(0.1), radius: 2, x: 0, y: 1)
            Text("📄 " + "receipt_preview_simulation".localized)
                .font(.caption2)
                .foregroundColor(.appTextSecondary)
                .padding(.top, Spacing.xs)
        }
    }
    
    private func generatePreview() {
        Task {
            let selectedLanguage = settingsManager.selectedReceiptLanguage
            let selectedTheme = settingsManager.selectedReceiptTheme
            let themeManager = TemplateThemeManager()
            
            // Build data (real header/footer + fake order)
            var testData = generateLocalizedTestData(for: selectedLanguage)
            
            // Inject i18n dictionary for template labels
            testData["i18n"] = buildI18nDictionary(for: selectedLanguage)
            
            let templateToUse = themeManager.loadTemplate(type: .receipt, language: selectedLanguage, theme: selectedTheme) ?? getDefaultTemplate()
            
            let renderer = TemplateRenderer()
            let renderedString = renderer.render(template: templateToUse, data: testData)
            let cleanedPreview = processForPreview(renderedString)
            
            await MainActor.run {
                previewText = cleanedPreview
                isLoading = false
            }
        }
    }
    
    private func buildI18nDictionary(for language: PrintLanguage) -> [String: String] {
        let keys = [
            "receipt",
            "order",
            "table",
            "date",
            "time",
            "note",
            "subtotal",
            "tax",
            "discount",
            "total",
            "thank_you",
            "thank_you_short",
            "thank_you_dining",
            "tax_code",
            "kitchen_order",
            "special_instructions",
            "prepared_by",
            "special_notes",
            "items",
            "guests"
        ]
        var dict: [String: String] = [:]
        for k in keys { dict[k] = tr("tpl_\(k)", for: language) }
        return dict
    }
    
    private func generateLocalizedTestData(for language: PrintLanguage) -> [String: Any] {
        let currentDate = Date()
        let dateFormatter = DateFormatter()
        dateFormatter.dateStyle = .short
        dateFormatter.timeStyle = .short
        
        // Get restaurant settings
        let restaurantSettings = settingsManager.receiptHeader
        
        return [
            "restaurant": [
                "name": restaurantSettings.restaurantName.isEmpty ? tr("test_restaurant_name", for: language) : restaurantSettings.restaurantName,
                "address": restaurantSettings.address.isEmpty ? tr("test_restaurant_address", for: language) : restaurantSettings.address,
                "phone": restaurantSettings.phone.isEmpty ? tr("test_restaurant_phone", for: language) : restaurantSettings.phone,
                "website": restaurantSettings.showWebsite ? (restaurantSettings.website.isEmpty ? tr("test_restaurant_website", for: language) : restaurantSettings.website) : ""
            ],
            "order": [
                "id": tr("test_order_id", for: language),
                "table_name": tr("test_table_name", for: language),
                "date": dateFormatter.string(from: currentDate),
                "time": DateFormatter.localizedString(from: currentDate, dateStyle: .none, timeStyle: .short),
                "guest_count": 4
            ],
            "items": [
                [
                    "quantity": 2,
                    "name": tr("test_item_1_name", for: language),
                    "price": 1200,
                    "notes": tr("test_item_1_notes", for: language)
                ],
                [
                    "quantity": 1,
                    "name": tr("test_item_2_name", for: language),
                    "price": 150,
                    "notes": ""
                ],
                [
                    "quantity": 1,
                    "name": tr("test_item_3_name", for: language),
                    "price": 200,
                    "notes": ""
                ]
            ],
            "subtotal": 2750,
            "tax": 275,
            "total_price": 3025,
            "special_instructions": tr("test_special_instructions", for: language),
            "custom_footer": restaurantSettings.footerMessage.isEmpty ? tr("test_thank_you_message", for: language) : restaurantSettings.footerMessage,
            "promotional_message": restaurantSettings.showPromotionalText ?
                (restaurantSettings.promotionalText.isEmpty ? tr("test_promotional_message", for: language) : restaurantSettings.promotionalText) : "",
            "tax_code": restaurantSettings.showTaxCode ?
                (restaurantSettings.taxCode.isEmpty ? tr("test_tax_code", for: language) : restaurantSettings.taxCode) : ""
        ]
    }
    
    private func processForPreview(_ text: String) -> String {
        var result = text
        
        // Remove or replace printer command tags for better preview readability
        result = result.replacingOccurrences(of: "[CENTER]", with: "")
        result = result.replacingOccurrences(of: "[/CENTER]", with: "")
        result = result.replacingOccurrences(of: "[BOLD]", with: "**")
        result = result.replacingOccurrences(of: "[/BOLD]", with: "**")
        result = result.replacingOccurrences(of: "[LARGE]", with: "")
        result = result.replacingOccurrences(of: "[/LARGE]", with: "")
        result = result.replacingOccurrences(of: "[WIDE]", with: "")
        result = result.replacingOccurrences(of: "[/WIDE]", with: "")
        result = result.replacingOccurrences(of: "[LEFT]", with: "")
        result = result.replacingOccurrences(of: "[/LEFT]", with: "")
        result = result.replacingOccurrences(of: "[RIGHT]", with: "")
        result = result.replacingOccurrences(of: "[/RIGHT]", with: "")
        result = result.replacingOccurrences(of: "[SEPARATOR]", with: String(repeating: "-", count: 48))
        result = result.replacingOccurrences(of: "[CUT]", with: "\n" + String(repeating: "✂", count: 3) + "\n")
        
        // Process row/column layout for preview
        result = processRowColumnsForPreview(result)
        
        // Clean up extra whitespace but preserve intentional spacing
        let lines = result.components(separatedBy: .newlines)
        let cleanedLines = lines.map { line in
            line.trimmingCharacters(in: .whitespaces)
        }
        
        return cleanedLines.joined(separator: "\n")
    }
    
    private func processRowColumnsForPreview(_ text: String) -> String {
        var result = text
        
        // Remove row tags
        result = result.replacingOccurrences(of: "[ROW]", with: "")
        result = result.replacingOccurrences(of: "[/ROW]", with: "")
        
        // Process column layout for preview (simulate 48-character width)
        let columnPattern = "\\[COL_LEFT\\](.*?)\\[/COL_LEFT\\].*?\\[COL_RIGHT\\](.*?)\\[/COL_RIGHT\\]"
        let regex = try! NSRegularExpression(pattern: columnPattern, options: [])
        let matches = regex.matches(in: result, options: [], range: NSRange(result.startIndex..., in: result))
        
        for match in matches.reversed() {
            if let matchRange = Range(match.range, in: result),
               let leftRange = Range(match.range(at: 1), in: result),
               let rightRange = Range(match.range(at: 2), in: result) {
                
                let leftContent = String(result[leftRange]).trimmingCharacters(in: .whitespaces)
                let rightContent = String(result[rightRange]).trimmingCharacters(in: .whitespaces)
                
                // Format columns for 48-character thermal printer width
                let formatted = formatColumnsForPreview(left: leftContent, right: rightContent, totalWidth: 48)
                result.replaceSubrange(matchRange, with: formatted)
            }
        }
        
        return result
    }
    
    private func formatColumnsForPreview(left: String, right: String, totalWidth: Int) -> String {
        let leftLength = left.count
        let rightLength = right.count
        let availableSpace = totalWidth - leftLength - rightLength
        
        if availableSpace > 0 {
            let spacing = String(repeating: " ", count: availableSpace)
            return left + spacing + right
        } else {
            // If content is too long, truncate left content
            let maxLeftLength = totalWidth - rightLength - 1
            if maxLeftLength > 0 {
                let truncatedLeft = String(left.prefix(maxLeftLength))
                return truncatedLeft + " " + right
            } else {
                return left + "\n" + right
            }
        }
    }
    
    private func getDefaultTemplate() -> String {
        // Localized default template using i18n keys
        return """
        [CENTER][BOLD]{{restaurant.name}}[/BOLD][/CENTER]
        [CENTER]{{restaurant.address}}[/CENTER]
        {{#restaurant.phone}}[CENTER]{{restaurant.phone}}[/CENTER]{{/restaurant.phone}}
        {{#restaurant.website}}[CENTER]{{restaurant.website}}[/CENTER]{{/restaurant.website}}
        
        [SEPARATOR]
        
        {{i18n.order}}: {{order.id}}
        {{i18n.table}}: {{order.table_name}}
        {{i18n.date}}: {{order.date}}
        {{i18n.time}}: {{order.time}}
        {{#order.guest_count}}{{i18n.guests}}: {{order.guest_count}}{{/order.guest_count}}
        
        [SEPARATOR]
        
        {{#items}}
        [ROW]
        [COL_LEFT]{{quantity}}x {{name}}[/COL_LEFT]
        [COL_RIGHT]¥{{price}}[/COL_RIGHT]
        [/ROW]
        {{#notes}}  {{i18n.note}}: {{notes}}{{/notes}}
        {{/items}}
        
        {{#special_instructions}}
        [SEPARATOR]
        {{i18n.special_notes}}: {{special_instructions}}
        {{/special_instructions}}
        
        [SEPARATOR]
        
        [ROW]
        [COL_LEFT]{{i18n.subtotal}}:[/COL_LEFT]
        [COL_RIGHT]¥{{subtotal}}[/COL_RIGHT]
        [/ROW]
        [ROW]
        [COL_LEFT]{{i18n.tax}}:[/COL_LEFT]
        [COL_RIGHT]¥{{tax}}[/COL_RIGHT]
        [/ROW]
        [ROW]
        [COL_LEFT][BOLD]{{i18n.total}}:[/BOLD][/COL_LEFT]
        [COL_RIGHT][BOLD]¥{{total_price}}[/BOLD][/COL_RIGHT]
        [/ROW]
        
        {{#custom_footer}}[CENTER]{{custom_footer}}[/CENTER]{{/custom_footer}}
        {{#promotional_message}}[CENTER]{{promotional_message}}[/CENTER]{{/promotional_message}}
        {{#tax_code}}[CENTER]{{i18n.tax_code}}: {{tax_code}}[/CENTER]{{/tax_code}}
        [CUT]
        """
    }
}

#Preview {
    ReceiptCustomizationView()
}

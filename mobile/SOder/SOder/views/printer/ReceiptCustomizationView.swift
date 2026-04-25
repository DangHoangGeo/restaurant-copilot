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
                Button("save".localized) { persistSettings() }
                    .fontWeight(.semibold)
                    .accessibilityLabel("accessibility_save_printer_label".localized)
                    .accessibilityHint("accessibility_save_printer_hint".localized)
            }
        }
        .sheet(isPresented: $showingPreview) {
            ReceiptPreviewView(headerOverride: editingHeader)
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

            receiptRenderModeRow
        }
    }

    private var receiptRenderModeRow: some View {
        HStack {
            Image(systemName: "photo.on.rectangle")
                .foregroundColor(.appPrimary)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                Text("receipt_render_mode_title".localized)
                    .font(.bodyMedium.weight(.semibold))
                    .foregroundColor(.appTextPrimary)

                Text("receipt_render_mode_hint".localized)
                    .font(.caption)
                    .foregroundColor(.appTextSecondary)
            }

            Spacer()

            Picker("", selection: $settingsManager.receiptPrintRenderMode) {
                ForEach(ReceiptPrintRenderMode.allCases, id: \.self) { mode in
                    Text(mode.displayName).tag(mode)
                }
            }
            .pickerStyle(.menu)
        }
        .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
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
                showingPreview = true
            } label: {
                HStack {
                    Image(systemName: "doc.text.magnifyingglass")
                    Text("preview_receipt_button".localized)
                }
            }
            .buttonStyle(SecondaryButtonStyle())

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

    private func persistSettings() {
        settingsManager.setReceiptTheme(.standard)
        settingsManager.setKitchenTheme(.standard)
        settingsManager.updateReceiptHeader(editingHeader)
        showSaveSuccessAlert = true
    }
}

// MARK: - Preview (uses real header/footer + fake order data)
struct ReceiptPreviewView: View {
    var headerOverride: ReceiptHeaderSettings?

    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var settingsManager = PrinterSettingsManager.shared
    @State private var previewText = ""
    @State private var isLoading = true

    private var previewLanguage: PrintLanguage {
        settingsManager.selectedReceiptLanguage
    }

    private var previewHeader: ReceiptHeaderSettings {
        headerOverride ?? settingsManager.receiptHeader
    }
    
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
        VStack(alignment: .center, spacing: Spacing.sm) {
            VStack(alignment: .leading, spacing: Spacing.md) {
                VStack(alignment: .center, spacing: Spacing.xs) {
                    Text(previewRestaurantName)
                        .font(.system(size: 20, weight: .bold, design: .default))
                        .foregroundColor(.black)
                        .multilineTextAlignment(.center)

                    if !previewHeader.address.isEmpty {
                        Text(previewHeader.address)
                            .font(.system(size: 12, weight: .regular, design: .default))
                            .foregroundColor(.black.opacity(0.78))
                            .multilineTextAlignment(.center)
                    }

                    if !previewHeader.phone.isEmpty {
                        Text("\(tr("tpl_phone", for: previewLanguage)): \(previewHeader.phone)")
                            .font(.system(size: 12, weight: .regular, design: .default))
                            .foregroundColor(.black.opacity(0.78))
                    }

                    if previewHeader.showTaxCode, !previewHeader.taxCode.isEmpty {
                        Text("\(tr("tpl_tax_code", for: previewLanguage)): \(previewHeader.taxCode)")
                            .font(.system(size: 11, weight: .regular, design: .default))
                            .foregroundColor(.black.opacity(0.72))
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.top, Spacing.md)

                Text(tr("tpl_receipt", for: previewLanguage))
                    .font(.system(size: 15, weight: .bold, design: .default))
                    .foregroundColor(.black)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.top, Spacing.xs)

                VStack(alignment: .leading, spacing: Spacing.xs) {
                    previewMetaRow(label: tr("tpl_order", for: previewLanguage), value: tr("test_order_id", for: previewLanguage))
                    previewMetaRow(label: tr("tpl_table", for: previewLanguage), value: tr("test_table_name", for: previewLanguage))
                    previewMetaRow(label: tr("tpl_date", for: previewLanguage), value: DateFormatter.localizedString(from: Date(), dateStyle: .short, timeStyle: .none))
                    previewMetaRow(label: tr("tpl_time", for: previewLanguage), value: DateFormatter.localizedString(from: Date(), dateStyle: .none, timeStyle: .short))
                }
                .padding(.top, Spacing.xs)

                VStack(spacing: Spacing.sm) {
                    previewItemRow(
                        name: tr("test_item_1_name", for: previewLanguage),
                        quantity: 2,
                        total: "¥2,400",
                        size: tr("test_size_large", for: previewLanguage),
                        toppings: [tr("test_topping_cheese", for: previewLanguage), tr("test_topping_egg", for: previewLanguage)]
                    )
                    previewItemRow(name: tr("test_item_2_name", for: previewLanguage), quantity: 1, total: "¥150", size: tr("test_size_regular", for: previewLanguage))
                    previewItemRow(name: tr("test_item_3_name", for: previewLanguage), quantity: 1, total: "¥200")
                }
                .padding(.top, Spacing.sm)

                VStack(spacing: Spacing.xs) {
                    Divider()
                        .background(Color.black.opacity(0.42))
                        .padding(.bottom, Spacing.xs)
                    previewAmountRow(label: tr("tpl_subtotal", for: previewLanguage), value: "¥2,750")
                    previewAmountRow(label: tr("tpl_discount", for: previewLanguage), value: "-¥300")
                    previewMetaRow(label: tr("discount_code", for: previewLanguage), value: "WELCOME300")
                    previewAmountRow(label: tr("tpl_tax", for: previewLanguage), value: "¥245")
                    Divider()
                        .background(Color.black.opacity(0.35))
                    previewAmountRow(label: tr("tpl_total", for: previewLanguage), value: "¥2,695", emphasized: true)
                }
                .padding(.top, Spacing.sm)

                VStack(alignment: .center, spacing: Spacing.xs) {
                    Text(previewHeader.footerMessage.isEmpty ? tr("tpl_thank_you", for: previewLanguage) : previewHeader.footerMessage)
                        .font(.system(size: 12, weight: .regular, design: .default))
                        .foregroundColor(.black.opacity(0.8))
                        .multilineTextAlignment(.center)

                    if previewHeader.showWebsite, !previewHeader.website.isEmpty {
                        Text(previewHeader.website)
                            .font(.system(size: 11, weight: .regular, design: .default))
                            .foregroundColor(.black.opacity(0.72))
                    }

                    Text("powered by coorder.ai")
                        .font(.system(size: 10, weight: .regular, design: .monospaced))
                        .foregroundColor(.black.opacity(0.55))
                        .padding(.top, Spacing.xs)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, Spacing.md)
                .padding(.bottom, Spacing.lg)
            }
            .padding(.horizontal, Spacing.lg)
            .background(Color.white)
            .frame(maxWidth: 360)
            .clipShape(RoundedRectangle(cornerRadius: CornerRadius.sm))
            .shadow(color: .black.opacity(0.14), radius: 12, x: 0, y: 6)

            Text("receipt_preview_simulation".localized)
                .font(.caption2)
                .foregroundColor(.appTextSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private var previewRestaurantName: String {
        let configured = previewHeader.restaurantName.trimmingCharacters(in: .whitespacesAndNewlines)
        return configured.isEmpty ? tr("test_restaurant_name", for: previewLanguage) : configured
    }

    private func previewMetaRow(label: String, value: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.system(size: 11, weight: .regular, design: .monospaced))
                .foregroundColor(.black.opacity(0.58))
            Spacer()
            Text(value)
                .font(.system(size: 12, weight: .medium, design: .monospaced))
                .foregroundColor(.black)
                .multilineTextAlignment(.trailing)
        }
    }

    private func previewItemRow(name: String, quantity: Int, total: String, size: String? = nil, toppings: [String] = []) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xxs) {
            HStack(alignment: .firstTextBaseline) {
                Text("\(quantity)x \(name)")
                    .font(.system(size: 13, weight: .semibold, design: .default))
                    .foregroundColor(.black)
                    .lineLimit(2)

                Spacer()

                Text(total)
                    .font(.system(size: 13, weight: .medium, design: .monospaced))
                    .foregroundColor(.black)
            }

            if let size, !size.isEmpty {
                Text("\(tr("tpl_size", for: previewLanguage)): \(size)")
                    .font(.system(size: 11, weight: .regular, design: .default))
                    .foregroundColor(.black.opacity(0.62))
            }

            if !toppings.isEmpty {
                Text("\(tr("tpl_toppings", for: previewLanguage)): \(toppings.joined(separator: ", "))")
                    .font(.system(size: 11, weight: .regular, design: .default))
                    .foregroundColor(.black.opacity(0.62))
            }
        }
    }

    private func previewAmountRow(label: String, value: String, emphasized: Bool = false) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(label)
                .font(.system(size: emphasized ? 15 : 12, weight: emphasized ? .bold : .regular, design: .default))
                .foregroundColor(.black)

            Spacer()

            Text(value)
                .font(.system(size: emphasized ? 16 : 12, weight: emphasized ? .bold : .medium, design: .monospaced))
                .foregroundColor(.black)
        }
    }
    
    private func generatePreview() {
        Task {
            await MainActor.run {
                previewText = ""
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
        let restaurantSettings = headerOverride ?? settingsManager.receiptHeader
        
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
        result = processRowColumnsForPreview(result)

        var previewLines: [String] = []
        var previousLineWasBlank = false

        for rawLine in result.components(separatedBy: .newlines) {
            guard !rawLine.contains("[CUT]") else { continue }

            var line = rawLine
            let isCentered = line.contains("[CENTER]")
            let isRightAligned = line.contains("[RIGHT]")

            line = line.replacingOccurrences(of: "[SEPARATOR]", with: String(repeating: "-", count: 48))
            line = stripPreviewTags(from: line)

            if line.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                if !previousLineWasBlank {
                    previewLines.append("")
                    previousLineWasBlank = true
                }
                continue
            }

            previousLineWasBlank = false
            let content = line.trimmingCharacters(in: .whitespaces)
            if isCentered {
                previewLines.append(alignPreviewLine(content, width: 42, alignment: .center))
            } else if isRightAligned {
                previewLines.append(alignPreviewLine(content, width: 42, alignment: .right))
            } else {
                previewLines.append(line)
            }
        }

        while previewLines.first?.isEmpty == true {
            previewLines.removeFirst()
        }

        while previewLines.last?.isEmpty == true {
            previewLines.removeLast()
        }

        return previewLines.joined(separator: "\n")
    }

    private enum PreviewAlignment {
        case center
        case right
    }

    private func alignPreviewLine(_ text: String, width: Int, alignment: PreviewAlignment) -> String {
        guard text.count < width else { return text }
        let padding = width - text.count

        switch alignment {
        case .center:
            return String(repeating: " ", count: padding / 2) + text
        case .right:
            return String(repeating: " ", count: padding) + text
        }
    }

    private func stripPreviewTags(from text: String) -> String {
        var result = text
        let tags = [
            "[CENTER]", "[/CENTER]",
            "[BOLD]", "[/BOLD]",
            "[LARGE]", "[/LARGE]",
            "[WIDE]", "[/WIDE]",
            "[LEFT]", "[/LEFT]",
            "[RIGHT]", "[/RIGHT]"
        ]

        for tag in tags {
            result = result.replacingOccurrences(of: tag, with: "")
        }

        return result
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

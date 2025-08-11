import SwiftUI

struct CheckoutView: View {
    let order: Order
    let onComplete: () -> Void
    
    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var printerManager: PrinterManager

    @State private var discountCode = ""
    @State private var discountPercentage: Double = 0
    @State private var customDiscountAmount: Double = 0
    @State private var usePercentageDiscount = true
    @State private var isProcessing = false
    @State private var showingError = false
    @State private var errorMessage = ""
    @State private var showingSuccess = false
    @State private var receivedAmount: Double = 0
    @State private var paymentMethod: PaymentMethod = .cash
    @State private var showingDiscount = false
    
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var localizationManager: LocalizationManager
    @EnvironmentObject private var supabaseManager: SupabaseManager
    
    // Focus state for cash input
    @FocusState private var isReceivedAmountFocused: Bool
    
    enum PaymentMethod: String, CaseIterable {
        case cash = "cash"
        case card = "card"
        case paypay = "paypay"
        
        var displayName: String {
            switch self {
            case .cash: return "cash".localized
            case .card: return "card".localized
            case .paypay: return "paypay".localized
            }
        }
        
        var icon: String {
            switch self {
            case .cash: return "yensign.circle"
            case .card: return "creditcard"
            case .paypay: return "smartphone"
            }
        }
    }
    
    // Tax rate - configurable per restaurant
    private var taxRate: Double {
        supabaseManager.currentRestaurant?.taxRate ?? 0.10 // Default to 10% if not configured
    }
    
    private var subtotal: Double {
        order.total_amount ?? 0
    }
    
    private var discountAmount: Double {
        if usePercentageDiscount {
            return subtotal * (discountPercentage / 100)
        } else {
            return min(customDiscountAmount, subtotal)
        }
    }
    
    private var afterDiscountAmount: Double {
        max(0, subtotal - discountAmount)
    }
    
    private var taxAmount: Double {
        afterDiscountAmount * taxRate
    }
    
    private var totalAmount: Double {
        afterDiscountAmount + taxAmount
    }
    
    private var changeAmount: Double {
        if paymentMethod == .cash && receivedAmount > totalAmount {
            return receivedAmount - totalAmount
        }
        return 0
    }
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: Spacing.lg) {
                    // Enhanced Payment Selection
                    paymentSection
                    
                    // Discount Section (only if showing)
                    if showingDiscount {
                        discountSection
                    } else {
                        discountToggleSection
                    }
                    
                    // Enhanced Price Breakdown
                    priceBreakdown
                    
                    // Enhanced Action Buttons
                    actionButtons
                }
                .padding(Spacing.md)
            }
            .background(Color.appBackground)
            .navigationTitle("checkout".localized)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) { Button("cancel".localized) { dismiss() } }
            }
            .task {
                receivedAmount = totalAmount
                // Auto focus cash input if cash is selected
                if paymentMethod == .cash {
                    // Delay to ensure view has appeared before focusing
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
                        isReceivedAmountFocused = true
                    }
                }
            }
        }
        .alert("error".localized, isPresented: $showingError) {
            Button("ok".localized) { }
        } message: {
            Text(errorMessage)
        }
        .alert("checkout_complete".localized, isPresented: $showingSuccess) {
            Button("done".localized) {
                onComplete()
            }
        } message: {
            Text("checkout_success_message".localized)
        }
    }
    
    private var orderSummaryHeader: some View {
        VStack(spacing: Spacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text(order.table?.name ?? String(format: "order_detail_table_fallback".localized, order.table_id))
                        .font(.cardTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.appTextPrimary)
                    HStack(spacing: Spacing.md) {
                        Label("\(order.guest_count ?? 0)", systemImage: "person.2")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                            .accessibilityLabel(String(format: "checkout_guest_count_accessibility".localized, order.guest_count ?? 0))
                        Label(formatTime(order.created_at), systemImage: "clock")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                    }
                }
                Spacer()
                EnhancedStatusBadge(status: order.status)
            }
            Divider()
        }
        .padding(Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
    }

    private var paymentSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            // Enhanced order header
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(order.table?.name ?? "Table \(order.table_id)")
                        .font(.cardTitle)
                        .fontWeight(.bold)
                        .foregroundColor(.appTextPrimary)
                    
                    HStack(spacing: Spacing.md) {
                        Label("\(order.guest_count ?? 0)", systemImage: "person.2.fill")
                            .font(.captionRegular)
                            .foregroundColor(.appTextTertiary)
                        Label(formatTime(order.created_at), systemImage: "clock.fill")
                            .font(.captionRegular)
                            .foregroundColor(.appTextTertiary)
                        Label("ID: \(String(order.id.prefix(6).uppercased()))", systemImage: "number")
                            .font(.captionRegular)
                            .foregroundColor(.appTextTertiary)
                    }
                }
                Spacer()
                EnhancedStatusBadge(status: order.status)
            }
            
            Divider()
            
            // Enhanced payment method section
            HStack {
                Image(systemName: "creditcard.fill")
                    .font(.title3)
                    .foregroundColor(.appPrimary)
                Text("payment_method".localized)
                    .font(.sectionHeader)
                    .fontWeight(.semibold)
                    .foregroundColor(.appTextPrimary)
                Spacer()
            }
            
            LazyVGrid(columns: Array(repeating: GridItem(.flexible()), count: 3), spacing: Spacing.sm) {
                ForEach(PaymentMethod.allCases, id: \.self) { method in
                    Button(action: {
                        paymentMethod = method
                        if method != .cash { receivedAmount = totalAmount }
                    }) {
                        VStack(spacing: Spacing.xs) {
                            ZStack {
                                Circle()
                                    .fill(paymentMethod == method ? Color.appPrimary : Color.appSurfaceSecondary)
                                    .frame(width: 44, height: 44)
                                    .shadow(
                                        color: paymentMethod == method ? Color.appPrimary.opacity(0.3) : Color.clear,
                                        radius: paymentMethod == method ? 4 : 0,
                                        y: paymentMethod == method ? 2 : 0
                                    )
                                
                                Image(systemName: method.icon)
                                    .font(.title3)
                                    .foregroundColor(paymentMethod == method ? .white : .appTextSecondary)
                            }
                            
                            Text(method.displayName)
                                .font(.captionBold)
                                .foregroundColor(paymentMethod == method ? .appPrimary : .appTextSecondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, Spacing.sm)
                        .background(
                            RoundedRectangle(cornerRadius: CornerRadius.md)
                                .fill(paymentMethod == method ? Color.appPrimary.opacity(0.1) : Color.appSurface)
                                .overlay(
                                    RoundedRectangle(cornerRadius: CornerRadius.md)
                                        .stroke(paymentMethod == method ? Color.appPrimary : Color.appBorderLight, lineWidth: paymentMethod == method ? 2 : 1)
                                )
                        )
                    }
                    .scaleEffect(paymentMethod == method ? 1.05 : 1.0)
                    .animation(.easeInOut(duration: Motion.fast), value: paymentMethod)
                    .accessibilityLabel(String(format: "checkout_payment_method_accessibility".localized, method.displayName))
                }
            }
            // Enhanced cash payment section
            if paymentMethod == .cash {
                VStack(spacing: Spacing.md) {
                    Divider()
                    
                    HStack {
                        Image(systemName: "yensign.circle.fill")
                            .font(.title3)
                            .foregroundColor(.appPrimary)
                        Text("checkout_cash_details".localized)
                            .font(.bodyMedium)
                            .fontWeight(.semibold)
                            .foregroundColor(.appTextPrimary)
                        Spacer()
                    }
                    
                    VStack(spacing: Spacing.sm) {
                        // Total amount display
                        HStack {
                            Text("checkout_total_label".localized)
                                .font(.bodyMedium)
                                .fontWeight(.medium)
                                .foregroundColor(.appTextPrimary)
                            Spacer()
                            Text(String(format: "price_format".localized, totalAmount))
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.appPrimary)
                        }
                        .padding(.horizontal, Spacing.sm)
                        .padding(.vertical, Spacing.sm)
                        .background(Color.appPrimary.opacity(0.1))
                        .cornerRadius(CornerRadius.md)
                        
                        // Received amount input with better styling
                        VStack(alignment: .leading, spacing: Spacing.xs) {
                            Text("received_amount".localized)
                                .font(.captionBold)
                                .foregroundColor(.appTextSecondary)
                            
                            HStack {
                                Image(systemName: "banknote")
                                    .foregroundColor(.appTextTertiary)
                                
                                TextField("checkout_received_amount_placeholder".localized, value: $receivedAmount, format: .currency(code: "JPY"))
                                    .font(.bodyMedium)
                                    .fontWeight(.medium)
                                    .keyboardType(.decimalPad)
                                    .focused($isReceivedAmountFocused)
                                
                                // Quick set buttons
                                Button(action: { receivedAmount = totalAmount }) {
                                    Text("checkout_exact_amount".localized)
                                        .font(.captionBold)
                                        .foregroundColor(.appPrimary)
                                        .padding(.horizontal, Spacing.xs)
                                        .padding(.vertical, 4)
                                        .background(Color.appPrimary.opacity(0.1))
                                        .cornerRadius(4)
                                }
                            }
                            .padding(.horizontal, Spacing.md)
                            .padding(.vertical, Spacing.sm)
                            .background(Color.appSurfaceSecondary)
                            .cornerRadius(CornerRadius.md)
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                    .stroke(Color.appBorderLight, lineWidth: 1)
                            )
                        }
                        
                        // Change calculation with enhanced styling
                        if changeAmount > 0 {
                            HStack {
                                Image(systemName: "arrow.clockwise.circle.fill")
                                    .foregroundColor(.appSuccess)
                                Text("checkout_change_label".localized)
                                    .font(.bodyMedium)
                                    .fontWeight(.medium)
                                    .foregroundColor(.appTextPrimary)
                                Spacer()
                                Text(String(format: "price_format".localized, changeAmount))
                                    .font(.bodyMedium)
                                    .fontWeight(.bold)
                                    .foregroundColor(.appSuccess)
                            }
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.sm)
                            .background(Color.appSuccessLight)
                            .cornerRadius(CornerRadius.md)
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                    .stroke(Color.appSuccess.opacity(0.3), lineWidth: 1)
                            )
                        } else if receivedAmount > 0 && receivedAmount < totalAmount {
                            HStack {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundColor(.appWarning)
                                Text("insufficient_amount".localized)
                                    .font(.bodyMedium)
                                    .fontWeight(.medium)
                                    .foregroundColor(.appWarning)
                                Spacer()
                                Text(String(format: "price_format".localized, totalAmount - receivedAmount))
                                    .font(.captionBold)
                                    .foregroundColor(.appWarning)
                            }
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, Spacing.sm)
                            .background(Color.appWarningLight)
                            .cornerRadius(CornerRadius.md)
                            .overlay(
                                RoundedRectangle(cornerRadius: CornerRadius.md)
                                    .stroke(Color.appWarning.opacity(0.3), lineWidth: 1)
                            )
                        }
                    }
                }
            }
        }
        .elevatedCardStyle()
    }

    private var discountToggleSection: some View {
        Button(action: { showingDiscount = true }) {
            HStack {
                Image(systemName: "percent")
                    .font(.title3)
                    .foregroundColor(.appPrimary)
                Text("apply_discount".localized)
                    .font(.bodyMedium)
                    .fontWeight(.medium)
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.captionRegular)
                    .foregroundColor(.appTextSecondary)
            }
            .padding(Spacing.md)
            .background(Color.appSurface)
            .cornerRadius(CornerRadius.md)
            .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(PlainButtonStyle())
        .accessibilityLabel("checkout_apply_discount_accessibility".localized)
    }

    private var discountSection: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Text("checkout_discount_section_title".localized)
                    .font(.sectionHeader)
                    .fontWeight(.semibold)
                    .foregroundColor(.appTextPrimary)
                Spacer()
                Button("checkout_remove_discount_button".localized) {
                    showingDiscount = false
                    discountCode = ""
                    discountPercentage = 0
                    customDiscountAmount = 0
                }
                .font(.bodyMedium)
                .foregroundColor(.appError)
                .accessibilityLabel("checkout_remove_discount_accessibility".localized)
            }
            VStack(spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text("discount_code".localized)
                        .font(.captionRegular)
                        .fontWeight(.medium)
                        .foregroundColor(.appTextPrimary)
                    TextField("checkout_discount_code_placeholder".localized, text: $discountCode)
                        .textFieldStyle(AppTextFieldStyle())
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                }
                Picker("checkout_discount_type_picker_label".localized, selection: $usePercentageDiscount) {
                    Text("checkout_discount_type_percentage".localized).tag(true)
                    Text("checkout_discount_type_fixed".localized).tag(false)
                }
                .pickerStyle(SegmentedPickerStyle())
                if usePercentageDiscount {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text("discount_percentage".localized)
                            .font(.captionRegular)
                            .foregroundColor(.appTextPrimary)
                        HStack {
                            Slider(value: $discountPercentage, in: 0...50, step: 1)
                            Text("\(Int(discountPercentage))%")
                                .font(.captionRegular)
                                .fontWeight(.medium)
                                .frame(width: 40, alignment: .trailing)
                        }
                    }
                } else {
                    VStack(alignment: .leading, spacing: Spacing.xxs) {
                        Text("discount_amount".localized)
                            .font(.captionRegular)
                            .foregroundColor(.appTextPrimary)
                        TextField("checkout_custom_discount_placeholder".localized, value: $customDiscountAmount, format: .currency(code: "JPY"))
                            .textFieldStyle(AppTextFieldStyle())
                            .keyboardType(.decimalPad)
                    }
                }
            }
        }
        .padding(Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.md)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }

    private var priceBreakdown: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack {
                Image(systemName: "receipt.fill")
                    .font(.title3)
                    .foregroundColor(.appPrimary)
                Text("checkout_price_breakdown".localized)
                    .font(.sectionHeader)
                    .fontWeight(.semibold)
                    .foregroundColor(.appTextPrimary)
                Spacer()
            }
            
            VStack(spacing: Spacing.sm) {
                // Subtotal
                HStack {
                    Text("subtotal".localized)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextPrimary)
                    Spacer()
                    Text(String(format: "price_format".localized, subtotal))
                        .font(.bodyMedium)
                        .fontWeight(.medium)
                        .foregroundColor(.appTextPrimary)
                }
                
                // Discount (if applied)
                if discountAmount > 0 {
                    HStack {
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "minus.circle.fill")
                                .font(.captionRegular)
                                .foregroundColor(.appSuccess)
                            Text("discount".localized)
                                .font(.bodyMedium)
                                .foregroundColor(.appSuccess)
                            if !discountCode.isEmpty {
                                Text("(\(discountCode))")
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextTertiary)
                            }
                        }
                        Spacer()
                        Text(String(format: "-%@", String(format: "price_format".localized, discountAmount)))
                            .font(.bodyMedium)
                            .fontWeight(.medium)
                            .foregroundColor(.appSuccess)
                    }
                    
                    HStack {
                        Text("checkout_price_after_discount_label".localized)
                            .font(.bodyMedium)
                            .foregroundColor(.appTextPrimary)
                        Spacer()
                        Text(String(format: "price_format".localized, afterDiscountAmount))
                            .font(.bodyMedium)
                            .fontWeight(.medium)
                            .foregroundColor(.appTextPrimary)
                    }
                }
                
                // Tax
                HStack {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "percent")
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                        Text(String(format: "checkout_price_tax_label".localized, Int(taxRate * 100)))
                            .font(.bodyMedium)
                            .foregroundColor(.appTextPrimary)
                    }
                    Spacer()
                    Text(String(format: "price_format".localized, taxAmount))
                        .font(.bodyMedium)
                        .fontWeight(.medium)
                        .foregroundColor(.appTextPrimary)
                }
                
                Divider()
                    .background(Color.appPrimary.opacity(0.3))
                
                // Total with enhanced styling
                HStack {
                    Text("checkout_total_label".localized)
                        .font(.title3)
                        .fontWeight(.bold)
                        .foregroundColor(.appTextPrimary)
                    Spacer()
                    Text(String(format: "price_format".localized, totalAmount))
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.appPrimary)
                }
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: CornerRadius.md)
                        .fill(Color.appPrimary.opacity(0.05))
                        .overlay(
                            RoundedRectangle(cornerRadius: CornerRadius.md)
                                .stroke(Color.appPrimary.opacity(0.2), lineWidth: 2)
                        )
                )
            }
        }
        .elevatedCardStyle()
    }

    private var actionButtons: some View {
        VStack(spacing: Spacing.md) {
            // Main checkout button with enhanced styling
            Button(action: processCheckout) {
                HStack(spacing: Spacing.sm) {
                    if isProcessing { 
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.9)
                    } else { 
                        Image(systemName: paymentMethod.icon)
                            .font(.title3)
                    }
                    
                    VStack(spacing: 2) {
                        Text(isProcessing ? "checkout_processing".localized : "complete_checkout".localized)
                            .fontWeight(.bold)
                        
                        if !isProcessing {
                            Text(paymentMethod.displayName)
                                .font(.captionRegular)
                                .opacity(0.9)
                        }
                    }
                    
                    if !isProcessing && canCompleteCheckout {
                        Spacer()
                        Image(systemName: "arrow.right.circle.fill")
                            .font(.title3)
                    }
                }
            }
            .buttonStyle(PrimaryButtonStyle(isEnabled: canCompleteCheckout && !isProcessing))
            .disabled(isProcessing || !canCompleteCheckout)
            
            // Print receipt only button with better styling
            Button(action: printReceiptOnly) {
                HStack {
                    Image(systemName: "printer.fill")
                        .font(.title3)
                    Text("print_receipt_only".localized)
                        .fontWeight(.medium)
                    Spacer()
                    Image(systemName: "arrow.right")
                        .font(.captionRegular)
                }
            }
            .buttonStyle(SecondaryButtonStyle(isEnabled: !isProcessing))
            .disabled(isProcessing)
            
            // Helper text for payment validation
            if !canCompleteCheckout && paymentMethod == .cash {
                HStack {
                    Image(systemName: "info.circle.fill")
                        .foregroundColor(.appInfo)
                    Text("checkout_insufficient_cash_hint".localized)
                        .font(.captionRegular)
                        .foregroundColor(.appInfo)
                }
                .padding(.horizontal, Spacing.sm)
                .padding(.vertical, Spacing.xs)
                .background(Color.appInfoLight)
                .cornerRadius(CornerRadius.sm)
            }
        }
    }
    
    private var canCompleteCheckout: Bool {
        if paymentMethod == .cash {
            return receivedAmount >= totalAmount
        }
        return true
    }
    
    private func processCheckout() {
        Task {
            await performCheckout(printReceipt: true)
        }
    }
    
    private func printReceiptOnly() {
        Task {
            await printReceipt()
        }
    }
    
    @MainActor
    private func performCheckout(printReceipt: Bool = true) async {
        isProcessing = true
        
        do {
            // Update order status to completed
            try await orderManager.updateOrderStatus(orderId: order.id, newStatus: .completed)
            
            // Print receipt if requested
            if printReceipt {
                await self.printReceipt()
            }
            
            showingSuccess = true
        } catch {
            errorMessage = "checkout_error_process_failed".localized
            showingError = true
        }
        
        isProcessing = false
    }
    
    @MainActor
    private func printReceipt() async {
        let receiptData = CheckoutReceiptData(
            order: order,
            subtotal: subtotal,
            discountAmount: discountAmount,
            discountCode: discountCode.isEmpty ? nil : discountCode,
            taxAmount: taxAmount,
            totalAmount: totalAmount,
            timestamp: Date()
        )
        
        do {
            try await printerManager.printCheckoutReceipt(receiptData)
        } catch {
            errorMessage = "receipt_print_failure_message".localized
            showingError = true
        }
    }
    
    private func formatTime(_ dateString: String) -> String {
        // Try ISO8601 formatter first (with fractional seconds)
        let iso8601Formatter = ISO8601DateFormatter()
        iso8601Formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        var date: Date?
        
        if let parsedDate = iso8601Formatter.date(from: dateString) {
            date = parsedDate
        } else {
            // Fallback to standard ISO8601 without fractional seconds
            iso8601Formatter.formatOptions = [.withInternetDateTime]
            date = iso8601Formatter.date(from: dateString)
        }
        
        // If ISO8601 fails, try standard date formatter as fallback
        if date == nil {
            let fallbackFormatter = DateFormatter()
            fallbackFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSSSS"
            date = fallbackFormatter.date(from: dateString)
        }
        
        guard let finalDate = date else {
            print("Failed to parse date string: \(dateString)")
            return "orders_unknown_time".localized
        }
        
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: finalDate)
    }
}

// MARK: - Supporting Views

struct CheckoutItemRow: View {
    let item: OrderItem
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.menu_item?.displayName ?? "orders_unknown_item".localized)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                if let notes = item.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .italic()
                }
                
                HStack {
                    OrderItemStatusBadge(status: item.status)
                    Spacer()
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(String(format: "item_quantity_format".localized, item.quantity))
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                if let price = item.menu_item?.price {
                    Text(String(format: "price_format".localized, price * Double(item.quantity)))
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Data Models

struct CheckoutReceiptData {
    let order: Order
    let subtotal: Double
    let discountAmount: Double
    let discountCode: String?
    let taxAmount: Double
    let totalAmount: Double
    let timestamp: Date
}

#if DEBUG
#Preview {
    // Mock Environment Objects
    let orderManager = OrderManager.shared
    let printerManager = PrinterManager.shared
    let localizationManager = LocalizationManager.shared

    // Populate with mock data for preview
    let mockCategory = Category(id: "1", name_en: "Drinks", name_ja: "飲み物", name_vi: "Đồ uống", position: 1)
    let mockMenuItem = MenuItem(id: "1", restaurant_id: "1", category_id: "1", name_en: "Coffee", name_ja: "コーヒー", name_vi: "Cà phê", code: "COF", description_en: "Hot coffee", description_ja: "ホットコーヒー", description_vi: "Cà phê nóng", price: 5.0, tags: [], image_url: nil, stock_level: nil, available: true, position: 1, created_at: "", updated_at: "", category: mockCategory, availableSizes: [], availableToppings: [])
    let mockOrderItem = OrderItem(id: "1", restaurant_id: "1", order_id: "1", menu_item_id: "1", quantity: 2, notes: "Extra hot", menu_item_size_id: nil, topping_ids: [], price_at_order: 5.0, status: .new, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", menu_item: mockMenuItem)
    let mockTable = Table(id: "1", restaurant_id: "1", name: "Table 1", status: .occupied, capacity: 4, is_outdoor: false, is_accessible: true, notes: nil, qr_code: nil, created_at: "", updated_at: "")
    let mockOrder = Order(id: "1", restaurant_id: "1", table_id: "1", session_id: "1", guest_count: 2, status: .new, total_amount: 10.0, order_number: 1, created_at: "2023-01-01T12:00:00Z", updated_at: "2023-01-01T12:00:00Z", table: mockTable, order_items: [mockOrderItem], payment_method: nil, discount_amount: nil, tax_amount: nil, tip_amount: nil)

    return CheckoutView(order: mockOrder, onComplete: {})
        .environmentObject(orderManager)
        .environmentObject(printerManager)
        .environmentObject(localizationManager)
        .environmentObject(SupabaseManager.shared)
}
#endif

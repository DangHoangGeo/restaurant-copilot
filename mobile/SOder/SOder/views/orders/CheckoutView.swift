import SwiftUI

struct CheckoutView: View {
    let order: Order
    let orderManager: OrderManager
    let printerManager: PrinterManager
    let onComplete: () -> Void
    
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
    
    // Tax rate - this could be configurable per restaurant
    private let taxRate: Double = 0.10 // 10% tax
    
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
                VStack(spacing: 10) {
                    // Payment Selection
                    paymentSection
                    
                    // Discount Section (only if showing)
                    if showingDiscount {
                        discountSection
                    } else {
                        discountToggleSection
                    }
                    
                    // Price Breakdown
                    priceBreakdown
                    
                    // Action Buttons
                    actionButtons
                }
                .padding()
            }
            .navigationTitle(order.table?.name ?? "Table \(order.table_id)")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("cancel".localized) {
                        dismiss()
                    }
                }
            }
            .task {
                receivedAmount = totalAmount
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
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(order.table?.name ?? "Table \(order.table_id)")
                                            .font(.title2)
                                            .fontWeight(.bold)
                    HStack(spacing: 16) {
                        Label("\(order.guest_count)", systemImage: "person.2")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Label(formatTime(order.created_at), systemImage: "clock")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                EnhancedStatusBadge(status: order.status)
            }
            
            Divider()
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private var paymentSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    
                    HStack(spacing: 16) {
                        Label("\(order.guest_count)", systemImage: "person.2")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        Label(formatTime(order.created_at), systemImage: "clock")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                EnhancedStatusBadge(status: order.status)
            }
            
            Divider()
            
            Text("payment_method".localized)
                .font(.headline)
                .fontWeight(.semibold)
            
            HStack(spacing: 8) {
                ForEach(PaymentMethod.allCases, id: \.self) { method in
                    Button(action: {
                        paymentMethod = method
                        if method != .cash {
                            receivedAmount = totalAmount
                        }
                    }) {
                        HStack(spacing: 6) {
                            Image(systemName: method.icon)
                                .font(.subheadline)
                            Text(method.displayName)
                                .font(.subheadline)
                                .fontWeight(.medium)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 40)
                        .background(paymentMethod == method ? Color.blue : Color(.systemGray5))
                        .foregroundColor(paymentMethod == method ? .white : .primary)
                        .cornerRadius(8)
                    }
                }
            }
            if paymentMethod == .cash {
                VStack(spacing: 12) {
                    HStack {
                        Text("total".localized + ":")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Spacer()
                        Text("¥\(String(format: "%.0f", totalAmount))")
                            .font(.title3)
                            .fontWeight(.bold)
                            .foregroundColor(.blue)
                    }
                    
                    VStack(alignment: .leading, spacing: 8) {
                        Text("received_amount".localized)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        TextField("0", value: $receivedAmount, format: .currency(code: "JPY"))
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.decimalPad)
                    }
                    
                    if changeAmount > 0 {
                        HStack {
                            Text("change".localized + ":")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Spacer()
                            Text("¥\(String(format: "%.0f", changeAmount))")
                                .font(.title3)
                                .fontWeight(.bold)
                                .foregroundColor(.green)
                        }
                        .padding()
                        .background(Color.green.opacity(0.1))
                        .cornerRadius(8)
                    } else if paymentMethod == .cash && receivedAmount > 0 && receivedAmount < totalAmount {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(.orange)
                            Text("insufficient_amount".localized)
                                .font(.subheadline)
                                .foregroundColor(.orange)
                        }
                        .padding()
                        .background(Color.orange.opacity(0.1))
                        .cornerRadius(8)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
    
    private var discountToggleSection: some View {
        Button(action: {
            showingDiscount = true
        }) {
            HStack {
                Image(systemName: "percent")
                    .font(.title3)
                    .foregroundColor(.blue)
                
                Text("apply_discount".localized)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    private var discountSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                Text("checkout_discount_section_title".localized)
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button("checkout_remove_discount_button".localized) {
                    showingDiscount = false
                    discountCode = ""
                    discountPercentage = 0
                    customDiscountAmount = 0
                }
                .font(.subheadline)
                .foregroundColor(.red)
            }
            
            VStack(spacing: 16) {
                // Discount Code
                VStack(alignment: .leading, spacing: 8) {
                    Text("discount_code".localized)
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    TextField("checkout_discount_code_placeholder".localized, text: $discountCode)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                }
                
                // Discount Type Toggle
                Picker("checkout_discount_type_picker_label".localized, selection: $usePercentageDiscount) {
                    Text("checkout_discount_type_percentage".localized).tag(true)
                    Text("checkout_discount_type_fixed".localized).tag(false)
                }
                .pickerStyle(SegmentedPickerStyle())
                
                // Discount Input
                if usePercentageDiscount {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("discount_percentage".localized)
                            .font(.subheadline)
                        
                        HStack {
                            Slider(value: $discountPercentage, in: 0...50, step: 1)
                            Text("\(Int(discountPercentage))%")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .frame(width: 40, alignment: .trailing)
                        }
                    }
                } else {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("discount_amount".localized)
                            .font(.subheadline)
                        
                        TextField("¥0", value: $customDiscountAmount, format: .currency(code: "JPY"))
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.decimalPad)
                    }
                }
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
    
    private var priceBreakdown: some View {
        VStack(spacing: 12) {
            HStack {
                Text("subtotal".localized)
                    .font(.subheadline)
                Spacer()
                Text("¥\(String(format: "%.0f", subtotal))")
                    .font(.subheadline)
            }
            
            if discountAmount > 0 {
                HStack {
                    Text("discount".localized)
                        .font(.subheadline)
                        .foregroundColor(.green)
                    Spacer()
                    Text("-¥\(String(format: "%.0f", discountAmount))")
                        .font(.subheadline)
                        .foregroundColor(.green)
                }
                
                HStack {
                    Text("checkout_price_after_discount_label".localized)
                        .font(.subheadline)
                    Spacer()
                    Text("¥\(String(format: "%.0f", afterDiscountAmount))")
                        .font(.subheadline)
                }
            }
            
            HStack {
                Text(String(format: "checkout_price_tax_label".localized, Int(taxRate * 100)))
                    .font(.subheadline)
                Spacer()
                Text("¥\(String(format: "%.0f", taxAmount))")
                    .font(.subheadline)
            }
            
            Divider()
            
            HStack {
                Text("checkout_total_label".localized)
                    .font(.title2)
                    .fontWeight(.bold)
                Spacer()
                Text("¥\(String(format: "%.0f", totalAmount))")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(.primary)
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
    
    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button(action: processCheckout) {
                HStack {
                    if isProcessing {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: paymentMethod.icon)
                    }
                    Text(isProcessing ? "processing".localized : "complete_checkout".localized)
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(canCompleteCheckout ? Color.blue : Color.gray)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isProcessing || !canCompleteCheckout)
            
            Button(action: printReceiptOnly) {
                HStack {
                    Image(systemName: "printer")
                    Text("print_receipt_only".localized)
                        .fontWeight(.medium)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color(.systemGray5))
                .foregroundColor(.primary)
                .cornerRadius(12)
            }
            .disabled(isProcessing)
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
            errorMessage = error.localizedDescription
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
            errorMessage = "Failed to print receipt: \(error.localizedDescription)"
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
            return "Unknown" 
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
                Text(item.menu_item?.displayName ?? "Unknown Item")
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
                Text("×\(item.quantity)")
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                if let price = item.menu_item?.price {
                    Text("¥\(String(format: "%.0f", price * Double(item.quantity)))")
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

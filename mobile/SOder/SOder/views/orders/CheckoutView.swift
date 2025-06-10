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
    
    @Environment(\.dismiss) private var dismiss
    
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
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 24) {
                    // Order Summary Header
                    orderSummaryHeader
                    
                    // Order Items
                    orderItemsList
                    
                    // Discount Section
                    discountSection
                    
                    // Price Breakdown
                    priceBreakdown
                    
                    // Action Buttons
                    actionButtons
                }
                .padding()
            }
            .navigationTitle("Checkout")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .alert("Error", isPresented: $showingError) {
            Button("OK") { }
        } message: {
            Text(errorMessage)
        }
        .alert("Checkout Complete", isPresented: $showingSuccess) {
            Button("Done") {
                onComplete()
            }
        } message: {
            Text("Order has been completed and receipt printed successfully.")
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
    
    private var orderItemsList: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Order Items")
                .font(.headline)
                .fontWeight(.semibold)
            
            LazyVStack(spacing: 8) {
                if let items = order.order_items {
                    ForEach(items, id: \.id) { item in
                        CheckoutItemRow(item: item)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
    }
    
    private var discountSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Discount")
                .font(.headline)
                .fontWeight(.semibold)
            
            VStack(spacing: 16) {
                // Discount Code
                VStack(alignment: .leading, spacing: 8) {
                    Text("Discount Code")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    
                    TextField("Enter discount code", text: $discountCode)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                }
                
                // Discount Type Toggle
                Picker("Discount Type", selection: $usePercentageDiscount) {
                    Text("Percentage").tag(true)
                    Text("Fixed Amount").tag(false)
                }
                .pickerStyle(SegmentedPickerStyle())
                
                // Discount Input
                if usePercentageDiscount {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Discount Percentage")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
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
                        Text("Discount Amount")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        
                        TextField("¥0", value: $customDiscountAmount, format: .currency(code: "JPY"))
                            .textFieldStyle(RoundedBorderTextFieldStyle())
                            .keyboardType(.decimalPad)
                    }
                }
            }
            .padding()
            .background(Color(.systemBackground))
            .cornerRadius(12)
            .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
        }
    }
    
    private var priceBreakdown: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Subtotal")
                    .font(.subheadline)
                Spacer()
                Text("¥\(String(format: "%.0f", subtotal))")
                    .font(.subheadline)
            }
            
            if discountAmount > 0 {
                HStack {
                    Text("Discount")
                        .font(.subheadline)
                        .foregroundColor(.green)
                    Spacer()
                    Text("-¥\(String(format: "%.0f", discountAmount))")
                        .font(.subheadline)
                        .foregroundColor(.green)
                }
                
                HStack {
                    Text("After Discount")
                        .font(.subheadline)
                    Spacer()
                    Text("¥\(String(format: "%.0f", afterDiscountAmount))")
                        .font(.subheadline)
                }
            }
            
            HStack {
                Text("Tax (\(Int(taxRate * 100))%)")
                    .font(.subheadline)
                Spacer()
                Text("¥\(String(format: "%.0f", taxAmount))")
                    .font(.subheadline)
            }
            
            Divider()
            
            HStack {
                Text("Total")
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
                        Image(systemName: "creditcard")
                    }
                    Text(isProcessing ? "Processing..." : "Complete Checkout")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isProcessing)
            
            Button(action: printReceiptOnly) {
                HStack {
                    Image(systemName: "printer")
                    Text("Print Receipt")
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
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return "Unknown" }
        
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
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

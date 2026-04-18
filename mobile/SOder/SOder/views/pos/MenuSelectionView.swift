import SwiftUI

struct MenuSelectionView: View {
    let orderId: String
    let table: Table
    let onOrderConfirmed: (() -> Void)?

    @EnvironmentObject var orderManager: OrderManager

    private var existingOrder: Order? {
        orderManager.orders.first(where: { $0.id == orderId }) ??
        orderManager.allOrders.first(where: { $0.id == orderId })
    }

    private var hasLocalDraft: Bool {
        orderManager.localDraftOrders[orderId] != nil
    }

    var body: some View {
        Group {
            if hasLocalDraft {
                AddItemToOrderView(
                    draftOrderId: orderId,
                    table: table,
                    onOrderConfirmed: onOrderConfirmed
                )
            } else if let existingOrder {
                AddItemToOrderView(order: existingOrder)
            } else {
                missingOrderState
            }
        }
        .background(Color.appBackground)
    }

    private var missingOrderState: some View {
        VStack(spacing: Spacing.lg) {
            ProgressView()
                .tint(.appPrimary)

            Text("add_items_loading_order_title".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)

            Text("add_items_loading_order_subtitle".localized(with: table.name))
                .font(.bodyMedium)
                .foregroundColor(.appTextSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(Spacing.xl)
    }
}

struct MenuSelectionView_Previews: PreviewProvider {
    static var previews: some View {
        let mockTable = Table(
            id: "previewTable",
            restaurant_id: "previewResto",
            name: "A1",
            status: .available,
            capacity: 4,
            is_outdoor: false,
            is_accessible: true,
            notes: nil,
            qr_code: nil,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )

        NavigationStack {
            MenuSelectionView(orderId: "previewOrder", table: mockTable, onOrderConfirmed: nil)
                .environmentObject(OrderManager.shared)
                .environmentObject(SupabaseManager.shared)
        }
    }
}

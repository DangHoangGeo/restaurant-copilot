import SwiftUI

struct OrderSidebarHeaderView: View {
    @Binding var showAllOrders: Bool
    @Binding var selectedFilter: OrdersView.OrderFilter
    var onRefresh: () -> Void
    var onToggleAutoPrint: () -> Void
    var onClearPrintHistory: () -> Void
    var onSignOut: () -> Void
    var onNewOrder: () -> Void

    @ObservedObject var orderManager: OrderManager
    @ObservedObject var supabaseManager: SupabaseManager

    var body: some View {
        VStack(spacing: Spacing.lg) {
            header
            filterPills
            newOrderButton
        }
        .padding(.horizontal, Spacing.md)
        .padding(.top, Spacing.md)
        .padding(.bottom, Spacing.lg)
        .background(Color.appSurface)
        .overlay(
            Rectangle()
                .fill(Color.appBorderLight)
                .frame(height: 1),
            alignment: .bottom
        )
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                AppSectionEyebrow("live operations")
                if let restaurantName = supabaseManager.currentRestaurant?.name {
                    Text(restaurantName)
                        .font(.cardTitle)
                        .foregroundColor(.appTextPrimary)
                } else {
                    Text("orders".localized)
                        .font(.cardTitle)
                        .foregroundColor(.appTextPrimary)
                }
            }
            Spacer()

            if orderManager.autoPrintingEnabled {
                AutoPrintStatusView(
                    isEnabled: orderManager.autoPrintingEnabled,
                    isActivePrinting: orderManager.autoPrintingInProgress,
                    autoPrintStats: orderManager.autoPrintStats,
                    lastResult: orderManager.lastAutoPrintResult
                )
            }

            Menu {
                Button("orders_refresh".localized, action: onRefresh)

                Divider()

                Section("orders_auto_printing".localized) {
                    Button(action: onToggleAutoPrint) {
                        Label(
                            "orders_auto_print_new_orders".localized,
                            systemImage: orderManager.autoPrintingEnabled ? "checkmark" : ""
                        )
                    }

                    Button("orders_clear_print_history".localized, action: onClearPrintHistory)
                        .disabled(!orderManager.autoPrintingEnabled)
                }

                Divider()

                Button("orders_sign_out".localized, action: onSignOut)
            } label: {
                Image(systemName: "ellipsis")
                    .font(.title3)
                    .foregroundColor(.appTextPrimary)
                    .frame(width: 44, height: 44)
                    .background(Color.appSurfaceSecondary)
                    .overlay(
                        Circle()
                            .stroke(Color.appBorderLight, lineWidth: 1)
                    )
                    .clipShape(Circle())
            }
        }
    }

    private var filterPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: Spacing.md) {
                ForEach(OrdersView.OrderFilter.allCases, id: \.self) { filter in
                    FilterChip(
                        title: filter.displayName,
                        count: orderManager.countForFilter(filter, allOrders: showAllOrders),
                        isSelected: selectedFilter == filter,
                        color: filter.color
                    ) { selectedFilter = filter }
                }
            }
        }
    }

    private var newOrderButton: some View {
        Button(action: onNewOrder) {
            HStack {
                Image(systemName: "plus.circle")
                Text("tab_new_order".localized)
            }
        }
        .buttonStyle(PrimaryButtonStyle())
    }
}

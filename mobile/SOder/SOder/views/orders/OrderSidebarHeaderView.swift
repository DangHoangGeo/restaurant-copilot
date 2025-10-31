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

    var body: some View {
        VStack(spacing: Spacing.lg) {
            header
            orderTypeToggle
            filterPills
            newOrderButton
        }
        .padding()
        .background(Color.appSurface)
        .overlay(Divider(), alignment: .bottom)
    }

    private var header: some View {
        HStack {
            Text("orders".localized)
                .font(.sectionHeader)
                .foregroundColor(.appTextPrimary)
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
                Image(systemName: "ellipsis.circle").font(.title2)
            }
        }
    }

    private var orderTypeToggle: some View {
        HStack(spacing: Spacing.sm) {
            SegmentedPill(title: "orders_active_orders".localized, isSelected: !showAllOrders) {
                showAllOrders = false
            }
            SegmentedPill(title: "orders_all_orders".localized, isSelected: showAllOrders) {
                showAllOrders = true
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
            .font(.buttonMedium)
            .foregroundColor(.white)
            .padding(.vertical, Spacing.md)
            .frame(maxWidth: .infinity)
            .background(Color.appPrimary)
            .cornerRadius(CornerRadius.md)
            .shadow(color: Elevation.level1.color, radius: Elevation.level1.radius, y: Elevation.level1.y)
        }
    }
}

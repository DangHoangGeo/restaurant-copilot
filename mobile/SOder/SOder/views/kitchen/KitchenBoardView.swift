import SwiftUI
#if os(iOS)
import UIKit
#endif

/// Main kitchen board coordinator view - streamlined to use modular components
/// and overlay dialog design for better chef workflow
struct KitchenBoardView: View {
    @EnvironmentObject var printerManager: PrinterManager
    @EnvironmentObject private var localizationManager: LocalizationManager
    @EnvironmentObject private var orderManager: OrderManager
    @StateObject private var supabaseManager = SupabaseManager.shared
    
    // State management
    @State private var groupedByCategory: [CategoryGroup] = []
    @State private var selectedCategoryFilter: String = "kitchen_all".localized
    @State private var selectedGroupedItem: GroupedItem? = nil
    @State private var showingItemDetails = false
    @State private var showingPrintAlert = false
    @State private var printMessage = ""
    @State private var refreshTimer: Timer?
    @State private var viewMode: KitchenViewMode = .statusColumns
    @AppStorage("kitchen_station_focus") private var selectedStationFocusRaw = KitchenStationFocus.all.rawValue
    
    var body: some View {
        ZStack {
            AppScreenBackground()

            // Main kitchen view - always visible
            VStack(spacing: 0) {
                // Header with stats and filters
                KitchenHeaderView(
                    totalItemsCount: totalItemsCount,
                    urgentItemsCount: urgentItemsCount,
                    selectedCategoryFilter: selectedCategoryFilter,
                    categories: Array(Set(groupedByCategory.map { $0.categoryName })),
                    categoryCounts: categoryCounts,
                    stationFocus: selectedStationFocus,
                    stationCounts: stationCounts,
                    viewMode: viewMode,
                    isCompactLayout: isPhoneLayout,
                    showsLayoutSwitcher: !isPhoneLayout,
                    onCategoryFilterChange: { category in
                        selectedCategoryFilter = category
                    },
                    onStationFocusChange: { station in
                        selectedStationFocusRaw = station.rawValue
                        selectedCategoryFilter = "kitchen_all".localized
                        computeCategoryGrouping()
                    },
                    onViewModeChange: { mode in
                        viewMode = mode
                    },
                    onRefresh: {
                        Task {
                            await orderManager.fetchActiveOrders()
                            computeCategoryGrouping()
                        }
                    },
                    onPrintSummary: {
                        Task {
                            await printKitchenSummary()
                        }
                    },
                    onSignOut: {
                        Task {
                            try? await supabaseManager.signOut()
                        }
                    }
                )
                
                // Main kitchen items list - always visible
                if orderManager.isLoading && groupedByCategory.isEmpty {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("kitchen_loading_data".localized)
                            .font(.subheadline)
                            .foregroundColor(.appTextSecondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ZStack(alignment: .top) {
                        KitchenItemsListView(
                            groupedByCategory: groupedByCategory,
                            selectedCategoryFilter: selectedCategoryFilter,
                            orderCount: orderManager.orders.count,
                            viewMode: viewMode,
                            isCompactLayout: isPhoneLayout,
                            onItemStatusTap: { item in
                                advanceItemStatus(item)
                            },
                            onItemDetailTap: { item in
                                selectedGroupedItem = item
                                showingItemDetails = true
                            }
                        )

                        if orderManager.isLoading {
                            ProgressView()
                                .controlSize(.small)
                                .padding(.horizontal, Spacing.md)
                                .padding(.vertical, Spacing.sm)
                                .background(.ultraThinMaterial)
                                .clipShape(Capsule())
                                .padding(.top, Spacing.xs)
                        }
                    }
                }
                
                // Error Message
                if let errorMessage = orderManager.errorMessage {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundColor(.appWarning)
                        Text(errorMessage)
                            .font(.captionRegular)
                            .foregroundColor(.appTextSecondary)
                        Spacer()
                        Button("kitchen_retry".localized) {
                            Task {
                                await orderManager.fetchActiveOrders()
                                computeCategoryGrouping()
                            }
                        }
                        .font(.captionRegular)
                        .foregroundColor(.appInfo)
                    }
                    .padding()
                    .background(Color.appSurface)
                    .overlay(
                        Rectangle()
                            .fill(Color.appBorderLight)
                            .frame(height: 1),
                        alignment: .top
                    )
                }
            }
            
            // Detail overlay - shown as dialog
            if showingItemDetails, let selectedItem = selectedGroupedItem {
                ItemDetailView(
                    item: selectedItem,
                    orderManager: orderManager,
                    printerManager: printerManager,
                    onComplete: {
                        showingItemDetails = false
                        selectedGroupedItem = nil
                    },
                    onPrintResult: { message in
                        printMessage = message
                        showingPrintAlert = true
                    },
                    onStatusAdvance: {
                        advanceItemStatus(selectedItem)
                        showingItemDetails = false
                        selectedGroupedItem = nil
                    }
                )
                .transition(.opacity.combined(with: .scale(scale: 0.9)))
                .animation(.easeInOut(duration: 0.3), value: showingItemDetails)
            }
        }
        .toolbar(.hidden, for: .navigationBar)
        .task {
            await orderManager.fetchActiveOrders()
            computeCategoryGrouping()
            startRefreshTimer()
        }
        .onChange(of: orderManager.orders) { _, _ in
            computeCategoryGrouping()
        }
        .onChange(of: selectedStationFocusRaw) { _, _ in
            computeCategoryGrouping()
        }
        .onDisappear {
            stopRefreshTimer()
        }
        .alert("kitchen_print_status".localized, isPresented: $showingPrintAlert) {
            Button("ok".localized) { }
        } message: {
            Text(printMessage)
        }
    }
    
    // MARK: - Computed Properties

    private var isPhoneLayout: Bool {
        UIDevice.current.userInterfaceIdiom == .phone
    }

    private var selectedStationFocus: KitchenStationFocus {
        KitchenStationFocus(rawValue: selectedStationFocusRaw) ?? .all
    }
    
    private var totalItemsCount: Int {
        groupedByCategory.reduce(0) { total, categoryGroup in
            total + categoryGroup.items.reduce(0) { sum, item in sum + item.quantity }
        }
    }
    
    private var urgentItemsCount: Int {
        var count = 0
        for categoryGroup in groupedByCategory {
            for item in categoryGroup.items {
                let timeSinceOrder = Date().timeIntervalSince(item.orderTime)
                if timeSinceOrder > KitchenBoardConfig.urgentThresholdMinutes * 60 {
                    count += item.quantity
                }
            }
        }
        return count
    }

    private var categoryCounts: [String: Int] {
        var counts: [String: Int] = [:]
        for categoryGroup in groupedByCategory {
            let itemCount = categoryGroup.items.reduce(0) { sum, item in sum + item.quantity }
            counts[categoryGroup.categoryName] = itemCount
        }
        return counts
    }

    private var stationCounts: [KitchenStationFocus: Int] {
        var counts = Dictionary(uniqueKeysWithValues: KitchenStationFocus.allCases.map { ($0, 0) })

        for order in orderManager.orders {
            for orderItem in order.order_items ?? [] {
                guard KitchenBoardConfig.visibleStatuses.contains(orderItem.status) else { continue }

                let quantity = max(orderItem.quantity, 1)
                counts[.all, default: 0] += quantity
                counts[orderItem.prepStation.stationFocus, default: 0] += quantity
            }
        }

        return counts
    }

    // MARK: - Helper Methods

    private func computeCategoryGrouping() {
        let orders = orderManager.orders
        let stationFocus = selectedStationFocus

        Task.detached(priority: .userInitiated) {
            let grouped = KitchenGroupingEngine.buildCategoryGroups(
                from: orders,
                stationFocus: stationFocus
            )
            await MainActor.run {
                groupedByCategory = grouped
            }
        }
    }
    
    private func advanceItemStatus(_ groupedItem: GroupedItem) {
        Task {
            do {
                let newStatus: OrderItemStatus
                
                switch groupedItem.status {
                    case .draft:
                        newStatus = .new
                    case .new:
                        newStatus = .preparing
                    case .preparing:
                        newStatus = .ready
                    case .ready:
                        newStatus = .served
                    case .served:
                        newStatus = .canceled
                    case .canceled:
                        return // Already completed
                }
                
                // Update all order items in this group
                for orderItem in groupedItem.orderItems {
                    try await orderManager.updateOrderItemStatus(
                        orderItemId: orderItem.id,
                        newStatus: newStatus
                    )
                }
                
                // Refresh the data
                await orderManager.fetchActiveOrders()
                computeCategoryGrouping()
                
            } catch {
                print("Failed to update item status: \(error)")
            }
        }
    }
    
    private func startRefreshTimer() {
        refreshTimer = Timer.scheduledTimer(withTimeInterval: KitchenBoardConfig.autoRefreshInterval, repeats: true) { _ in 
            Task {
                await orderManager.fetchActiveOrders()
                computeCategoryGrouping()
            }
        }
    }
    
    private func stopRefreshTimer() {
        refreshTimer?.invalidate()
        refreshTimer = nil
    }
    
    // MARK: - Printing Methods
    
    private func printKitchenSummary() async {
        do {
            try await printerManager.printKitchenBoardSummary(groupedByCategory.flatMap { $0.items })
            
            await MainActor.run {
                printMessage = "kitchen_print_success".localized
                showingPrintAlert = true
            }
        } catch {
            await MainActor.run {
                printMessage = String(format: "kitchen_print_failure".localized, error.localizedDescription)
                showingPrintAlert = true
            }
        }
    }
    
    private func printIndividualItem(_ groupedItem: GroupedItem) async {
        do {
            try await printerManager.printKitchenItemSummary(groupedItem)
            
            await MainActor.run {
                printMessage = "kitchen_item_print_success".localized
                showingPrintAlert = true
            }
        } catch {
            await MainActor.run {
                printMessage = String(format: "kitchen_item_print_failure".localized, error.localizedDescription)
                showingPrintAlert = true
            }
        }
    }
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

    orderManager.orders = [mockOrder]

    return KitchenBoardView()
        .environmentObject(orderManager)
        .environmentObject(printerManager)
        .environmentObject(localizationManager)
        .environmentObject(SupabaseManager.shared)
}
#endif

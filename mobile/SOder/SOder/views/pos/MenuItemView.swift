import SwiftUI

struct MenuItemView: View {
    let category: Category // Canonical Category model
    let orderId: String
    let table: Table     // Canonical Table model
    let onOrderConfirmed: (() -> Void)?

    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var supabaseManager: SupabaseManager

    @State private var menuItems: [MenuItem] = [] // Canonical MenuItem
    @State private var isLoading = false
    @State private var draftOrderItemsCount: Int = 0

    // For navigation
    @State private var selectedMenuItem: MenuItem? = nil
    @State private var showingDraftOrder = false

    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert: Bool = false
    var body: some View {
        Group {
            if isLoading {
                VStack(spacing: Spacing.md) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("loading_items_for_%@...".localized(with: category.displayName))
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if menuItems.isEmpty {
                VStack(spacing: Spacing.md) {
                    Image(systemName: "tray")
                        .font(.system(size: 50))
                        .foregroundColor(.appTextSecondary)
                    Text("no_menu_items_found_in_%@.".localized(with: category.displayName))
                        .font(.sectionHeader)
                        .foregroundColor(.appTextPrimary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                List {
                    ForEach(menuItems) { item in
                        MenuItemRowCompact(menuItem: item) {
                            print("Selected item: \(item.displayName)")
                            selectedMenuItem = item
                        }
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets())
                    }
                }
                .listStyle(PlainListStyle())
            }
        }
        .navigationTitle(category.displayName)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    print("Navigate to DraftOrderView for orderId: \(orderId)")
                    showingDraftOrder = true
                }) {
                    HStack {
                        Image(systemName: "cart")
                        if draftOrderItemsCount > 0 {
                            Text("\(draftOrderItemsCount)")
                                .font(.captionBold)
                                .padding(Spacing.xs)
                                .background(Color.appError)
                                .clipShape(Circle())
                                .foregroundColor(.appSurface)
                                .offset(x: -5, y: -5)
                        }
                    }
                }
                .accessibilityLabel(draftOrderItemsCount > 0 ? "view_draft_order_,_%%d_items".localized(with: draftOrderItemsCount) : "view_draft_order,_empty".localized)
            }
        }
        .task {
            await loadInitialData()
        }
        .navigationDestination(item: $selectedMenuItem) { menuItem in
            AddItemDetailView(menuItem: menuItem, orderId: orderId, table: table)
                .environmentObject(orderManager)
        }
        .sheet(isPresented: $showingDraftOrder) {
            NavigationStack {
                DraftOrderView(orderId: orderId, table: table, onOrderConfirmed: onOrderConfirmed)
                    .environmentObject(orderManager)
            }
        }
        // Alert for data fetching errors
        .alert("error_alert_title".localized, isPresented: $showingErrorAlert) {
            Button("ok_button_title".localized) {}
        } message: {
            Text(errorMessage ?? "error_alert_default_message".localized)
        }
    }


    @MainActor
    private func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        do {
            // Ensure SupabaseManager has a valid restaurant ID before fetching
            // (fetchMenuItems in SupabaseManager already checks this, but good practice)
            guard supabaseManager.currentRestaurantId != nil else {
                self.errorMessage = "add_items_error_no_restaurant".localized
                self.showingErrorAlert = true
                self.isLoading = false
                self.menuItems = []
                return
            }
            self.menuItems = try await supabaseManager.fetchMenuItems(categoryId: category.id)
        } catch {
            print("Error fetching menu items for category \(category.id): \(error.localizedDescription)")
            self.errorMessage = "add_items_error_load_failed".localized
            self.showingErrorAlert = true
            self.menuItems = [] // Clear items on error
        }

        // Fetch draft order summary (should run regardless of menu item fetch outcome)
        await updateDraftOrderSummary()

        isLoading = false
    }

    @MainActor
    private func updateDraftOrderSummary() async {
        do {
            if let draftOrder = try await orderManager.getDraftOrder(orderId: self.orderId) {
                self.draftOrderItemsCount = draftOrder.order_items?.count ?? 0
            } else {
                self.draftOrderItemsCount = 0
            }
        } catch {
            print("Error fetching draft order summary: \(error.localizedDescription)")
            self.draftOrderItemsCount = 0
        }
    }
}

struct MenuItemView_Previews: PreviewProvider {
    static var previews: some View {
        let mockSupabaseManager = SupabaseManager.shared

        // Create a mock Category instance (canonical model)
        let mockCategory = Category(
            id: "catPrev1",
            name_en: "Preview Appetizers",
            name_ja: "プレビュー前菜",
            name_vi: "Khai vị Xem trước",
            position: 1
        )

        // Create a mock Table instance (canonical model)
        let mockTable = Table(
            id: "previewTableMIV",
            restaurant_id: "previewRestoMIV",
            name: "MIV Table",
            status: .available,
            capacity: 4,
            is_outdoor: false,
            is_accessible: true,
            notes: nil,
            qr_code: nil,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        let mockOrderId = "previewOrderMenuItemView"

        return NavigationView { // For toolbar and title
            MenuItemView(category: mockCategory, orderId: mockOrderId, table: mockTable, onOrderConfirmed: nil)
                .environmentObject(OrderManager.shared)
                .environmentObject(mockSupabaseManager)
        }
    }
}

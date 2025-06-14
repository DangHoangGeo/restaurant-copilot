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
                ProgressView("Loading items for \(category.displayName)...")
            } else if menuItems.isEmpty {
                Text("No menu items found in \(category.displayName).")
                    .foregroundColor(.secondary)
            } else {
                List {
                    ForEach(menuItems) { item in
                        menuItemRow(for: item)
                    }
                }
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
                                .font(.caption2)
                                .padding(5)
                                .background(Color.red)
                                .clipShape(Circle())
                                .foregroundColor(.white)
                                .offset(x: -5, y: -5)
                        }
                    }
                }
                .accessibilityLabel(draftOrderItemsCount > 0 ? "View draft order, \(draftOrderItemsCount) items" : "View draft order, empty")
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
        .alert("Error", isPresented: $showingErrorAlert) {
            Button("OK") {}
        } message: {
            Text(errorMessage ?? "An unknown error occurred.")
        }
    }

    @ViewBuilder
    private func menuItemRow(for item: MenuItem) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.displayName)
                    .font(.headline)
                if let description = item.displayDescription, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundColor(.gray)
                        .lineLimit(2)
                }
                Text(String(format: "%.0f%@", item.price, "円")) // Assuming JPY for now, adapt as needed
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }

            Spacer()

            Button(action: {
                print("Selected item: \(item.displayName)")
                selectedMenuItem = item
            }) {
                Image(systemName: "plus.circle.fill")
                    .font(.title2)
                    .foregroundColor(.blue)
            }
            .buttonStyle(BorderlessButtonStyle()) // To ensure it doesn't interfere with List row tap if any
            .accessibilityLabel("Add \(item.displayName) to order")
        }
        .padding(.vertical, 8)
    }

    @MainActor
    private func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        do {
            // Ensure SupabaseManager has a valid restaurant ID before fetching
            // (fetchMenuItems in SupabaseManager already checks this, but good practice)
            guard supabaseManager.currentRestaurantId != nil else {
                self.errorMessage = "Restaurant not identified for fetching menu items."
                self.showingErrorAlert = true
                self.isLoading = false
                self.menuItems = []
                return
            }
            self.menuItems = try await supabaseManager.fetchMenuItems(categoryId: category.id)
        } catch {
            print("Error fetching menu items for category \(category.id): \(error.localizedDescription)")
            self.errorMessage = "Failed to load menu items: \(error.localizedDescription)"
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
        let mockOrderManager = OrderManager()
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
                .environmentObject(mockOrderManager)
                .environmentObject(mockSupabaseManager)
        }
    }
}

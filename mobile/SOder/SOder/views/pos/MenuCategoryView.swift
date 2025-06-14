import SwiftUI

// Local Category stub removed, will use canonical Category from Models.swift

struct MenuCategoryView: View {
    let orderId: String
    let table: Table // This should be the canonical Table model from Models.swift

    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var supabaseManager: SupabaseManager

    @State private var categories: [Category] = [] // Canonical Category
    @State private var isLoading = false
    @State private var draftOrderItemsCount: Int = 0

    // For placeholder navigation
    @State private var navigateToCategory: Category? = nil // Canonical Category
    @State private var navigateToDraftOrder = false

    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert: Bool = false

    var body: some View {
        // NavigationStack { // Assuming this view is already part of a NavigationStack from SelectTableView
            Group {
                if isLoading {
                    ProgressView("Loading categories...")
                } else if categories.isEmpty {
                    Text("No menu categories found.")
                        .foregroundColor(.secondary)
                } else {
                    List {
                        ForEach(categories) { category in
                            Button(action: {
                                print("Selected category: \(category.displayName)")
                                navigateToCategory = category // Placeholder for navigation
                            }) {
                                HStack {
                                    Text(category.displayName)
                                        .font(.headline)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .foregroundColor(.gray)
                                }
                            }
                            .accessibilityLabel(category.displayName)
                            .accessibilityHint("Tap to view items in \(category.displayName).")
                        }
                    }
                }
            }
            .navigationTitle("Table \(table.name) - Categories")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        print("Navigate to DraftOrderView for orderId: \(orderId)")
                        navigateToDraftOrder = true // Placeholder for navigation
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
                                    .offset(x: -5, y: -5) // Adjust badge position
                            }
                        }
                    }
                    .accessibilityLabel(draftOrderItemsCount > 0 ? "View draft order, \(draftOrderItemsCount) items" : "View draft order, empty")
                }
            }
            .task {
                await loadInitialData()
            }
            .alert("Navigate to Menu Items", isPresented: Binding(
                get: { navigateToCategory != nil },
                set: { if !$0 { navigateToCategory = nil } }
            )) {
                Button("OK") { /* Placeholder */ }
            } message: {
                Text("Would navigate to menu items for category: \(navigateToCategory?.displayName ?? "N/A")")
            }
            .alert("Navigate to Draft Order", isPresented: $navigateToDraftOrder) {
                 Button("OK") { /* Placeholder */ }
            } message: {
                Text("Would navigate to Draft Order View for order \(orderId). Items: \(draftOrderItemsCount)")
            }
            // Alert for data fetching errors
            .alert("Error", isPresented: $showingErrorAlert) {
                Button("OK") {}
            } message: {
                Text(errorMessage ?? "An unknown error occurred.")
            }
        // }
    }

    @MainActor
    private func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        do {
            // Ensure SupabaseManager has a valid restaurant ID before fetching
            guard supabaseManager.currentRestaurantId != nil else {
                self.errorMessage = "Restaurant not identified for fetching categories."
                self.showingErrorAlert = true
                self.isLoading = false
                self.categories = []
                return
            }
            self.categories = try await supabaseManager.fetchAllCategories()
        } catch {
            print("Error fetching categories: \(error.localizedDescription)")
            self.errorMessage = "Failed to load categories: \(error.localizedDescription)"
            self.showingErrorAlert = true
            self.categories = [] // Clear categories on error
        }

        // Fetch draft order summary (should run regardless of category fetch outcome)
        await updateDraftOrderSummary()

        isLoading = false
    }

    @MainActor
    private func updateDraftOrderSummary() async {
        do {
            if let draftOrder = try await orderManager.getDraftOrder(orderId: self.orderId) {
                self.draftOrderItemsCount = draftOrder.order_items?.count ?? 0
            } else {
                self.draftOrderItemsCount = 0 // No order found or order has no items
            }
        } catch {
            print("Error fetching draft order summary: \(error.localizedDescription)")
            self.draftOrderItemsCount = 0 // Reset on error
        }
    }
}

struct MenuCategoryView_Previews: PreviewProvider {
    static var previews: some View {
        // Create mock data for preview using canonical models
        let mockOrderManager = OrderManager()
        let mockSupabaseManager = SupabaseManager.shared // Use shared for convenience or a mock

        // Ensure currentRestaurant is set on SupabaseManager for previews if fetchCategories relies on it
        // For example:
        // mockSupabaseManager.currentRestaurant = Restaurant(id: "previewResto", name: "Preview Cafe", ...)
        // This step might be more involved if currentRestaurant is not easily settable or if using a pure mock.

        // Create a mock Table instance (canonical model)
        let mockTable = Table(
            id: "previewTable1",
            restaurant_id: "previewResto", // Ensure this matches what SupabaseManager might expect
            name: "P1",
            status: .available,
            capacity: 2,
            is_outdoor: false,
            is_accessible: true,
            notes: nil,
            qr_code: nil,
            created_at: ISO8601DateFormatter().string(from: Date()),
            updated_at: ISO8601DateFormatter().string(from: Date())
        )
        let mockOrderId = "previewOrder123"

        return NavigationView { // NavigationView for toolbar and title to show up correctly
            MenuCategoryView(orderId: mockOrderId, table: mockTable)
                .environmentObject(mockOrderManager)
                .environmentObject(mockSupabaseManager)
        }
    }
}

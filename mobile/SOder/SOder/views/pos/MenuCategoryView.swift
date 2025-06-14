import SwiftUI

// Basic Category model for this view's purpose
// In a real app, this would come from the shared models directory
struct Category: Identifiable, Codable, Hashable {
    let id: String
    let name_en: String
    let name_ja: String? // Optional for simplicity if not all languages are always present
    let name_vi: String? // Optional

    // Computed property for display name based on current localization (placeholder)
    var displayName: String {
        // TODO: Integrate with LocalizationManager.shared.currentLanguage or similar
        return name_en // Defaulting to English
    }

    // Mock data
    static func mockCategories() -> [Category] {
        return [
            Category(id: UUID().uuidString, name_en: "Appetizers", name_ja: "前菜", name_vi: "Khai vị"),
            Category(id: UUID().uuidString, name_en: "Soups & Salads", name_ja: "スープ＆サラダ", name_vi: "Súp và Salad"),
            Category(id: UUID().uuidString, name_en: "Main Courses - Meat", name_ja: "メイン（肉料理）", name_vi: "Món chính - Thịt"),
            Category(id: UUID().uuidString, name_en: "Main Courses - Fish", name_ja: "メイン（魚料理）", name_vi: "Món chính - Cá"),
            Category(id: UUID().uuidString, name_en: "Pasta & Pizza", name_ja: "パスタ＆ピザ", name_vi: "Mì Ý và Pizza"),
            Category(id: UUID().uuidString, name_en: "Vegetarian Options", name_ja: "ベジタリアン", name_vi: "Món chay"),
            Category(id: UUID().uuidString, name_en: "Side Dishes", name_ja: "サイドディッシュ", name_vi: "Món ăn kèm"),
            Category(id: UUID().uuidString, name_en: "Desserts", name_ja: "デザート", name_vi: "Tráng miệng"),
            Category(id: UUID().uuidString, name_en: "Hot Drinks", name_ja: "温かい飲み物", name_vi: "Đồ uống nóng"),
            Category(id: UUID().uuidString, name_en: "Cold Drinks", name_ja: "冷たい飲み物", name_vi: "Đồ uống lạnh"),
            Category(id: UUID().uuidString, name_en: "Alcoholic Beverages", name_ja: "アルコール飲料", name_vi: "Đồ uống có cồn")
        ]
    }
}

struct MenuCategoryView: View {
    let orderId: String
    let table: Table // The selected table

    @EnvironmentObject var orderManager: OrderManager
    // @EnvironmentObject var supabaseManager: SupabaseManager // If needed for direct category fetching

    @State private var categories: [Category] = []
    @State private var isLoading = false
    @State private var draftOrderItemsCount: Int = 0

    // For placeholder navigation
    @State private var navigateToCategory: Category? = nil
    @State private var navigateToDraftOrder = false

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
        // }
    }

    @MainActor
    private func loadInitialData() async {
        isLoading = true
        // Fetch categories (mocked for now)
        // In a real app: self.categories = try? await supabaseManager.fetchAllCategories(forRestaurant: restaurantId)
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 second delay
        self.categories = Category.mockCategories()

        // Fetch draft order summary
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
        // Create mock data for preview
        let mockOrderManager = OrderManager()
        let mockTable = Table(id: "previewTable1", name: "P1", status: "available", capacity: 2)
        let mockOrderId = "previewOrder123"

        // For the preview, we can manually add a mock order to the OrderManager
        // or ensure its getDraftOrder returns something.
        // The current getDraftOrder in OrderManager already returns a mock order.

        NavigationView { // NavigationView for toolbar and title to show up correctly
            MenuCategoryView(orderId: mockOrderId, table: mockTable)
                .environmentObject(mockOrderManager)
                // .environmentObject(SupabaseManager.shared) // If SupabaseManager is used directly
        }
    }
}

import SwiftUI

// Basic MenuItem model for this view's purpose
// In a real app, this would come from the shared models directory
struct MenuItem: Identifiable, Codable, Hashable {
    let id: String
    let category_id: String
    let name_en: String
    let name_ja: String?
    let name_vi: String?
    let description_en: String?
    let description_ja: String?
    let description_vi: String?
    let price: Double
    // Future properties: imageUrl, allergens, isPopular, sizes: [MenuItemSize], toppings: [Topping], etc.

    var displayName: String {
        // TODO: Integrate with LocalizationManager
        return name_en
    }
    var displayDescription: String? {
        // TODO: Integrate with LocalizationManager
        return description_en
    }

    static func mockItems(categoryId: String) -> [MenuItem] {
        let allItems = [
            MenuItem(id: UUID().uuidString, category_id: "cat1", name_en: "Crispy Spring Rolls (Veg)", name_ja: "揚げ春巻き（野菜）", name_vi: "Chả Giò Chay Giòn", description_en: "4 pieces of crispy vegetarian spring rolls served with sweet chili sauce.", price: 650),
            MenuItem(id: UUID().uuidString, category_id: "cat1", name_en: "Fresh Summer Rolls (Shrimp & Pork)", name_ja: "生春巻き（エビと豚肉）", name_vi: "Gỏi Cuốn Tôm Thịt", description_en: "2 large rolls with vermicelli, shrimp, pork, fresh herbs, served with peanut sauce.", price: 700),
            MenuItem(id: UUID().uuidString, category_id: "cat1", name_en: "Edamame with Sea Salt", name_ja: "枝豆（海塩）", name_vi: "Đậu Nành Luộc Muối Biển", description_en: "Steamed young soybeans, lightly salted.", price: 450),

            MenuItem(id: UUID().uuidString, category_id: "cat2", name_en: "Classic Beef Pho", name_ja: "定番牛肉のフォー", name_vi: "Phở Bò Truyền Thống", description_en: "Rich beef broth with rice noodles, sliced beef, and fresh herbs.", price: 1200),
            MenuItem(id: UUID().uuidString, category_id: "cat2", name_en: "Spicy Lemongrass Chicken Noodle Soup", name_ja: "辛口レモングラスチキンヌードルスープ", name_vi: "Bún Gà Sả Ớt Cay", description_en: "Spicy and sour soup with chicken, lemongrass, and rice vermicelli.", price: 1100),

            MenuItem(id: UUID().uuidString, category_id: "cat3", name_en: "Grilled Salmon with Dill", name_ja: "サーモンのグリル（ディル風味）", name_vi: "Cá Hồi Nướng Thì Là", description_en: "Pan-seared salmon fillet with a creamy dill sauce, served with asparagus.", price: 1800),
            MenuItem(id: UUID().uuidString, category_id: "cat3", name_en: "Shaking Beef (Bo Luc Lac)", name_ja: "サイコロステーキ（ボー・ルック・ラック）", name_vi: "Bò Lúc Lắc", description_en: "Wok-tossed marinated beef cubes with bell peppers and onions.", price: 2200),

            MenuItem(id: UUID().uuidString, category_id: "cat4", name_en: "Margherita Pizza", name_ja: "マルゲリータピザ", name_vi: "Pizza Margherita", description_en: "Classic pizza with tomato, mozzarella, and basil.", price: 1300),

            MenuItem(id: UUID().uuidString, category_id: "cat5", name_en: "Tofu & Vegetable Curry", name_ja: "豆腐と野菜のカレー", name_vi: "Cà Ri Đậu Hũ Rau Củ", description_en: "Mild yellow curry with tofu, potatoes, carrots, and green beans. Served with rice.", price: 1400),

            MenuItem(id: UUID().uuidString, category_id: "cat6", name_en: "Steamed Jasmine Rice", name_ja: "ジャスミンライス", name_vi: "Cơm Trắng", description_en: "Fluffy steamed jasmine rice.", price: 200),

            MenuItem(id: UUID().uuidString, category_id: "cat7", name_en: "Mango Sticky Rice", name_ja: "マンゴーもち米", name_vi: "Xôi Xoài", description_en: "Sweet sticky rice with fresh mango slices and coconut cream.", price: 750),
            MenuItem(id: UUID().uuidString, category_id: "cat7", name_en: "Mochi Ice Cream Selection", name_ja: "餅アイスセレクション", name_vi: "Kem Mochi Thập Cẩm", description_en: "Assortment of 3 mochi ice cream pieces (e.g., green tea, mango, strawberry).", price: 600),

            MenuItem(id: UUID().uuidString, category_id: "cat8", name_en: "Vietnamese Iced Coffee", name_ja: "ベトナム風アイスコーヒー", name_vi: "Cà Phê Sữa Đá", description_en: "Strong drip coffee with condensed milk, served over ice.", price: 550),
            MenuItem(id: UUID().uuidString, category_id: "cat8", name_en: "Japanese Green Tea (Pot)", name_ja: "緑茶（ポット）", name_vi: "Trà Xanh Nhật Bản (Ấm)", description_en: "Hot Japanese sencha.", price: 400),

            MenuItem(id: UUID().uuidString, category_id: "cat9", name_en: "Asahi Super Dry Beer", name_ja: "アサヒスーパードライ", name_vi: "Bia Asahi Super Dry", description_en: "Japanese imported beer.", price: 700),
        ]
        // Simple mapping for mock categories used in MenuCategoryView to these item category_ids
        let categoryMap = [
            "Appetizers": "cat1",
            "Soups & Salads": "cat2", // Example: Map to Pho for now
            "Main Courses - Meat": "cat3", // Example: Map to Shaking Beef
            "Main Courses - Fish": "cat3", // Example: Map to Salmon
            "Pasta & Pizza": "cat4",
            "Vegetarian Options": "cat5",
            "Side Dishes": "cat6",
            "Desserts": "cat7",
            "Hot Drinks": "cat8", // Could be more specific
            "Cold Drinks": "cat8", // Could be more specific
            "Alcoholic Beverages": "cat9"
        ]

        let targetCatId = categoryMap[categoryId] ?? categoryId // Use mapping if display name was passed, else assume raw ID

        return allItems.filter { $0.category_id == targetCatId }
    }
}


struct MenuItemView: View {
    let category: Category
    let orderId: String
    let table: Table

    @EnvironmentObject var orderManager: OrderManager
    // @EnvironmentObject var supabaseManager: SupabaseManager // If needed for direct item fetching

    @State private var menuItems: [MenuItem] = []
    @State private var isLoading = false
    @State private var draftOrderItemsCount: Int = 0

    // For placeholder navigation
    @State private var navigateToAddItemDetail: MenuItem? = nil
    @State private var navigateToDraftOrder = false

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
                    navigateToDraftOrder = true
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
        .alert("Add/Customize Item", isPresented: Binding(
            get: { navigateToAddItemDetail != nil },
            set: { if !$0 { navigateToAddItemDetail = nil } }
        )) {
            Button("OK") { /* Placeholder for navigation to AddItemDetailView */ }
        } message: {
            Text("Would navigate to details/customization for item: \(navigateToAddItemDetail?.displayName ?? "N/A")")
        }
        .alert("Navigate to Draft Order", isPresented: $navigateToDraftOrder) {
             Button("OK") { /* Placeholder */ }
        } message: {
            Text("Would navigate to Draft Order View for order \(orderId). Items: \(draftOrderItemsCount)")
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
                navigateToAddItemDetail = item
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
        // Fetch menu items (mocked for now)
        // In a real app: self.menuItems = try? await supabaseManager.fetchMenuItems(categoryId: category.id, forRestaurant: restaurantId)
        try? await Task.sleep(nanoseconds: 500_000_000) // 0.5 second delay
        self.menuItems = MenuItem.mockItems(categoryId: category.name_en) // Using name_en as a key for mock categories

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
        let mockCategory = Category.mockCategories().first! // Take the first mock category
        let mockTable = Table(id: "previewTable1", name: "P1", status: "available", capacity: 2)
        let mockOrderId = "previewOrderMenuItemView"

        NavigationView { // For toolbar and title
            MenuItemView(category: mockCategory, orderId: mockOrderId, table: mockTable)
                .environmentObject(mockOrderManager)
        }
    }
}

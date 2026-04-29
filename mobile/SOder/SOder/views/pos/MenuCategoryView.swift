import SwiftUI

struct MenuCategoryView: View {
    let orderId: String
    let table: Table
    let onOrderConfirmed: (() -> Void)?

    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var supabaseManager: SupabaseManager

    @State private var categories: [Category] = []
    @State private var isLoading = false
    @State private var draftOrderItemsCount: Int = 0
    @State private var selectedCategory: Category? = nil
    @State private var showingDraftOrder = false
    @State private var errorMessage: String? = nil
    @State private var showingErrorAlert: Bool = false

    var body: some View {
        Group {
            if isLoading {
                ProgressView("kitchen_loading_data".localized)
            } else if categories.isEmpty {
                Text("menu_categories_empty".localized)
                    .font(.bodyMedium)
                    .foregroundColor(.appTextSecondary)
            } else {
                List {
                    ForEach(categories) { category in
                        Button(action: {
                            selectedCategory = category
                        }) {
                            HStack {
                                Text(category.displayName)
                                    .font(.sectionHeader)
                                    .foregroundColor(.appTextPrimary)

                                Spacer()

                                Image(systemName: "chevron.right")
                                    .font(.captionRegular)
                                    .foregroundColor(.appTextSecondary)
                            }
                        }
                        .accessibilityLabel(category.displayName)
                        .accessibilityHint("menu_category_item_hint".localized)
                    }
                }
            }
        }
        .navigationTitle(String(format: "menu_category_nav_title".localized, table.name))
        .navigationDestination(item: $selectedCategory) { category in
            MenuItemView(category: category, orderId: orderId, table: table, onOrderConfirmed: onOrderConfirmed)
                .environmentObject(orderManager)
                .environmentObject(supabaseManager)
        }
        .sheet(isPresented: $showingDraftOrder) {
            NavigationStack {
                DraftOrderView(orderId: orderId, table: table, onOrderConfirmed: onOrderConfirmed)
                    .environmentObject(orderManager)
            }
        }
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button(action: {
                    showingDraftOrder = true
                }) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "cart")
                            .font(.sectionHeader)

                        if draftOrderItemsCount > 0 {
                            Text("\(draftOrderItemsCount)")
                                .font(.monoCaption)
                                .padding(Spacing.xs)
                                .background(Color.appError)
                                .clipShape(Circle())
                                .foregroundColor(.white)
                                .offset(x: -Spacing.xs, y: -Spacing.xs)
                        }
                    }
                }
                .accessibilityLabel(draftOrderItemsCount > 0
                    ? String(format: "menu_category_cart_hint".localized, draftOrderItemsCount)
                    : "menu_category_cart_empty_hint".localized)
            }
        }
        .task {
            await loadInitialData()
        }
        .alert("error".localized, isPresented: $showingErrorAlert) {
            Button("ok".localized) {}
        } message: {
            Text(errorMessage ?? "error".localized)
        }
    }

    @MainActor
    private func loadInitialData() async {
        isLoading = true
        errorMessage = nil

        do {
            guard supabaseManager.currentRestaurantId != nil else {
                errorMessage = "error".localized
                showingErrorAlert = true
                isLoading = false
                categories = []
                return
            }
            categories = try await supabaseManager.fetchAllCategories()
        } catch {
            errorMessage = error.localizedDescription
            showingErrorAlert = true
            categories = []
        }

        await updateDraftOrderSummary()
        isLoading = false
    }

    @MainActor
    private func updateDraftOrderSummary() async {
        do {
            if let draftOrder = try await orderManager.getDraftOrder(orderId: orderId) {
                draftOrderItemsCount = draftOrder.order_items?.count ?? 0
            } else {
                draftOrderItemsCount = 0
            }
        } catch {
            draftOrderItemsCount = 0
        }
    }
}

#Preview {
    let mockTable = Table(
        id: "previewTable1",
        restaurant_id: "previewResto",
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

    return NavigationView {
        MenuCategoryView(orderId: "previewOrder123", table: mockTable, onOrderConfirmed: nil)
            .environmentObject(OrderManager.shared)
            .environmentObject(SupabaseManager.shared)
    }
}

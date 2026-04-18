import SwiftUI

// Local stubs for Table and TableStatus have been removed.
// This view will now use the canonical versions from Models.swift

// Helper extension for TableStatus to define isSelectableForNewOrder if not already on canonical model
// This is a UI-specific concern, so an extension here is acceptable.
// If TableStatus from Models.swift already has this, this extension can be removed.
extension TableStatus {
    var isSelectableForNewOrder: Bool {
        return self == .available
    }

    var swiftUIColor: Color {
        return statusColor
    }
}



struct SelectTableView: View {
    let onOrderConfirmed: (() -> Void)?
    
    // Using EnvironmentObject to consume the shared OrderManager instance
    @EnvironmentObject private var orderManager: OrderManager
    @EnvironmentObject var supabaseManager: SupabaseManager // For fetching tables

    @State private var tables: [Table] = [] // This will now be [Models.Table]

    @State private var isLoading = false
    @State private var showingErrorAlert = false
    @State private var errorMessage: String? = nil

    // For navigation to MenuSelectionView
    @State private var selectedTable: Table? = nil
    @State private var newOrderId: String? = nil

    // Define grid layout: 3 columns for iPad, 2 for iPhone
    #if os(iOS)
    private var columns: [GridItem] {
        UIDevice.current.userInterfaceIdiom == .pad ?
            Array(repeating: .init(.flexible()), count: 3) :
            Array(repeating: .init(.flexible()), count: 2)
    }
    #else // macOS or other platforms
    private var columns: [GridItem] = Array(repeating: .init(.flexible()), count: 3)
    #endif

    private func operationalStatus(for table: Table) -> TableOperationalStatus {
        orderManager.operationalStatus(for: table)
    }

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView("Loading tables...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if tables.isEmpty {
                    Text("No tables found for this restaurant.")
                        .foregroundColor(.secondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 20) {
                            ForEach(tables) { table in
                                tableCell(for: table)
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Select a Table")
            .navigationDestination(item: $selectedTable) { table in
                if let orderId = newOrderId {
                    MenuSelectionView(orderId: orderId, table: table, onOrderConfirmed: onOrderConfirmed)
                        .environmentObject(orderManager)
                        .environmentObject(supabaseManager)
                }
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        Task {
                            await fetchTables()
                        }
                    } label: {
                        Image(systemName: "arrow.clockwise")
                    }
                    .accessibilityLabel("Refresh tables")
                }
            }
            .task {
                if tables.isEmpty { // Fetch only if tables aren't already loaded
                    await fetchTables()
                }
            }
            .alert("Error", isPresented: $showingErrorAlert) {
                Button("OK") {}
            } message: {
                Text(errorMessage ?? "An unknown error occurred.")
            }
        }
    }

    @ViewBuilder
    private func tableCell(for table: Table) -> some View { // table is now Models.Table
        let status = operationalStatus(for: table)
        let isSelectable = status == .available || status == .occupied || status == .serving

        VStack(alignment: .center, spacing: 8) {
            Text(table.name)
                .font(.sectionHeader)
                .fontWeight(.bold)
                .foregroundColor(.appTextPrimary)
                .lineLimit(2)
                .minimumScaleFactor(0.8)

            HStack {
                Image(systemName: status == .available ? "checkmark.circle.fill" : "info.circle.fill")
                    .foregroundColor(status.statusColor)
                Text(status.displayName)
                    .font(.bodyMedium)
                    .fontWeight(.medium)
                    .foregroundColor(status.statusColor)
            }

            Text("Capacity: \(table.capacity)")
                .font(.captionRegular)
                .foregroundColor(.appTextSecondary)
        }
        .padding(Spacing.md)
        .frame(minHeight: 120)
        .frame(maxWidth: .infinity)
        .background(Color.appSurface)
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 3, x: 1, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(status.statusColor.opacity(0.7), lineWidth: status == .available ? 2 : 0.5)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(table.name), Status: \(status.displayName), Capacity: \(table.capacity)")
        .accessibilityHint(status == .available ? "Tap to start a new order for this table." : (status == .occupied || status == .serving) ? "Tap to add items to the existing order for this table." : "This table is currently \(status.displayName).")
        .onTapGesture {
            if status == .available {
                print("Selected available table: \(table.name)")
                // Create a new draft order session locally (not in database yet)
                let localOrderId = UUID().uuidString
                Task {
                    await orderManager.createLocalDraftOrder(orderId: localOrderId, table: table)
                }
                newOrderId = localOrderId
                selectedTable = table
            } else if status == .occupied || status == .serving {
                print("Selected occupied table: \(table.name)")
                // Find the active order for this table and allow adding items
                Task {
                    if let activeOrder = await findActiveOrderForTable(table) {
                        newOrderId = activeOrder.id
                        selectedTable = table
                    }
                }
            } else {
                print("Selected non-available table: \(table.name), Status: \(status.displayName)")
                // For reserved tables or other statuses, no action
            }
        }
        .disabled(!isSelectable)
        .opacity(isSelectable ? 1.0 : 0.7)
    }

    @MainActor
    private func fetchTables() async {
        isLoading = true
        errorMessage = nil

        do {
            // Ensure SupabaseManager has a valid restaurant ID
            guard supabaseManager.currentRestaurantId != nil else {
                self.errorMessage = "Restaurant not identified. Please ensure you are logged in correctly."
                self.showingErrorAlert = true
                self.isLoading = false
                self.tables = [] // Clear tables if restaurant ID is missing
                return
            }

            self.tables = try await supabaseManager.fetchAllTables()
            if self.tables.isEmpty {
                // You might want to set a specific message for "no tables found" vs. an error
                // For now, the main view handles the empty state text.
                print("No tables found for the current restaurant.")
            }
        } catch {
            print("Error fetching tables: \(error.localizedDescription)")
            self.errorMessage = "Failed to load tables: \(error.localizedDescription)"
            self.showingErrorAlert = true
            self.tables = [] // Clear tables on error
        }

        isLoading = false
    }

    @MainActor
    private func findActiveOrderForTable(_ table: Table) async -> Order? {
        // Check if there's an active order for this table
        let activeOrders = orderManager.orders
        return activeOrders.first { order in
            order.table_id == table.id && (order.status == .new || order.status == .serving)
        }
    }
}

// Preview
struct SelectTableView_Previews: PreviewProvider {
    static var previews: some View {
        // For preview, create mock SupabaseManager
        let mockSupabaseManager = SupabaseManager.shared // Using shared for preview convenience

        // If SupabaseManager.shared.currentRestaurant is nil, the mock data generation might use a default.
        // For a more robust preview, ensure currentRestaurant is set or SupabaseManager is mocked appropriately.

        return SelectTableView(onOrderConfirmed: nil)
            .environmentObject(mockSupabaseManager)
    }
}

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

    // Convert the string color from the canonical model to a SwiftUI.Color
    var swiftUIColor: Color {
        switch self.color { // self.color refers to the String property from canonical TableStatus
        case "green": return .green
        case "orange": return .orange
        case "purple": return .purple
        case "gray": return .gray
        case "red": return .red
        case "blue": return .blue
        case "teal": return .teal // Added from OrderStatus, might be useful
        default: return .yellow // Fallback for unknown string colors
        }
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
        // let status = TableStatus(rawValue: table.status) // No longer needed, table.status is TableStatus enum
        let status = table.status // Directly use the enum from the model

        VStack(alignment: .center, spacing: 8) {
            Text(table.name)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(.primary)
                .lineLimit(2)
                .minimumScaleFactor(0.8)

            HStack {
                Image(systemName: status.isSelectableForNewOrder ? "checkmark.circle.fill" : "info.circle.fill")
                    .foregroundColor(status.swiftUIColor) // Use swiftUIColor
                Text(status.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(status.swiftUIColor) // Use swiftUIColor
            }

            Text("Capacity: \(table.capacity)")
                .font(.caption)
                .foregroundColor(.gray)
        }
        .padding()
        .frame(minHeight: 120) // Give a minimum height for consistency
        .frame(maxWidth: .infinity)
        .background(Color(UIColor.secondarySystemGroupedBackground)) // Adapts to light/dark mode
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 3, x: 1, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(status.swiftUIColor.opacity(0.7), lineWidth: status.isSelectableForNewOrder ? 2 : 0.5) // Use swiftUIColor
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(table.name), Status: \(status.displayName), Capacity: \(table.capacity)")
        .accessibilityHint(status.isSelectableForNewOrder ? "Tap to start a new order for this table." : "This table is currently \(status.displayName).")
        .onTapGesture {
            if status.isSelectableForNewOrder {
                print("Selected available table: \(table.name)")
                // Create a new draft order ID
                newOrderId = UUID().uuidString
                selectedTable = table
            } else {
                print("Selected non-available table: \(table.name), Status: \(status.displayName)")
                // Optionally, show an alert or navigate to existing order details if occupied/reserved
                // For this subtask, non-available tables are not interactive for new orders.
            }
        }
        .disabled(!status.isSelectableForNewOrder) // Visually and functionally disable non-selectable tables
        .opacity(status.isSelectableForNewOrder ? 1.0 : 0.7) // Dim non-selectable tables
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

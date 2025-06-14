import SwiftUI

// Basic Table model for this view's purpose
// In a real app, this would come from the shared models directory
struct Table: Identifiable, Codable, Hashable {
    let id: String
    var name: String
    var status: String // "available", "occupied", "reserved"
    var capacity: Int?

    // Mock data
    static let mockTables: [Table] = [
        Table(id: UUID().uuidString, name: "Table 1", status: "available", capacity: 4),
        Table(id: UUID().uuidString, name: "Table 2", status: "occupied", capacity: 2),
        Table(id: UUID().uuidString, name: "Table 3", status: "reserved", capacity: 6),
        Table(id: UUID().uuidString, name: "Table 4", status: "available", capacity: 4),
        Table(id: UUID().uuidString, name: "Counter Seat 1", status: "available", capacity: 1),
        Table(id: UUID().uuidString, name: "Counter Seat 2", status: "occupied", capacity: 1),
        Table(id: UUID().uuidString, name: "VIP Room", status: "available", capacity: 10),
        Table(id: UUID().uuidString, name: "Patio 1", status: "maintenance", capacity: 4), // Example of another status
    ]
}

// Enum for Table Status to manage colors and interactivity
enum TableStatus: String, CaseIterable {
    case available
    case occupied
    case reserved
    case maintenance // Added another example status
    case unknown

    init(rawValue: String) {
        switch rawValue.lowercased() {
        case "available": self = .available
        case "occupied": self = .occupied
        case "reserved": self = .reserved
        case "maintenance": self = .maintenance
        default: self = .unknown
        }
    }

    var color: Color {
        switch self {
        case .available: return .green
        case .occupied: return .orange
        case .reserved: return .purple
        case .maintenance: return .gray
        case .unknown: return .yellow
        }
    }

    var displayName: String {
        return self.rawValue.capitalized
    }

    var isSelectableForNewOrder: Bool {
        return self == .available
    }
}

struct SelectTableView: View {
    // Using EnvironmentObject assuming these are set up higher in the hierarchy in a real app
    // For isolated preview/testing, @StateObject might be used initially.
    @EnvironmentObject var orderManager: OrderManager
    @EnvironmentObject var supabaseManager: SupabaseManager // For fetching tables

    @State private var tables: [Table] = []
    @State private var isLoading = false
    @State private var showingErrorAlert = false
    @State private var errorMessage: String? = nil

    // For navigation to MenuCategoryView (actual navigation will be set up later)
    @State private var navigateToMenuForTable: Table? = nil

    // Define grid layout: 3 columns for iPad, 2 for iPhone
    #if os(iOS)
    private var columns: [GridItem] {
        UserInterfaceIdiom.current == .pad ?
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
            .alert("Start Order", isPresented: Binding(
                get: { navigateToMenuForTable != nil },
                set: { if !$0 { navigateToMenuForTable = nil } }
            )) {
                Button("OK") {
                    // Actual navigation would be handled here, e.g., using NavigationLink value
                    // For now, just dismisses the alert.
                    // The next step would be to navigate to MenuCategoryView(table: selectedTable)
                    print("Navigation to MenuCategoryView for table \(navigateToMenuForTable?.name ?? "") confirmed.")
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("Proceed to menu for table \(navigateToMenuForTable?.name ?? "")?")
            }
            .alert("Error", isPresented: $showingErrorAlert) {
                Button("OK") {}
            } message: {
                Text(errorMessage ?? "An unknown error occurred.")
            }
        }
    }

    @ViewBuilder
    private func tableCell(for table: Table) -> some View {
        let status = TableStatus(rawValue: table.status)

        VStack(alignment: .center, spacing: 8) {
            Text(table.name)
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(.primary)
                .lineLimit(2)
                .minimumScaleFactor(0.8)

            HStack {
                Image(systemName: status.isSelectableForNewOrder ? "checkmark.circle.fill" : "info.circle.fill")
                    .foregroundColor(status.color)
                Text(status.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundColor(status.color)
            }

            if let capacity = table.capacity {
                Text("Capacity: \(capacity)")
                    .font(.caption)
                    .foregroundColor(.gray)
            }
        }
        .padding()
        .frame(minHeight: 120) // Give a minimum height for consistency
        .frame(maxWidth: .infinity)
        .background(Color(UIColor.secondarySystemGroupedBackground)) // Adapts to light/dark mode
        .cornerRadius(12)
        .shadow(color: .black.opacity(0.1), radius: 3, x: 1, y: 2)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(status.color.opacity(0.7), lineWidth: status.isSelectableForNewOrder ? 2 : 0.5)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(table.name), Status: \(status.displayName)\(table.capacity != nil ? ", Capacity: \(table.capacity!)" : "")")
        .accessibilityHint(status.isSelectableForNewOrder ? "Tap to start a new order for this table." : "This table is currently \(status.displayName).")
        .onTapGesture {
            if status.isSelectableForNewOrder {
                print("Selected available table: \(table.name)")
                navigateToMenuForTable = table // Trigger alert/navigation
            } else {
                print("Selected non-available table: \(table.name), Status: \(status.displayName)")
                // Optionally, show an alert or navigate to existing order details if occupied/reserved
                // For this subtask, non-available tables are not interactive for new orders.
            }
        }
        .disabled(!status.isSelectableForNewOrder) // Visually and functionally disable non-selectable tables
        .opacity(status.isSelectableForNewOrder ? 1.0 : 0.7) // Dim non-selectable tables
    }

    // Stubbed data fetching
    @MainActor
    private func fetchTables() async {
        isLoading = true
        errorMessage = nil

        // Simulate network delay
        try? await Task.sleep(nanoseconds: 1_000_000_000) // 1 second

        // In a real app, this would call supabaseManager.fetchAllTables()
        // For now, use mock data.
        // self.tables = try await supabaseManager.fetchAllTablesForRestaurant()

        // Using mock data:
        self.tables = Table.mockTables.shuffled() // Shuffle to see different orders

        // Example of error handling (can be uncommented to test)
        // self.errorMessage = "Failed to load tables. Please try again."
        // self.showingErrorAlert = true

        isLoading = false
    }
}

// Preview
struct SelectTableView_Previews: PreviewProvider {
    static var previews: some View {
        // For preview, create mock managers or use in-memory versions
        // This setup is basic; a real preview might need more context.
        let mockOrderManager = OrderManager() // Assuming OrderManager() can be initialized
        let mockSupabaseManager = SupabaseManager.shared // Or a mock version

        SelectTableView()
            .environmentObject(mockOrderManager)
            .environmentObject(mockSupabaseManager)
            .onAppear {
                // You might want to populate mockSupabaseManager with some restaurant context
                // if SelectTableView relies on it directly during initialization or .task
                if mockSupabaseManager.currentRestaurant == nil {
                     // mockSupabaseManager.currentRestaurant = Restaurant(id: "preview_resto_id", name: "Preview Cafe", ...)
                }
            }
    }
}

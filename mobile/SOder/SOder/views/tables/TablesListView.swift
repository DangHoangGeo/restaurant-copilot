import SwiftUI

struct TablesListView: View {
    @StateObject private var viewModel = TablesViewModel()
    @EnvironmentObject var printerManager: PrinterManager
    @State private var selectedTable: Table?
    @State private var showPrintPreview = false
    @State private var searchText = ""

    var filteredTables: [Table] {
        if searchText.isEmpty {
            return viewModel.tables
        } else {
            return viewModel.tables.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Search bar
                SearchBar(text: $searchText, placeholder: "tables_search_placeholder".localized)
                    .padding(.horizontal)
                    .padding(.vertical, 8)

                if viewModel.isLoading {
                    ProgressView("tables_loading".localized)
                        .frame(maxHeight: .infinity)
                } else if let error = viewModel.errorMessage {
                    ErrorView(message: error, retryAction: {
                        Task {
                            await viewModel.fetchTables()
                        }
                    })
                } else if filteredTables.isEmpty {
                    EmptyTablesView(hasSearch: !searchText.isEmpty)
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(filteredTables) { table in
                                TableRowView(
                                    table: table,
                                    onPrintQR: {
                                        selectedTable = table
                                        showPrintPreview = true
                                    }
                                )
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("tables_title".localized)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: {
                        Task {
                            await viewModel.fetchTables()
                        }
                    }) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
        .navigationViewStyle(.stack) // Force single column layout on iPad
        .sheet(isPresented: $showPrintPreview) {
            if let table = selectedTable {
                TableQRPrintView(table: table)
                    .environmentObject(printerManager)
            }
        }
        .task {
            await viewModel.fetchTables()
        }
    }
}

// MARK: - Table Row View
struct TableRowView: View {
    let table: Table
    let onPrintQR: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            // Table Icon and Info
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(statusColor.opacity(0.2))
                        .frame(width: 50, height: 50)

                    Image(systemName: "table.furniture")
                        .font(.system(size: 24))
                        .foregroundColor(statusColor)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(table.name)
                        .font(.headline)
                        .foregroundColor(.primary)

                    HStack(spacing: 8) {
                        Label("\(table.capacity)", systemImage: "person.2")
                            .font(.caption)
                            .foregroundColor(.secondary)

                        Text(table.status.displayName)
                            .font(.caption)
                            .foregroundColor(statusColor)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 2)
                            .background(statusColor.opacity(0.1))
                            .cornerRadius(4)
                    }
                }
            }

            Spacer()

            // Print QR Button
            Button(action: onPrintQR) {
                VStack(spacing: 4) {
                    Image(systemName: "qrcode")
                        .font(.system(size: 24))
                        .foregroundColor(.blue)

                    Text("tables_print_qr".localized)
                        .font(.caption2)
                        .foregroundColor(.blue)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.blue.opacity(0.1))
                .cornerRadius(8)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
    }

    private var statusColor: Color {
        switch table.status {
        case .available:
            return .green
        case .occupied:
            return .orange
        case .reserved:
            return .purple
        case .maintenance:
            return .gray
        }
    }
}

// MARK: - Search Bar
struct SearchBar: View {
    @Binding var text: String
    let placeholder: String

    var body: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.gray)

            TextField(placeholder, text: $text)
                .textFieldStyle(PlainTextFieldStyle())

            if !text.isEmpty {
                Button(action: { text = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.gray)
                }
            }
        }
        .padding(10)
        .background(Color(.systemGray6))
        .cornerRadius(10)
    }
}

// MARK: - Empty States
struct EmptyTablesView: View {
    let hasSearch: Bool

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: hasSearch ? "magnifyingglass" : "table.furniture")
                .font(.system(size: 60))
                .foregroundColor(.gray)

            Text(hasSearch ? "tables_no_results".localized : "tables_empty".localized)
                .font(.headline)
                .foregroundColor(.secondary)

            if !hasSearch {
                Text("tables_empty_message".localized)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }
        }
        .frame(maxHeight: .infinity)
    }
}

// MARK: - Error View
struct ErrorView: View {
    let message: String
    let retryAction: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 60))
                .foregroundColor(.red)

            Text("tables_error".localized)
                .font(.headline)

            Text(message)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)

            Button(action: retryAction) {
                Text("tables_retry".localized)
                    .fontWeight(.medium)
                    .foregroundColor(.white)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.blue)
                    .cornerRadius(8)
            }
        }
        .frame(maxHeight: .infinity)
    }
}

// MARK: - View Model
@MainActor
class TablesViewModel: ObservableObject {
    @Published var tables: [Table] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    func fetchTables() async {
        isLoading = true
        errorMessage = nil

        do {
            let supabaseManager = SupabaseManager.shared
            tables = try await supabaseManager.fetchTables()
        } catch {
            errorMessage = error.localizedDescription
            print("Error fetching tables: \(error)")
        }

        isLoading = false
    }
}

import SwiftUI

struct TablesListView: View {
    @StateObject private var viewModel = TablesViewModel()
    @EnvironmentObject private var orderManager: OrderManager
    @EnvironmentObject var printerManager: PrinterManager
    @State private var selectedTable: Table?
    @State private var searchText = ""

    private var filteredTables: [Table] {
        if searchText.isEmpty {
            return viewModel.tables
        }
        return viewModel.tables.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    var body: some View {
        if #available(iOS 16.0, *) {
            NavigationStack {
                content
            }
        } else {
            NavigationView {
                content
            }
            .navigationViewStyle(.stack)
        }
    }

    private var content: some View {
        ZStack {
            AppScreenBackground()

            ScrollView {
                VStack(alignment: .leading, spacing: Spacing.lg) {
                    headerSection
                    SearchBar(text: $searchText, placeholder: "tables_search_placeholder".localized)
                    printerHintSection
                    bodySection
                }
                .padding(.horizontal, Spacing.md)
                .padding(.top, Spacing.md)
                .padding(.bottom, 120)
            }
        }
        .navigationTitle("tables_title".localized)
        .navigationBarTitleDisplayMode(.inline)
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
        .navigationDestination(item: $selectedTable) { table in
            TableQRPrintView(table: table)
                .environmentObject(printerManager)
        }
        .task {
            await viewModel.fetchTables()
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: Spacing.lg) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    AppSectionEyebrow("floor control")

                    Text("tables_title".localized)
                        .font(.heroTitle)
                        .foregroundColor(.appTextPrimary)

                    Text("tables_floor_control_subtitle".localized)
                        .font(.bodyMedium)
                        .foregroundColor(.appTextSecondary)
                }

                Spacer()

                AppHeaderPill("\(filteredTables.count)")
            }
        }
    }

    @ViewBuilder
    private var printerHintSection: some View {
        if !printerManager.isConnected {
            HStack(alignment: .top, spacing: Spacing.sm) {
                Image(systemName: "printer.dotmatrix")
                    .foregroundColor(.appWarning)

                VStack(alignment: .leading, spacing: Spacing.xxs) {
                    Text("tables_print_printer_disconnected".localized)
                        .font(.bodyMedium.weight(.semibold))
                        .foregroundColor(.appTextPrimary)

                    Text("tables_floor_printer_hint".localized)
                        .font(.caption)
                        .foregroundColor(.appTextSecondary)
                }

                Spacer()
            }
            .appPanel(padding: Spacing.md, cornerRadius: CornerRadius.lg, surfaceColor: Color.appSurface.opacity(0.92))
        }
    }

    @ViewBuilder
    private var bodySection: some View {
        if viewModel.isLoading {
            VStack(spacing: Spacing.md) {
                ProgressView("tables_loading".localized)
                    .tint(.appHighlight)
                    .foregroundColor(.appTextPrimary)
            }
            .frame(maxWidth: .infinity, minHeight: 220)
            .appPanel(padding: Spacing.xl, cornerRadius: CornerRadius.xl)
        } else if let error = viewModel.errorMessage {
            ErrorView(message: error, retryAction: {
                Task {
                    await viewModel.fetchTables()
                }
            })
        } else if filteredTables.isEmpty {
            EmptyTablesView(hasSearch: !searchText.isEmpty)
        } else {
            LazyVStack(spacing: Spacing.md) {
                ForEach(filteredTables) { table in
                    TableRowView(
                        table: table,
                        operationalStatus: orderManager.operationalStatus(for: table),
                        onPrintQR: {
                            selectedTable = table
                        }
                    )
                }
            }
        }
    }
}

struct TableRowView: View {
    let table: Table
    let operationalStatus: TableOperationalStatus
    let onPrintQR: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.md) {
            HStack(alignment: .top, spacing: Spacing.md) {
                VStack(alignment: .leading, spacing: Spacing.sm) {
                    HStack(spacing: Spacing.sm) {
                        Text(table.name)
                            .font(.cardTitle)
                            .foregroundColor(.appTextPrimary)

                        Text(operationalStatus.displayName.uppercased())
                            .font(.captionBold)
                            .foregroundColor(statusColor)
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 4)
                            .background(statusColor.opacity(0.16))
                            .cornerRadius(CornerRadius.sm)
                    }

                    HStack(spacing: Spacing.sm) {
                        tableMetaPill(
                            icon: "person.2",
                            text: String(format: "tables_capacity_format".localized, table.capacity)
                        )

                        if table.qr_code != nil {
                            tableMetaPill(icon: "qrcode", text: "tables_qr_ready".localized)
                        }
                    }

                    if let notes = table.notes, !notes.isEmpty {
                        Text(notes)
                            .font(.caption)
                            .foregroundColor(.appTextSecondary)
                            .lineLimit(2)
                    }
                }

                Spacer()

                Button(action: onPrintQR) {
                    HStack(spacing: Spacing.xs) {
                        Image(systemName: "qrcode")
                            .font(.system(size: 16, weight: .semibold))
                        Text("tables_print_qr".localized)
                            .font(.buttonSmall)
                    }
                    .foregroundColor(.appTextPrimary)
                    .padding(.horizontal, Spacing.md)
                    .padding(.vertical, Spacing.md)
                    .background(Color.appSurfaceSecondary)
                    .cornerRadius(CornerRadius.md)
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.md)
                            .stroke(Color.appBorderLight, lineWidth: 1)
                    )
                }
            }
        }
        .appPanel(padding: Spacing.lg, cornerRadius: CornerRadius.lg)
    }

    private var statusColor: Color {
        operationalStatus.statusColor
    }

    private func tableMetaPill(icon: String, text: String) -> some View {
        HStack(spacing: Spacing.xxs) {
            Image(systemName: icon)
            Text(text)
        }
        .font(.monoCaption)
        .foregroundColor(.appTextSecondary)
        .padding(.horizontal, Spacing.sm)
        .padding(.vertical, Spacing.xs)
        .background(Color.appSurfaceSecondary)
        .cornerRadius(CornerRadius.sm)
    }
}

struct SearchBar: View {
    @Binding var text: String
    let placeholder: String

    var body: some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundColor(.appTextSecondary)

            TextField(placeholder, text: $text)
                .textFieldStyle(.plain)
                .foregroundColor(.appTextPrimary)

            if !text.isEmpty {
                Button(action: { text = "" }) {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.appTextSecondary)
                }
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.md)
        .background(Color.appSurface)
        .cornerRadius(CornerRadius.lg)
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.lg)
                .stroke(Color.appBorderLight, lineWidth: 1)
        )
    }
}

struct EmptyTablesView: View {
    let hasSearch: Bool

    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: hasSearch ? "magnifyingglass" : "table.furniture")
                .font(.system(size: 60))
                .foregroundColor(.appTextTertiary)

            Text(hasSearch ? "tables_no_results".localized : "tables_empty".localized)
                .font(.cardTitle)
                .foregroundColor(.appTextPrimary)

            if !hasSearch {
                Text("tables_empty_message".localized)
                    .font(.bodyMedium)
                    .foregroundColor(.appTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Spacing.xl)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 220)
        .appPanel(padding: Spacing.xl, cornerRadius: CornerRadius.xl)
    }
}

struct ErrorView: View {
    let message: String
    let retryAction: () -> Void

    var body: some View {
        VStack(spacing: Spacing.md) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundColor(.appError)

            Text("tables_error".localized)
                .font(.cardTitle)
                .foregroundColor(.appTextPrimary)

            Text(message)
                .font(.bodyMedium)
                .foregroundColor(.appTextSecondary)
                .multilineTextAlignment(.center)

            Button(action: retryAction) {
                Text("tables_retry".localized)
            }
            .buttonStyle(PrimaryButtonStyle())
        }
        .frame(maxWidth: .infinity, minHeight: 220)
        .appPanel(padding: Spacing.xl, cornerRadius: CornerRadius.xl)
    }
}

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

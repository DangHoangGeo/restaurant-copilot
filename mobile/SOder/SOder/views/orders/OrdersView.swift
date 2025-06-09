import SwiftUI

struct OrdersView: View {
    @StateObject private var orderManager = OrderManager()
    @StateObject private var supabaseManager = SupabaseManager.shared
    @EnvironmentObject var printerManager: PrinterManager
    
    @State private var showingPrintAlert = false
    @State private var printMessage = ""
    @State private var selectedFilter: OrderFilter = .active
    @State private var selectedOrder: Order? = nil
    @State private var showingCheckout = false
    @State private var showAllOrders = false
    
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    enum OrderFilter: String, CaseIterable {
        case active = "active"
        case all = "all"
        case new = "new"
        case preparing = "preparing"
        case ready = "ready"
        case completed = "completed"
        
        var displayName: String {
            switch self {
            case .active: return "Active Orders"
            case .all: return "All Orders"
            case .new: return "New"
            case .preparing: return "Preparing"
            case .ready: return "Ready"
            case .completed: return "Completed"
            }
        }
        
        var color: Color {
            switch self {
            case .active: return .blue
            case .all: return .gray
            case .new: return .blue
            case .preparing: return .orange
            case .ready: return .green
            case .completed: return .gray
            }
        }
    }
    
    private var filteredOrders: [Order] {
        let baseOrders = showAllOrders ? orderManager.allOrders : orderManager.orders
        
        switch selectedFilter {
        case .active:
            return baseOrders.filter { $0.status != .completed }
        case .all:
            return baseOrders
        case .new:
            return baseOrders.filter { $0.status == .new }
        case .preparing:
            return baseOrders.filter { $0.status == .preparing }
        case .ready:
            return baseOrders.filter { $0.status == .ready }
        case .completed:
            return baseOrders.filter { $0.status == .completed }
        }
    }

    var body: some View {
        Group {
            if horizontalSizeClass == .regular {
                // iPad Layout - Navigation Split View
                NavigationSplitView {
                    orderSidebar
                } detail: {
                    orderDetailView
                }
            } else {
                // iPhone Layout - Traditional Navigation
                NavigationStack {
                    iphoneMainContent
                }
            }
        }
        .task {
            await orderManager.fetchActiveOrders()
            if showAllOrders {
                await orderManager.fetchAllOrders()
            }
        }
        .alert("Print Status", isPresented: $showingPrintAlert) {
            Button("OK") { }
        } message: {
            Text(printMessage)
        }
        .sheet(isPresented: $showingCheckout) {
            if let order = selectedOrder {
                CheckoutView(
                    order: order,
                    orderManager: orderManager,
                    printerManager: printerManager,
                    onComplete: {
                        showingCheckout = false
                        selectedOrder = nil
                    }
                )
            }
        }
    }
    
    // MARK: - iPad Sidebar
    private var orderSidebar: some View {
        VStack(spacing: 0) {
            // Header with toggle
            VStack(spacing: 16) {
                HStack {
                    Text("Orders")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    Spacer()
                    
                    Menu {
                        Button("Refresh Orders") {
                            Task {
                                await orderManager.fetchActiveOrders()
                                if showAllOrders {
                                    await orderManager.fetchAllOrders()
                                }
                            }
                        }
                        
                        Divider()
                        
                        Button("Sign Out") {
                            Task {
                                try? await supabaseManager.signOut()
                            }
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                            .font(.title2)
                    }
                }
                
                // Order Type Toggle
                Picker("Order Type", selection: $showAllOrders) {
                    Text("Active Orders").tag(false)
                    Text("All Orders").tag(true)
                }
                .pickerStyle(.segmented)
                .onChange(of: showAllOrders) { newValue in
                    Task {
                        if newValue {
                            await orderManager.fetchAllOrders()
                        }
                    }
                }
                
                // Filter Pills
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(OrderFilter.allCases, id: \.self) { filter in
                            FilterChip(
                                title: filter.displayName,
                                count: countForFilter(filter),
                                isSelected: selectedFilter == filter,
                                color: filter.color
                            ) {
                                selectedFilter = filter
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            
            // Orders List
            if orderManager.isLoading {
                Spacer()
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("Loading orders...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                Spacer()
            } else if filteredOrders.isEmpty {
                Spacer()
                EmptyOrdersView(filter: selectedFilter)
                Spacer()
            } else {
                List(filteredOrders, selection: $selectedOrder) { order in
                    SidebarOrderRowView(
                        order: order,
                        isNew: orderManager.newOrderIds.contains(order.id),
                        isSelected: selectedOrder?.id == order.id
                    )
                    .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                    .onTapGesture {
                        selectedOrder = order
                    }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
                .refreshable {
                    await orderManager.fetchActiveOrders()
                    if showAllOrders {
                        await orderManager.fetchAllOrders()
                    }
                }
                .onChange(of: selectedOrder) { newOrder in
                    print("Selected order changed to: \(newOrder?.id ?? "nil")")
                }
            }
            
            // Error Message
            if let errorMessage = orderManager.errorMessage {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Button("Retry") {
                        Task {
                            await orderManager.fetchActiveOrders()
                        }
                    }
                    .font(.caption)
                    .foregroundColor(.blue)
                }
                .padding()
                .background(Color(.systemGray6))
            }
        }
        .navigationTitle("Orders")
        .navigationBarHidden(true)
    }
    
    // MARK: - iPad Detail View
    private var orderDetailView: some View {
        Group {
            if let order = selectedOrder {
                OrderDetailView(
                    order: order,
                    orderManager: orderManager,
                    printerManager: printerManager,
                    onCheckout: {
                        showingCheckout = true
                    },
                    onPrintResult: { message in
                        printMessage = message
                        showingPrintAlert = true
                    }
                )
            } else {
                VStack(spacing: 20) {
                    Image(systemName: "list.bullet.rectangle")
                        .font(.system(size: 60))
                        .foregroundColor(.gray.opacity(0.6))
                    
                    Text("Select an Order")
                        .font(.title2)
                        .fontWeight(.semibold)
                        .foregroundColor(.primary)
                    
                    Text("Choose an order from the sidebar to view details")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(Color(.systemGroupedBackground))
            }
        }
    }
    
    // MARK: - iPhone Content
    private var iphoneMainContent: some View {
        VStack(spacing: 0) {
            // Filter Bar
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(OrderFilter.allCases, id: \.self) { filter in
                        FilterChip(
                            title: filter.displayName,
                            count: countForFilter(filter),
                            isSelected: selectedFilter == filter,
                            color: filter.color
                        ) {
                            selectedFilter = filter
                        }
                    }
                }
                .padding(.horizontal)
            }
            .padding(.vertical, 8)
            .background(Color(.systemGray6))
            
            // Content
            if orderManager.isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("Loading orders...")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredOrders.isEmpty {
                EmptyOrdersView(filter: selectedFilter)
            } else {
                List {
                    ForEach(groupedOrders.keys.sorted(), id: \.self) { key in
                        Section(header: Text(key)) {
                            ForEach(groupedOrders[key] ?? []) { order in
                                NavigationLink(destination: OrderDetailView(
                                    order: order,
                                    orderManager: orderManager,
                                    printerManager: printerManager,
                                    onCheckout: {
                                        selectedOrder = order
                                        showingCheckout = true
                                    },
                                    onPrintResult: { message in
                                        printMessage = message
                                        showingPrintAlert = true
                                    }
                                )) {
                                    OrderRowView(
                                        order: order,
                                        isNew: orderManager.newOrderIds.contains(order.id),
                                        orderManager: orderManager,
                                        printerManager: printerManager,
                                        onPrintResult: { message in
                                            printMessage = message
                                            showingPrintAlert = true
                                        }
                                    )
                                }
                                .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                                .listRowSeparator(.hidden)
                                .listRowBackground(Color.clear)
                            }
                        }
                    }
                }
                .listStyle(PlainListStyle())
                .scrollContentBackground(.hidden)
                .refreshable {
                    await orderManager.fetchActiveOrders()
                }
            }
            
            // Error Message
            if let errorMessage = orderManager.errorMessage {
                HStack {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundColor(.orange)
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    Spacer()
                    Button("Retry") {
                        Task {
                            await orderManager.fetchActiveOrders()
                        }
                    }
                    .font(.caption)
                    .foregroundColor(.blue)
                }
                .padding()
                .background(Color(.systemGray6))
            }
        }
        .navigationTitle("Orders")
        .navigationBarTitleDisplayMode(.large)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button("Refresh Orders") {
                        Task {
                            await orderManager.fetchActiveOrders()
                        }
                    }
                    
                    Divider()
                    
                    Button("Sign Out") {
                        Task {
                            try? await supabaseManager.signOut()
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
    }
    
    private var groupedOrders: [String: [Order]] {
        Dictionary(grouping: filteredOrders, by: { $0.table?.name ?? "Table \($0.table_id)" })
    }
    
    private func countForFilter(_ filter: OrderFilter) -> Int {
        let baseOrders = showAllOrders ? orderManager.allOrders : orderManager.orders
        
        switch filter {
        case .active:
            return baseOrders.filter { $0.status != .completed }.count
        case .all:
            return baseOrders.count
        case .new:
            return baseOrders.filter { $0.status == .new }.count
        case .preparing:
            return baseOrders.filter { $0.status == .preparing }.count
        case .ready:
            return baseOrders.filter { $0.status == .ready }.count
        case .completed:
            return baseOrders.filter { $0.status == .completed }.count
        }
    }
}

// MARK: - Supporting Views

struct SidebarOrderRowView: View {
    let order: Order
    let isNew: Bool
    let isSelected: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(order.table?.name ?? "Table \(order.table_id)")
                            .font(.headline)
                            .fontWeight(.bold)
                        
                        if isNew {
                            Text("NEW")
                                .font(.caption2)
                                .fontWeight(.bold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.red)
                                .cornerRadius(4)
                        }
                        
                        if order.order_items?.contains(where: { $0.status.rawValue == "new" }) == true {
                            Image(systemName: "circle.fill")
                                .font(.caption2)
                                .foregroundColor(.red)
                        }
                        
                        Spacer()
                    }
                    
                    HStack(spacing: 12) {
                        Label("\(order.guest_count)", systemImage: "person.2")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        
                        Label(formatTime(order.created_at), systemImage: "clock")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
                
                VStack(alignment: .trailing, spacing: 4) {
                    EnhancedStatusBadge(status: order.status)
                    
                    if let total = order.total_amount {
                        Text("¥\(String(format: "%.0f", total))")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundColor(.primary)
                    }
                }
            }
            
            // Order items preview
            if let items = order.order_items?.prefix(3) {
                VStack(alignment: .leading, spacing: 2) {
                    ForEach(Array(items), id: \.id) { item in
                        Text("\(item.quantity)× \(item.menu_item?.displayName ?? "Unknown")")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                    }
                    
                    if let totalItems = order.order_items?.count, totalItems > 3 {
                        Text("and \(totalItems - 3) more...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .italic()
                    }
                }
            }
        }
        .padding(.vertical, 8)
        .padding(.horizontal, 12)
        .background(isSelected ? Color.blue.opacity(0.1) : Color(.systemBackground))
        .cornerRadius(12)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isSelected ? Color.blue : Color.clear, lineWidth: 2)
        )
        .shadow(color: Color.black.opacity(0.05), radius: 2, x: 0, y: 1)
    }
    
    private func formatTime(_ dateString: String) -> String {
        let formatter = ISO8601DateFormatter()
        guard let date = formatter.date(from: dateString) else { return "Unknown" }
        
        let displayFormatter = DateFormatter()
        displayFormatter.timeStyle = .short
        return displayFormatter.string(from: date)
    }
}

// Keep existing FilterChip, EmptyOrdersView, OrderRowView, EnhancedStatusBadge, StatusActionButton, PrintButton, EnhancedOrderItemView, and StatusBadge views

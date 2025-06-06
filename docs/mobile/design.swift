import SwiftUI
import Combine
import CoreBluetooth // For PrinterManager

// MARK: - ------------------ App Entry Point ------------------

// This would be your main App struct.
// @main
struct ShopCopilotApp: App {
    @StateObject private var authManager = AuthManager()

    var body: some Scene {
        WindowGroup {
            // This is the root view. It decides whether to show the Login screen
            // or the main app content based on the authentication state.
            ContentView()
                .environmentObject(authManager)
                .onAppear {
                    // When the app starts, check for an existing session.
                    authManager.checkSession()
                }
        }
    }
}

// MARK: - ------------------ Mock Data & Services ------------------
// In a real app, these would be in separate files.

// --- Feature Flags ---
// This struct controls which features are enabled in the app.
// In a production environment, this could be populated from a build configuration,
// a remote config service, or Info.plist.
struct FeatureFlags {
    static let enableTableBooking = true
    static let enableLowStockAlerts = true
}

// --- Localization Helper ---
// A simple helper to make using NSLocalizedString more concise.
func Localized(_ key: String) -> String {
    return NSLocalizedString(key, comment: "")
}

// --- Color Extension for Branding ---
// Fetches the restaurant's brand color. For this prototype, it's a static color.
// In a real app, you would fetch this from Supabase and store it.
extension Color {
    static var brand: Color {
        // In a real app, this hex would be fetched and stored from Supabase.
        // For the prototype, we'll use a vibrant blue.
        Color(hex: "#4A90E2")
    }
    
    // Helper to initialize Color from a hex string.
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// --- Models ---
// These structs represent the data structures used throughout the app.
struct Order: Identifiable, Equatable {
    let id: String
    var tableId: String
    let totalAmount: Double
    var status: String // "new", "preparing", "ready", "completed"
    let createdAt: Date
    let items: [OrderItem]
    
    var tableName: String { Localized("table_prefix") + " " + tableId }
}

struct OrderItem: Identifiable, Equatable {
    let id: String
    let menuItemId: String
    let menuItemName: String
    let quantity: Int
    let notes: String?
}

struct Booking: Identifiable, Equatable {
    let id: String
    let customerName: String
    let customerContact: String
    let bookingDate: Date
    let bookingTime: String
    let partySize: Int
    let preorderItems: [OrderItem]
    var status: String // "pending", "confirmed", "canceled"
}

struct GroupedItem: Identifiable, Equatable {
    let id = UUID()
    let itemId: String
    let itemName: String
    var quantity: Int
    var tables: Set<String>
}

struct InventoryItem: Identifiable {
    let id = UUID()
    let itemName: String
    var stockLevel: Int
    let threshold: Int
}

// --- Mock Services ---
// These `ObservableObject`s simulate fetching data from Supabase and handling
// Realtime updates.

@MainActor
class OrderService: ObservableObject {
    @Published var activeOrders: [Order] = []

    init() {
        // Simulate fetching initial data
        fetchOrders()
    }

    func fetchOrders() {
        // Mock data representing active orders from Supabase.
        self.activeOrders = [
            Order(id: "O1001", tableId: "3", totalAmount: 3200, status: "new", createdAt: Date().addingTimeInterval(-60), items: [
                OrderItem(id: "OI1", menuItemId: "R01", menuItemName: Localized("menu_ramen"), quantity: 2, notes: Localized("note_extra_noodles")),
                OrderItem(id: "OI2", menuItemId: "G01", menuItemName: Localized("menu_gyoza"), quantity: 1, notes: nil)
            ]),
            Order(id: "O1002", tableId: "5", totalAmount: 1800, status: "preparing", createdAt: Date().addingTimeInterval(-300), items: [
                OrderItem(id: "OI3", menuItemId: "R02", menuItemName: Localized("menu_miso_ramen"), quantity: 1, notes: nil),
                OrderItem(id: "OI4", menuItemId: "D01", menuItemName: Localized("menu_coke"), quantity: 1, notes: nil)
            ]),
            Order(id: "O1003", tableId: "1", totalAmount: 950, status: "ready", createdAt: Date().addingTimeInterval(-600), items: [
                 OrderItem(id: "OI5", menuItemId: "R01", menuItemName: Localized("menu_ramen"), quantity: 1, notes: nil)
            ])
        ]
    }

    func updateOrderStatus(orderId: String, newStatus: String) {
        guard let index = activeOrders.firstIndex(where: { $0.id == orderId }) else { return }
        
        // In a real app, this would be an async call to Supabase.
        // The UI would then update via the Realtime subscription.
        // Here, we just update the local mock data directly.
        activeOrders[index].status = newStatus
        
        // If the order is completed, remove it from the active list.
        if newStatus == "completed" {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                self.activeOrders.remove(at: index)
            }
        }
    }
}

@MainActor
class BookingService: ObservableObject {
    @Published var bookings: [Booking] = []

    init() {
        if FeatureFlags.enableTableBooking {
            fetchBookings()
        }
    }
    
    func fetchBookings() {
        self.bookings = [
            Booking(id: "B001", customerName: "Tanaka Yuki", customerContact: "080-1234-5678", bookingDate: Date(), bookingTime: "19:00", partySize: 4, preorderItems: [OrderItem(id: "OI10", menuItemId: "C01", menuItemName: Localized("menu_chefs_course"), quantity: 4, notes: Localized("note_one_vegetarian"))], status: "pending"),
            Booking(id: "B002", customerName: "John Smith", customerContact: "john.s@example.com", bookingDate: Date().addingTimeInterval(86400), bookingTime: "20:30", partySize: 2, preorderItems: [], status: "confirmed"),
            Booking(id: "B003", customerName: "Nguyen Anh", customerContact: "anh.n@example.com", bookingDate: Date().addingTimeInterval(86400 * 2), bookingTime: "18:00", partySize: 6, preorderItems: [], status: "canceled")
        ]
    }

    func updateBookingStatus(bookingId: String, newStatus: String) {
        guard let index = bookings.firstIndex(where: { $0.id == bookingId }) else { return }
        bookings[index].status = newStatus
    }
}

// MARK: - ------------------ Authentication ------------------

// This view model handles the logic for logging in and out.
@MainActor
class AuthManager: ObservableObject {
    @AppStorage("jwt_token") private var jwtToken: String?
    @AppStorage("restaurant_id") private var restaurantId: String?
    @AppStorage("user_role") private var userRole: String?

    @Published var isAuthenticated: Bool = false
    @Published var errorMessage: String?
    @Published var isLoading: Bool = false

    func checkSession() {
        // At launch, check if a valid JWT token exists.
        if let token = jwtToken, !token.isEmpty {
            // In a real app, you'd validate the token's expiry here.
            self.isAuthenticated = true
        }
    }

    func signIn(email: String, password: String, subdomain: String) {
        isLoading = true
        errorMessage = nil
        
        // Simulate a network call to Supabase
        Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds delay
            
            // --- Mock Supabase Logic ---
            if email.lowercased() == "staff@example.com" && password == "password123" {
                // On success, "decode" the JWT and store details.
                self.jwtToken = "mock.jwt.token"
                self.restaurantId = "resto_123"
                self.userRole = "staff"
                self.isAuthenticated = true
            } else {
                // On failure, set an error message.
                self.errorMessage = Localized("error_invalid_credentials")
            }
            self.isLoading = false
        }
    }

    func signOut() {
        // Clear all stored session data.
        jwtToken = nil
        restaurantId = nil
        userRole = nil
        isAuthenticated = false
    }
}

// --- Login View ---
struct LoginView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var email = ""
    @State private var password = ""
    @State private var subdomain = ""

    private var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty && !subdomain.isEmpty && isValidEmail(email)
    }

    var body: some View {
        VStack(spacing: 20) {
            Spacer()
            
            // App Title
            Text("Shop-Copilot")
                .font(.system(size: 40, weight: .bold, design: .rounded))
                .foregroundColor(.brand)
            
            Text(Localized("login_subtitle"))
                .font(.headline)
                .foregroundColor(.secondary)
                .padding(.bottom, 40)
            
            // Input Fields
            VStack(spacing: 16) {
                TextField(Localized("placeholder_email"), text: $email)
                    .keyboardType(.emailAddress)
                    .autocapitalization(.none)
                    .textContentType(.emailAddress)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
                
                SecureField(Localized("placeholder_password"), text: $password)
                    .textContentType(.password)
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)

                TextField(Localized("placeholder_subdomain"), text: $subdomain)
                    .autocapitalization(.none)
                    .onChange(of: subdomain) { newValue in
                        subdomain = newValue.lowercased()
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .cornerRadius(12)
            }
            
            // Sign In Button
            Button(action: {
                authManager.signIn(email: email, password: password, subdomain: subdomain)
            }) {
                HStack {
                    if authManager.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text(Localized("button_sign_in"))
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
            }
            .buttonStyle(.borderedProminent)
            .tint(.brand)
            .cornerRadius(12)
            .disabled(!isFormValid || authManager.isLoading)
            .accessibilityLabel(Localized("button_sign_in"))
            
            Spacer()
            Spacer()
        }
        .padding(32)
        .background(Color(.systemBackground).ignoresSafeArea())
        .alert(isPresented: .constant(authManager.errorMessage != nil), content: {
            Alert(
                title: Text(Localized("alert_login_failed_title")),
                message: Text(authManager.errorMessage ?? ""),
                dismissButton: .default(Text("OK"), action: {
                    authManager.errorMessage = nil
                })
            )
        })
    }
    
    // Simple email validation utility
    private func isValidEmail(_ email: String) -> Bool {
        let emailRegEx = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPred = NSPredicate(format:"SELF MATCHES %@", emailRegEx)
        return emailPred.evaluate(with: email)
    }
}


// MARK: - ------------------ Main App Structure ------------------

struct ContentView: View {
    @EnvironmentObject private var authManager: AuthManager

    var body: some View {
        if authManager.isAuthenticated {
            MainTabView()
        } else {
            LoginView()
        }
    }
}

struct MainTabView: View {
    @StateObject private var orderService = OrderService()
    @StateObject private var bookingService = BookingService()
    @StateObject private var printerManager = PrinterManager()
    
    var body: some View {
        TabView {
            // --- Tab 1: Orders ---
            NavigationStack {
                OrderListView()
            }
            .tabItem {
                Label(Localized("tab_orders"), systemImage: "list.bullet.rectangle.portrait")
            }
            .environmentObject(orderService)
            .environmentObject(printerManager)

            // --- Tab 2: Kitchen Board ---
            NavigationStack {
                KitchenBoardView()
            }
            .tabItem {
                Label(Localized("tab_kitchen"), systemImage: "flame")
            }
            .environmentObject(orderService)
            .environmentObject(printerManager)

            // --- Tab 3: Bookings (Conditional) ---
            if FeatureFlags.enableTableBooking {
                NavigationStack {
                    BookingListView()
                }
                .tabItem {
                    Label(Localized("tab_bookings"), systemImage: "calendar.badge.clock")
                }
                .environmentObject(bookingService)
            }
            
            // --- Tab 4: Printer Setup ---
            NavigationStack {
                PrinterSetupView()
            }
            .tabItem {
                Label(Localized("tab_printer"), systemImage: "printer")
            }
            .environmentObject(printerManager)


            // --- Tab 5: Inventory (Conditional) ---
            if FeatureFlags.enableLowStockAlerts {
                NavigationStack {
                    InventoryAlertView()
                }
                .tabItem {
                    Label(Localized("tab_inventory"), systemImage: "exclamationmark.bubble")
                }
            }
            
             // --- Placeholder Tab for a disabled feature ---
            NavigationStack {
                VStack {
                    Image(systemName: "wand.and.stars")
                        .font(.system(size: 60))
                        .foregroundColor(.gray.opacity(0.5))
                        .padding()
                    Text("AI Features Coming Soon!")
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                }
                .navigationTitle("AI Copilot")
            }
            .tabItem {
                Label("AI Copilot", systemImage: "wand.and.stars")
            }
        }
    }
}

// MARK: - ------------------ 1. Orders Tab ------------------

// --- Order List View ---
struct OrderListView: View {
    @EnvironmentObject private var orderService: OrderService

    var body: some View {
        List(orderService.activeOrders) { order in
            NavigationLink(destination: OrderDetailView(order: order)) {
                OrderRowView(order: order)
            }
        }
        .navigationTitle(Localized("title_active_orders"))
        .listStyle(.plain)
        .refreshable {
            // In a real app, this would trigger a manual re-fetch from Supabase.
            // Here, we just re-initialize the mock data.
            orderService.fetchOrders()
        }
    }
}

// --- Order Row View (for the list) ---
struct OrderRowView: View {
    let order: Order
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 6) {
                Text(order.tableName)
                    .font(.headline)
                    .fontWeight(.bold)
                
                Text(Localized("label_item_count_\(order.items.count)"))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 6) {
                Text(order.createdAt, style: .time)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                StatusBadge(status: order.status)
            }
        }
        .padding(.vertical, 8)
    }
}

// --- Order Detail View ---
struct OrderDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var orderService: OrderService
    @EnvironmentObject private var printerManager: PrinterManager
    @State var order: Order

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            List {
                // Order Items Section
                Section(header: Text(Localized("header_items"))) {
                    ForEach(order.items) { item in
                        ItemRow(item: item)
                    }
                }
                
                // Total Amount Section
                Section {
                    HStack {
                        Text(Localized("label_total"))
                            .fontWeight(.bold)
                        Spacer()
                        Text(order.totalAmount, format: .currency(code: "JPY"))
                            .fontWeight(.bold)
                    }
                }
            }
            .listStyle(.insetGrouped)
            
            // Action Button at the bottom
            actionButton
                .padding()
        }
        .navigationTitle(order.tableName)
        .navigationBarTitleDisplayMode(.inline)
    }
    
    @ViewBuilder
    private var actionButton: some View {
        // This view builder provides the correct button based on the order status.
        switch order.status {
        case "new":
            PrimaryButton(title: Localized("button_mark_preparing"), action: {
                orderService.updateOrderStatus(orderId: order.id, newStatus: "preparing")
                // Reflect change locally immediately for better UX
                order.status = "preparing"
            })
            .accessibilityLabel(Localized("button_mark_preparing_ax"))
        case "preparing":
            PrimaryButton(title: Localized("button_mark_ready"), action: {
                orderService.updateOrderStatus(orderId: order.id, newStatus: "ready")
                order.status = "ready"
            })
            .accessibilityLabel(Localized("button_mark_ready_ax"))
        case "ready":
            PrimaryButton(title: Localized("button_complete_and_print"), systemImage: "printer.fill", action: {
                // 1. Update status
                orderService.updateOrderStatus(orderId: order.id, newStatus: "completed")
                // 2. Trigger print job
                printerManager.printReceipt(order: order)
                // 3. Pop view
                dismiss()
            })
            .accessibilityLabel(Localized("button_complete_and_print_ax"))
        default:
            EmptyView()
        }
    }
    
    // --- Subview for a single item in the order ---
    struct ItemRow: View {
        let item: OrderItem
        var body: some View {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(item.menuItemName)
                    Spacer()
                    Text("×\(item.quantity)")
                }
                .font(.body)
                
                if let notes = item.notes, !notes.isEmpty {
                    Text(notes)
                        .font(.footnote)
                        .foregroundColor(.secondary)
                }
            }
            .padding(.vertical, 4)
        }
    }
}


// MARK: - ------------------ 2. Kitchen Board Tab ------------------

@MainActor
class KitchenBoardViewModel: ObservableObject {
    @Published var groupedItems: [GroupedItem] = []
    
    func computeGrouping(from orders: [Order]) {
        // BEHAVIOR NOTE: This logic runs when the view appears.
        // It filters for recent orders ("new" or "preparing" in the last 10 minutes)
        // and groups them by menu item.
        let tenMinutesAgo = Date().addingTimeInterval(-600)
        let recentOrders = orders.filter {
            ($0.status == "new" || $0.status == "preparing") && $0.createdAt >= tenMinutesAgo
        }

        var tempGrouping: [String: GroupedItem] = [:]

        for order in recentOrders {
            for item in order.items {
                if var existingGroup = tempGrouping[item.menuItemId] {
                    existingGroup.quantity += item.quantity
                    existingGroup.tables.insert(order.tableId)
                    tempGrouping[item.menuItemId] = existingGroup
                } else {
                    let newGroup = GroupedItem(
                        itemId: item.menuItemId,
                        itemName: item.menuItemName,
                        quantity: item.quantity,
                        tables: [order.tableId]
                    )
                    tempGrouping[item.menuItemId] = newGroup
                }
            }
        }
        self.groupedItems = Array(tempGrouping.values).sorted(by: { $0.itemName < $1.itemName })
    }
}

struct KitchenBoardView: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @EnvironmentObject private var orderService: OrderService
    @EnvironmentObject private var printerManager: PrinterManager
    @StateObject private var viewModel = KitchenBoardViewModel()

    // Define grid layout. On iPad (regular size class), we use more columns.
    private var columns: [GridItem] {
        let isIPad = horizontalSizeClass == .regular
        let columnSpec = GridItem(.adaptive(minimum: isIPad ? 240 : 160), spacing: 16)
        return [columnSpec]
    }

    var body: some View {
        ScrollView {
            if viewModel.groupedItems.isEmpty {
                placeholderView
            } else {
                LazyVGrid(columns: columns, spacing: 16) {
                    ForEach(viewModel.groupedItems) { group in
                        KitchenItemCard(group: group, onDone: {
                            // BEHAVIOR NOTE: When "Mark Done" is tapped,
                            // a summary slip is printed and the view re-computes.
                            printerManager.printGroupedSummary(group: group)
                            viewModel.computeGrouping(from: orderService.activeOrders)
                        })
                    }
                }
                .padding()
            }
        }
        .navigationTitle(Localized("title_kitchen_board"))
        .onAppear {
            viewModel.computeGrouping(from: orderService.activeOrders)
        }
        .onChange(of: orderService.activeOrders) { newOrders in
            // Re-compute when orders change in real-time.
            viewModel.computeGrouping(from: newOrders)
        }
    }
    
    private var placeholderView: some View {
        VStack {
            Spacer()
            Image(systemName: "fork.knife.circle")
                .font(.system(size: 60))
                .foregroundColor(.gray.opacity(0.4))
            Text(Localized("placeholder_no_items_to_prepare"))
                .font(.title2)
                .fontWeight(.medium)
                .foregroundColor(.secondary)
                .padding(.top)
            Spacer()
        }
        .frame(minHeight: 500)
    }
}

struct KitchenItemCard: View {
    let group: GroupedItem
    let onDone: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Dish Name
            Text(group.itemName)
                .font(.title2)
                .fontWeight(.bold)
                .lineLimit(2)
                .minimumScaleFactor(0.8)

            // Quantity
            Text("\(Localized("label_qty")): \(group.quantity)")
                .font(.headline)
                .fontWeight(.semibold)

            // Tables
            Text("\(Localized("label_tables")): \(group.tables.sorted().joined(separator: ", "))")
                .font(.subheadline)
                .foregroundColor(.secondary)
            
            Spacer()

            // "Mark Done" Button
            Button(action: onDone) {
                Text(Localized("button_mark_done"))
                    .fontWeight(.bold)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .tint(.brand)
            .cornerRadius(20)
            .accessibilityLabel("\(Localized("button_mark_done_ax")) \(group.itemName)")
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}


// MARK: - ------------------ 3. Bookings Tab ------------------

struct BookingListView: View {
    @EnvironmentObject private var bookingService: BookingService
    
    var body: some View {
        List(bookingService.bookings) { booking in
            NavigationLink(destination: BookingDetailView(booking: booking)) {
                BookingRowView(booking: booking)
            }
        }
        .navigationTitle(Localized("title_bookings"))
        .listStyle(.plain)
    }
}

struct BookingRowView: View {
    let booking: Booking
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 6) {
                Text(booking.customerName)
                    .font(.headline)
                    .fontWeight(.bold)
                Text("\(booking.bookingDate, style: .date), \(booking.bookingTime)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 6) {
                Text(Localized("label_party_size_\(booking.partySize)"))
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                StatusBadge(status: booking.status)
            }
        }
        .padding(.vertical, 8)
    }
}

struct BookingDetailView: View {
    @EnvironmentObject private var bookingService: BookingService
    @State var booking: Booking

    var body: some View {
        List {
            // Customer Info Section
            Section(header: Text(Localized("header_customer_info"))) {
                InfoRow(label: Localized("label_name"), value: booking.customerName)
                InfoRow(label: Localized("label_contact"), value: booking.customerContact, isLink: true)
            }
            
            // Booking Details Section
            Section(header: Text(Localized("header_booking_details"))) {
                InfoRow(label: Localized("label_date"), value: "\(booking.bookingDate, style: .long), \(booking.bookingTime)")
                InfoRow(label: Localized("label_party_size_detail"), value: "\(booking.partySize)")
            }
            
            // Pre-order Section (if applicable)
            if !booking.preorderItems.isEmpty {
                Section(header: Text(Localized("header_preorder"))) {
                    ForEach(booking.preorderItems) { item in
                        OrderDetailView.ItemRow(item: item)
                    }
                }
            }

            // Action Buttons Section
            Section {
                actionButtons
            }
        }
        .listStyle(.insetGrouped)
        .navigationTitle(Localized("title_booking_detail"))
        .navigationBarTitleDisplayMode(.inline)
    }
    
    @ViewBuilder
    private var actionButtons: some View {
        // BEHAVIOR NOTE: Buttons change based on the booking's status.
        // Tapping a button calls the service to update the status in Supabase.
        switch booking.status {
        case "pending":
            HStack(spacing: 16) {
                Button(Localized("button_confirm")) {
                    bookingService.updateBookingStatus(bookingId: booking.id, newStatus: "confirmed")
                    booking.status = "confirmed" // Update local state
                }
                .buttonStyle(.borderedProminent)
                .tint(.green)
                .frame(maxWidth: .infinity)
                .accessibilityLabel(Localized("button_confirm_booking_ax"))
                
                Button(Localized("button_cancel")) {
                    bookingService.updateBookingStatus(bookingId: booking.id, newStatus: "canceled")
                    booking.status = "canceled"
                }
                .buttonStyle(.borderedProminent)
                .tint(.red)
                .frame(maxWidth: .infinity)
                .accessibilityLabel(Localized("button_cancel_booking_ax"))
            }
            .listRowBackground(Color.clear)
            
        case "confirmed":
            Button(Localized("button_cancel_booking")) {
                 bookingService.updateBookingStatus(bookingId: booking.id, newStatus: "canceled")
                 booking.status = "canceled"
            }
            .buttonStyle(.borderedProminent)
            .tint(.red)
            .frame(maxWidth: .infinity)
            .accessibilityLabel(Localized("button_cancel_booking_ax"))
            
        default:
            EmptyView()
        }
    }
    
    struct InfoRow: View {
        let label: String
        let value: String
        var isLink: Bool = false
        
        var body: some View {
            HStack {
                Text(label)
                Spacer()
                Text(value)
                    .foregroundColor(isLink ? .accentColor : .secondary)
                    .multilineTextAlignment(.trailing)
            }
        }
    }
}


// MARK: - ------------------ 4. Printer Setup Tab ------------------

// This is a mock implementation of CoreBluetooth logic.
@MainActor
class PrinterManager: ObservableObject, CBCentralManagerDelegate, CBPeripheralDelegate {
    @Published var isScanning = false
    @Published var discoveredPeripherals: [CBPeripheral] = []
    @Published var connectedPrinter: CBPeripheral?
    @Published var connectionStatusMessage = ""
    @Published var bluetoothAlertMessage: String?

    private var centralManager: CBCentralManager!
    // In a real app, this would be the specific characteristic for printing.
    private var writeCharacteristic: CBCharacteristic?

    init() {
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        // BEHAVIOR NOTE: Handles Bluetooth state changes.
        if central.state != .poweredOn {
            bluetoothAlertMessage = Localized("alert_bluetooth_off")
            isScanning = false
            connectedPrinter = nil
        } else {
            bluetoothAlertMessage = nil
        }
    }

    func startScan() {
        guard centralManager.state == .poweredOn else {
            bluetoothAlertMessage = Localized("alert_bluetooth_off")
            return
        }
        isScanning = true
        discoveredPeripherals.removeAll()
        // Replace with actual ESC/POS service UUID
        // centralManager.scanForPeripherals(withServices: [CBUUID(string: "E7810A71-73AE-499D-8C15-FAA9AEF0C3F2")], options: nil)
        
        // Mock discovery
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            self.discoveredPeripherals = [MockPeripheral(name: "TSP100-LAN"), MockPeripheral(name: "mPOP")]
            self.isScanning = false
        }
    }

    func stopScan() {
        centralManager.stopScan()
        isScanning = false
    }

    func connect(to peripheral: CBPeripheral) {
        connectionStatusMessage = "\(Localized("status_connecting_to")) \(peripheral.name ?? "...")"
        // centralManager.connect(peripheral, options: nil)
        
        // Mock connection
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            self.connectedPrinter = peripheral
            self.connectionStatusMessage = "\(Localized("status_connected_to")) \(peripheral.name ?? "...")"
        }
    }
    
    // --- Printing methods ---
    func printReceipt(order: Order) {
        guard connectedPrinter != nil else {
            connectionStatusMessage = Localized("error_no_printer_connected")
            print("ERROR: No printer connected.")
            return
        }
        print("--- PRINTING RECEIPT for \(order.id) ---")
        // Build ESC/POS data and write to `writeCharacteristic`
        // In this mock, we just log to the console.
        connectionStatusMessage = Localized("status_test_print_sent")
    }
    
    func printGroupedSummary(group: GroupedItem) {
        guard connectedPrinter != nil else {
            connectionStatusMessage = Localized("error_no_printer_connected")
            print("ERROR: No printer connected.")
            return
        }
        print("--- PRINTING GROUPED SUMMARY for \(group.itemName) ---")
        connectionStatusMessage = "\(Localized("status_printed_summary_for")) \(group.itemName)"
    }
    
    private class MockPeripheral: CBPeripheral {
        private var _name: String?
        override var name: String? { return _name }
        init(name: String) { self._name = name }
        override var identifier: UUID { return UUID() }
    }
}

struct PrinterSetupView: View {
    @EnvironmentObject private var printerManager: PrinterManager
    
    var body: some View {
        Form {
            // Connection Status Section
            Section {
                if let connectedPrinter = printerManager.connectedPrinter {
                    HStack {
                        Image(systemName: "printer.fill")
                            .foregroundColor(.green)
                        Text("\(Localized("status_connected_to")) \(connectedPrinter.name ?? "...")")
                    }
                } else {
                    HStack {
                        Image(systemName: "printer.dot.fill")
                            .foregroundColor(.red)
                        Text(Localized("status_not_connected"))
                    }
                }
                
                if !printerManager.connectionStatusMessage.isEmpty {
                    Text(printerManager.connectionStatusMessage).font(.caption).foregroundColor(.secondary)
                }
            }
            
            // Actions Section
            Section {
                // Scan Button
                Button(action: {
                    printerManager.isScanning ? printerManager.stopScan() : printerManager.startScan()
                }) {
                    HStack {
                        if printerManager.isScanning {
                            ProgressView().padding(.trailing, 4)
                            Text(Localized("button_scanning"))
                        } else {
                            Text(Localized("button_scan_for_printers"))
                        }
                    }
                }
                .tint(.accentColor)
                
                // Test Print Button
                Button(Localized("button_test_print")) {
                    let dummyOrder = Order(id: "DUMMY-01", tableId: "99", totalAmount: 1234, status: "completed", createdAt: Date(), items: [OrderItem(id: "di1", menuItemId: "test", menuItemName: Localized("item_test"), quantity: 1, notes: nil)])
                    printerManager.printReceipt(order: dummyOrder)
                }
                .disabled(printerManager.connectedPrinter == nil)
                .accessibilityLabel(Localized("button_test_print_ax"))
            }

            // Discovered Printers Section
            if !printerManager.discoveredPeripherals.isEmpty {
                Section(header: Text(Localized("header_discovered_printers"))) {
                    ForEach(printerManager.discoveredPeripherals, id: \.identifier) { peripheral in
                        HStack {
                            Text(peripheral.name ?? Localized("label_unnamed_printer"))
                            Spacer()
                            Button(Localized("button_connect")) {
                                printerManager.connect(to: peripheral)
                            }
                            .buttonStyle(.bordered)
                            .tint(.brand)
                        }
                    }
                }
            }
        }
        .navigationTitle(Localized("title_printer_setup"))
        .alert(isPresented: .constant(printerManager.bluetoothAlertMessage != nil), content: {
            Alert(title: Text(Localized("alert_bluetooth_error_title")),
                  message: Text(printerManager.bluetoothAlertMessage ?? ""),
                  dismissButton: .default(Text("OK"), action: { printerManager.bluetoothAlertMessage = nil }))
        })
    }
}


// MARK: - ------------------ 5. Inventory Tab ------------------

@MainActor
class InventoryViewModel: ObservableObject {
    @Published var lowStockItems: [InventoryItem] = []
    @Published var recentAlert: InventoryItem?

    init() {
        // In a real app, this would set up a Supabase Realtime subscription.
        // For the prototype, we'll just mock it.
        self.lowStockItems = [
            InventoryItem(itemName: Localized("menu_ramen_noodles"), stockLevel: 8, threshold: 10),
            InventoryItem(itemName: Localized("item_pork_chashu"), stockLevel: 4, threshold: 5)
        ]
        
        // Simulate a new low stock alert notification
        DispatchQueue.main.asyncAfter(deadline: .now() + 5) {
            let newItem = InventoryItem(itemName: Localized("item_nori_seaweed"), stockLevel: 20, threshold: 20)
            self.lowStockItems.insert(newItem, at: 0)
            self.recentAlert = newItem
        }
    }
}

struct InventoryAlertView: View {
    @StateObject private var viewModel = InventoryViewModel()
    
    var body: some View {
        VStack {
            if let alertItem = viewModel.recentAlert {
                LowStockBanner(item: alertItem)
                    .onTapGesture { viewModel.recentAlert = nil }
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
            
            if viewModel.lowStockItems.isEmpty {
                Text(Localized("placeholder_all_items_stocked"))
                    .foregroundColor(.secondary)
                    .padding(.top, 50)
            } else {
                List(viewModel.lowStockItems) { item in
                    InventoryItemRow(item: item)
                }
                .listStyle(.plain)
            }
            Spacer()
        }
        .animation(.spring(), value: viewModel.recentAlert != nil)
        .navigationTitle(Localized("title_inventory_alerts"))
    }
}

struct LowStockBanner: View {
    let item: InventoryItem
    
    var body: some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
            VStack(alignment: .leading) {
                Text(Localized("banner_low_stock_title"))
                    .fontWeight(.bold)
                Text(Localized("banner_low_stock_detail_\(item.itemName)_\(item.stockLevel)"))
                    .font(.subheadline)
            }
            Spacer()
            Image(systemName: "xmark")
                .foregroundColor(.secondary)
        }
        .padding()
        .background(Color.orange.opacity(0.15))
        .cornerRadius(12)
        .padding(.horizontal)
    }
}

struct InventoryItemRow: View {
    let item: InventoryItem
    
    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(item.itemName)
                    .font(.headline)
                Text("\(Localized("label_stock_level")): \(item.stockLevel) (Threshold: \(item.threshold))")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            Spacer()
            Button(Localized("button_reorder")) {
                // BEHAVIOR NOTE: This would trigger an email or open a web link.
                print("Reorder action for \(item.itemName)")
            }
            .buttonStyle(.bordered)
            .tint(.brand)
        }
        .padding(.vertical, 8)
    }
}


// MARK: - ------------------ Reusable Components ------------------

struct PrimaryButton: View {
    let title: String
    var systemImage: String? = nil
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            HStack {
                if let systemImage = systemImage {
                    Image(systemName: systemImage)
                }
                Text(title)
                    .fontWeight(.bold)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 38) // Standard button height
        }
        .buttonStyle(.borderedProminent)
        .tint(.brand)
        .cornerRadius(12)
        .shadow(color: Color.brand.opacity(0.3), radius: 5, y: 3)
    }
}

struct StatusBadge: View {
    let status: String
    
    private var display: (text: String, color: Color, icon: String) {
        switch status.lowercased() {
        // Order Statuses
        case "new":
            return (Localized("status_new"), .blue, "sparkles")
        case "preparing":
            return (Localized("status_preparing"), .orange, "flame.fill")
        case "ready":
            return (Localized("status_ready"), .green, "checkmark.circle.fill")
        // Booking Statuses
        case "pending":
            return (Localized("status_pending"), .gray, "hourglass")
        case "confirmed":
            return (Localized("status_confirmed"), .green, "checkmark.seal.fill")
        case "canceled":
            return (Localized("status_canceled"), .red, "xmark.circle.fill")
        default:
            return (status.capitalized, .gray, "questionmark.circle")
        }
    }
    
    var body: some View {
        HStack(spacing: 4) {
            // BEHAVIOR NOTE: Icon is included for color-blind accessibility.
            Image(systemName: display.icon)
            Text(display.text)
                .fontWeight(.medium)
        }
        .font(.caption)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(display.color.opacity(0.15))
        .foregroundColor(display.color)
        .cornerRadius(20)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(Localized("label_status")): \(display.text)")
    }
}


// MARK: - ------------------ Previews ------------------

struct LoginView_Previews: PreviewProvider {
    static var previews: some View {
        LoginView()
            .environmentObject(AuthManager())
    }
}

struct OrderDetailView_Previews: PreviewProvider {
    static let mockOrder = Order(id: "O1001", tableId: "3", totalAmount: 3200, status: "new", createdAt: Date(), items: [
        OrderItem(id: "OI1", menuItemId: "R01", menuItemName: "Tonkotsu Ramen", quantity: 2, notes: "Extra noodles, no egg"),
        OrderItem(id: "OI2", menuItemId: "G01", menuItemName: "Gyoza", quantity: 1, notes: nil)
    ])
    
    static var previews: some View {
        NavigationStack {
            OrderDetailView(order: mockOrder)
                .environmentObject(OrderService())
                .environmentObject(PrinterManager())
        }
    }
}

struct KitchenBoardView_Previews: PreviewProvider {
    static var previews: some View {
        // --- iPad (Landscape) Preview ---
        KitchenBoardView()
            .previewDevice("iPad Pro (11-inch) (4th generation)")
            .previewInterfaceOrientation(.landscapeLeft)
            .environmentObject(OrderService())
            .environmentObject(PrinterManager())
            .previewDisplayName("iPad - Kitchen Board")
        
        // --- iPhone Preview ---
        NavigationStack {
            KitchenBoardView()
        }
        .previewDevice("iPhone 14 Pro")
        .environmentObject(OrderService())
        .environmentObject(PrinterManager())
        .previewDisplayName("iPhone - Kitchen Board")
    }
}

struct BookingDetailView_Previews: PreviewProvider {
    static var previews: some View {
        let bookingService = BookingService()
        NavigationStack {
             BookingDetailView(booking: bookingService.bookings.first!)
                 .environmentObject(bookingService)
        }
    }
}

struct PrinterSetupView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            PrinterSetupView()
                .environmentObject(PrinterManager())
        }
    }
}

struct InventoryAlertView_Previews: PreviewProvider {
    static var previews: some View {
        NavigationStack {
            InventoryAlertView()
        }
    }
}


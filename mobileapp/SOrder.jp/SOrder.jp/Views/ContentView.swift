import SwiftUI

/// The main view of the application, responsible for orchestrating the overall UI flow.
///
/// This view handles:
/// 1.  Onboarding login flow combining subdomain, email and password entry.
/// 2.  Role-based main content when authenticated (`ownerAdmin` or `customer`).
///
/// It also provides access to language selection and logout functionality.
struct ContentView: View {
    // MARK: - Environment Objects

    /// View model for managing tenant data. Injected from the environment.
    @EnvironmentObject var tenantViewModel: TenantViewModel
    /// View model for managing authentication state. Injected from the environment.
    @EnvironmentObject var authViewModel: AuthenticationViewModel
    /// Service for managing active orders.
    @EnvironmentObject var orderService: OrderService

    // MARK: - State Variables

    /// Controls the presentation of the language selection sheet.
    @State private var showingLanguageSelection = false

    // MARK: - Body

    var body: some View {
        NavigationView {
            VStack {
                if !authViewModel.isAuthenticated {
                    OnboardingLoginView()
                } else {
                    mainAppView
                }
                Spacer()
            }
            .padding()
            .navigationTitle(Text(NSLocalizedString("app_title", comment: "App Title")))
            .toolbar {
                // Logout button, shown only if authenticated.
                ToolbarItem(placement: .navigationBarLeading) {
                    if authViewModel.isAuthenticated {
                        Button(NSLocalizedString("logout_button", comment: "Logout button text")) {
                            authViewModel.logout()
                        }
                    }
                }
                // Language selection button.
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingLanguageSelection = true
                    } label: {
                        Image(systemName: "globe")
                            .accessibilityLabel(Text(NSLocalizedString("change_language_accessibility", comment: "")))
                    }
                }
            }
            // Present the LanguageSelectionView as a sheet.
            .sheet(isPresented: $showingLanguageSelection) {
                LanguageSelectionView()
            }
        }
    }

    // MARK: - Helper Views

    /// A view builder for the tenant selection UI.
    /// Displayed when `tenantViewModel.currentTenant` is `nil`.

    /// A view builder for the main application content, displayed when the user is authenticated.
    /// This view presents a `TabView` tailored to the user's role.
    @ViewBuilder
    private var mainAppView: some View {
        TabView {
            // Conditional TabView content based on the user's role from JWT.
            // Assuming "owner_admin" and "customer" are the role strings from JWT.
            if authViewModel.userRole == "owner_admin" { // Updated to use userRole from JWT
                // MARK: Owner/Admin Tabs
                OrderListView() // Removed orderService parameter
                    .tabItem {
                        Label(NSLocalizedString("tab_orders", comment: "Orders tab label"), systemImage: "list.bullet.rectangle")
                    }

                OwnerAdminDashboardView()
                    .tabItem {
                        Label(NSLocalizedString("tab_dashboard", comment: "Dashboard tab label"), systemImage: "chart.pie.fill")
                    }

                NavigationView { // Placeholder for Admin Settings
                    VStack {
                        Text(NSLocalizedString("admin_settings_title", comment: "Admin Settings Title")).font(.largeTitle)
                        Spacer()
                    }
                    .navigationTitle(NSLocalizedString("tab_admin_settings", comment: "Admin Settings Tab Label"))
                }
                .tabItem {
                    Label(NSLocalizedString("tab_admin_settings", comment: "Admin Settings tab label"), systemImage: "gearshape.fill")
                }

            } else if authViewModel.userRole == "customer" { // Updated to use userRole from JWT
                // MARK: Customer Tabs
                CustomerMenuView()
                    .tabItem {
                        Label(NSLocalizedString("tab_menu", comment: "Menu tab label"), systemImage: "list.bullet")
                    }

                NavigationView { // Placeholder for My Orders
                    VStack {
                        Text(NSLocalizedString("my_orders_title", comment: "My Orders Title")).font(.largeTitle)
                        Spacer()
                    }
                    .navigationTitle(NSLocalizedString("tab_my_orders", comment: "My Orders Tab Label"))
                }
                .tabItem {
                    Label(NSLocalizedString("tab_my_orders", comment: "My Orders tab label"), systemImage: "bag.fill")
                }

                NavigationView { // Placeholder for Customer Profile
                    VStack {
                        Text(NSLocalizedString("customer_profile_title", comment: "Customer Profile Title")).font(.largeTitle)
                        Spacer()
                    }
                    .navigationTitle(NSLocalizedString("tab_customer_profile", comment: "Customer Profile Tab Label"))
                }
                .tabItem {
                    Label(NSLocalizedString("tab_customer_profile", comment: "Customer Profile tab label"), systemImage: "person.crop.circle.fill")
                }
            }
        }
        // Environment objects are passed down from SOderApp, so explicit re-injection here
        // might be redundant but ensures clarity for these specific sub-hierarchies.
        .environmentObject(authViewModel)
        .environmentObject(tenantViewModel)
        .environmentObject(orderService)
    }
}

// MARK: - Previews

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        let mockAuthModel = AuthenticationViewModel(orderService: OrderService())
        // mockAuthModel.userRole = "owner_admin" // For admin preview
        // mockAuthModel.isAuthenticated = true

        return ContentView()
            .environmentObject(TenantViewModel())
            .environmentObject(mockAuthModel) // Use the one with OrderService injected
            .environmentObject(OrderService()) // Or better, use the same OrderService instance:
                                                // .environmentObject(mockAuthModel.orderService) - if orderService is public
                                                // For simplicity here, a new one is fine for preview if OrderService init is light.
                                                // However, the one from authViewModel is preferred if orderService needs auth details.
                                                // Let's assume OrderService() is fine for a generic preview.
    }
}

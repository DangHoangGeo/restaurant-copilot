import SwiftUI

/// The main view of the application, responsible for orchestrating the overall UI flow.
///
/// This view handles:
/// 1.  Tenant selection: If no tenant is selected, it presents UI for the user to input a subdomain.
/// 2.  Authentication: If a tenant is selected but the user is not authenticated, it presents the `LoginView`.
/// 3.  Role-based main content: If authenticated, it displays a `TabView` tailored to the user's role (`ownerAdmin` or `customer`).
///
/// It also provides access to language selection and logout functionality.
struct ContentView: View {
    // MARK: - Environment Objects

    /// View model for managing tenant data. Injected from the environment.
    @EnvironmentObject var tenantViewModel: TenantViewModel
    /// View model for managing authentication state. Injected from the environment.
    @EnvironmentObject var authViewModel: AuthenticationViewModel

    // MARK: - State Variables

    /// Holds the user's input for the tenant subdomain.
    @State private var subdomainInput: String = ""
    /// Controls the presentation of the language selection sheet.
    @State private var showingLanguageSelection = false

    // MARK: - Body

    var body: some View {
        NavigationView {
            VStack {
                // Conditional content based on whether a tenant is currently selected.
                if tenantViewModel.currentTenant == nil {
                    tenantSelectionView
                } else {
                    // A tenant is selected, proceed to authentication or main app view.
                    VStack { // Added VStack for structure when tenant is selected
                        // Display the name of the currently loaded tenant.
                        if let tenant = tenantViewModel.currentTenant {
                            Text(String(format: NSLocalizedString("welcome_to_tenant_message", comment: "Welcome message specific to tenant"), tenant.name))
                                .font(.title3)
                                .padding(.top)
                        }

                        // Conditional content based on authentication state.
                        if !authViewModel.isAuthenticated {
                            LoginView()
                        } else {
                            mainAppView // User is authenticated, show role-based content.
                        }
                    }
                }
                Spacer() // Pushes content to the top
            }
            .padding()
            // Monitor changes to `currentTenant` to clear subdomain input on successful load.
            .onChange(of: tenantViewModel.currentTenant) { newTenant in
                if newTenant != nil && tenantViewModel.errorMessage == nil {
                    subdomainInput = ""
                }
            }
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
    @ViewBuilder
    private var tenantSelectionView: some View {
        Text(NSLocalizedString("tenant_selection_prompt", comment: "Prompt for subdomain input"))
            .font(.headline)
        TextField(NSLocalizedString("tenant_id_placeholder", comment: "Placeholder for subdomain input"), text: $subdomainInput)
            .textFieldStyle(RoundedBorderTextFieldStyle())
            .autocapitalization(.none)
            .padding()

        Button(NSLocalizedString("load_tenant_button", comment: "Button to load tenant data")) {
            tenantViewModel.errorMessage = nil // Clear previous error
            tenantViewModel.selectTenant(subdomain: subdomainInput)
        }
        .padding(.bottom)

        // Display error message if tenant loading fails.
        if let errorMessage = tenantViewModel.errorMessage {
            Text(NSLocalizedString("error_prefix", comment: "Error prefix") + errorMessage)
                .foregroundColor(.red)
                .padding()
        }
    }

    /// A view builder for the main application content, displayed when the user is authenticated.
    /// This view presents a `TabView` tailored to the user's role.
    @ViewBuilder
    private var mainAppView: some View {
        TabView {
            // Conditional TabView content based on the selected user role.
            if authViewModel.selectedRole == .ownerAdmin {
                // MARK: Owner/Admin Tabs
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

            } else if authViewModel.selectedRole == .customer {
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
        // Environment objects are passed down from ShopCopilotApp, so explicit re-injection here
        // might be redundant but ensures clarity for these specific sub-hierarchies.
        .environmentObject(authViewModel)
        .environmentObject(tenantViewModel)
    }
}

// MARK: - Previews

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(TenantViewModel()) // Provide dummy for preview
            .environmentObject(AuthenticationViewModel()) // Provide dummy for preview
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(TenantViewModel()) // Provide dummy for preview
            .environmentObject(AuthenticationViewModel()) // Provide dummy for preview
    }
}

import SwiftUI

/// A view representing the main dashboard for an Owner/Admin user.
///
/// This view displays a welcome message, information about the current tenant being managed,
/// and the logged-in user's username. It serves as a placeholder for more complex
/// dashboard features.
struct OwnerAdminDashboardView: View {
    // MARK: - Environment Objects

    /// The authentication view model, providing information about the logged-in user.
    @EnvironmentObject var authViewModel: AuthenticationViewModel
    /// The tenant view model, providing information about the currently selected tenant.
    @EnvironmentObject var tenantViewModel: TenantViewModel

    // MARK: - Body

    var body: some View {
        // Note: This view is typically presented within a TabView in ContentView.
        // If it needed its own NavigationView for a title bar when standalone,
        // it could be wrapped in one here. However, as part of a TabView,
        // the NavigationView is usually handled by the content of each tab if needed,
        // or by the view containing the TabView itself.
        // The title "owner_admin_dashboard_title" is intended for the Tab label or a potential Nav Bar if this view becomes more complex.

        VStack(spacing: 15) {
            // Display a prominent title for the dashboard.
            // This Text view acts as a large heading within the content area of the tab.
            Text(NSLocalizedString("owner_admin_dashboard_title", comment: "Title for Owner/Admin Dashboard"))
                .font(.largeTitle)
                .padding(.top) // Add some padding at the top

            // Personalized welcome message for the admin.
            Text(NSLocalizedString("welcome_owner_admin", comment: "Welcome message for Owner/Admin"))
                .font(.title2)

            // Display information about the current tenant being managed.
            if let tenant = tenantViewModel.currentTenant {
                HStack {
                    Text(NSLocalizedString("managing_tenant_label", comment: "Label for tenant name in admin dashboard"))
                        .font(.headline)
                    Text(tenant.name)
                        .font(.headline)
                        .foregroundColor(.secondary)
                }
            }

            // Display the username of the logged-in administrator.
            if !authViewModel.currentUsername.isEmpty {
                HStack {
                    Text(NSLocalizedString("logged_in_as_label", comment: "Label for username in admin dashboard"))
                        .font(.subheadline)
                    Text(authViewModel.currentUsername)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }

            Spacer() // Pushes content to the top
        }
        .padding() // Overall padding for the VStack content
    }
}


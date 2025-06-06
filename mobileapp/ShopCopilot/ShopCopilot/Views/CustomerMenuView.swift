import SwiftUI

/// A view that displays the menu for a customer, specific to the selected tenant.
///
/// This view shows a title, information about the current tenant's menu being viewed,
/// a welcome message, and a placeholder list for menu items.
struct CustomerMenuView: View {
    // MARK: - Environment Objects

    // authViewModel is available but not directly used in this placeholder.
    // It could be used for customer-specific actions in a real app (e.g., adding to cart as logged-in user).
    // @EnvironmentObject var authViewModel: AuthenticationViewModel

    /// The tenant view model, providing information about the currently selected tenant.
    @EnvironmentObject var tenantViewModel: TenantViewModel

    // MARK: - Body

    var body: some View {
        // Similar to OwnerAdminDashboardView, this view is typically part of a TabView.
        // The "customer_menu_title" is used for the Tab label or a potential Nav Bar title.

        VStack(spacing: 15) {
            // Display a prominent title for the menu view.
            Text(NSLocalizedString("customer_menu_title", comment: "Title for Customer Menu"))
                .font(.largeTitle)
                .padding(.top)

            // Display information about the current tenant whose menu is being viewed.
            if let tenant = tenantViewModel.currentTenant {
                Text(String(format: NSLocalizedString("viewing_menu_for_tenant", comment: "Viewing menu for [Tenant Name]"), tenant.name))
                    .font(.headline)
                    .foregroundColor(.secondary)
            } else {
                // Fallback message if no tenant is selected (should ideally not happen in this flow).
                Text(NSLocalizedString("no_tenant_selected_menu", comment: "Message when no tenant is selected for menu"))
                    .font(.headline)
                    .foregroundColor(.orange)
            }

            // General welcome or promotional message for the customer.
            Text(NSLocalizedString("welcome_customer_menu", comment: "Generic welcome message for customer menu area"))
                .font(.title3) // Slightly smaller than main title
                .padding(.top, 5)

            // Placeholder for actual menu items.
            // In a real app, this would be populated with data fetched for the tenant.
            List {
                // TODO: Replace with actual menu item views and data.
                Text(NSLocalizedString("menu_item_placeholder_1", comment: "Placeholder for menu item 1"))
                Text(NSLocalizedString("menu_item_placeholder_2", comment: "Placeholder for menu item 2"))
                Text(NSLocalizedString("menu_item_placeholder_3", comment: "Placeholder for menu item 3"))
            }
            .listStyle(InsetGroupedListStyle()) // A modern list style.

            Spacer() // Pushes content to the top.
        }
        .padding(.horizontal) // Add horizontal padding to the content.
    }
}

// MARK: - Previews

struct CustomerMenuView_Previews: PreviewProvider {
    static var previews: some View {
        // Create mock view models for the preview.
        let tenantVM = TenantViewModel()
        tenantVM.currentTenant = Tenant(id: UUID(), name: "Delicious Eats", subdomain: "deliciouseats", logoUrl: nil, primaryColorHex: nil, coverImageUrl: nil)

        CustomerMenuView()
            // .environmentObject(AuthenticationViewModel()) // Not strictly needed for this preview's current state
            .environmentObject(tenantVM)
    }
}

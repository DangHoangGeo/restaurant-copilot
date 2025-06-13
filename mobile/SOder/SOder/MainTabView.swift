import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @StateObject private var printerManager = PrinterManager()
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Orders Tab
            OrdersView()
                .environmentObject(printerManager)
                .tabItem {
                    Label("tab_orders".localized, systemImage: "list.bullet.rectangle.portrait")
                }
                .tag(0)
            
            // Kitchen Board Tab
            KitchenBoardView()
                .environmentObject(printerManager)
                .tabItem {
                    Label("tab_kitchen".localized, systemImage: "flame")
                }
                .tag(1)
            
            // Printer Settings Tab
            PrinterSettingsView()
                .environmentObject(printerManager)
                .tabItem {
                    Label("tab_printer_settings".localized, systemImage: "printer")
                }
                .tag(2)

            // New Order Tab (POS)
            // This NavigationStack will contain the POS flow starting with SelectTableView
            NavigationStack {
                // SelectTableView is expected to manage its own OrderManager instance
                // as a @StateObject, or have it passed via .environmentObject if
                // ContentView or a higher-level view sets it up for the whole app.
                // For now, we assume SelectTableView can initialize itself correctly.
                // SupabaseManager.shared can be accessed directly where needed or also passed via environment.
                SelectTableView()
            }
            .environmentObject(printerManager) // Pass existing printerManager
            .environmentObject(localizationManager) // Pass existing localizationManager
            // If SupabaseManager needs to be explicitly passed:
            // .environmentObject(SupabaseManager.shared)
            .tabItem {
                Label("tab_new_order".localized, systemImage: "plus.circle.fill")
            }
            .tag(3) // Ensure this tag is unique

        }
        .accentColor(.orange)
    }
}

#Preview {
    MainTabView()
}

import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @EnvironmentObject private var supabaseManager: SupabaseManager
    @EnvironmentObject private var printerManager: PrinterManager
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Orders Tab
            OrdersView()
                .environmentObject(printerManager)
                .tabItem {
                    Label("tab_orders".localized, systemImage: "list.bullet")
                }
                .tag(0)
            
            // Kitchen Board Tab
            KitchenBoardView()
                .environmentObject(printerManager)
                .tabItem {
                    Label("tab_kitchen".localized, systemImage: "square.grid.2x2")
                }
                .tag(1)

            // Tables Tab
            TablesListView()
                .environmentObject(printerManager)
                .tabItem {
                    Label("tab_tables".localized, systemImage: "table.furniture")
                }
                .tag(2)

            // Printer Settings Tab
            PrinterSettingsView()
                .environmentObject(printerManager)
                .tabItem {
                    Label("tab_printer_settings".localized, systemImage: "printer")
                }
                .tag(3)

        }
        .tint(Color.appHighlight)
    }
}

#Preview {
    MainTabView()
        .environmentObject(LocalizationManager.shared)
        .environmentObject(SupabaseManager.shared)
}

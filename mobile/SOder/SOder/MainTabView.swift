import SwiftUI

struct MainTabView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @EnvironmentObject private var supabaseManager: SupabaseManager
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



        }
        .accentColor(.orange)
    }
}

#Preview {
    MainTabView()
        .environmentObject(LocalizationManager.shared)
        .environmentObject(SupabaseManager.shared)
}

import SwiftUI

struct MainTabView: View {
    @StateObject private var printerManager = PrinterManager()
    @State private var selectedTab = 0
    
    var body: some View {
        TabView(selection: $selectedTab) {
            // Orders Tab
            OrdersView()
                .environmentObject(printerManager)
                .tabItem {
                    Label("Orders", systemImage: "list.bullet.rectangle.portrait")
                }
                .tag(0)
            
            // Kitchen Board Tab
            KitchenBoardView()
                .environmentObject(printerManager)
                .tabItem {
                    Label("Kitchen", systemImage: "flame")
                }
                .tag(1)
            
            // Printer Settings Tab
            PrinterSettingsView()
                .environmentObject(printerManager)
                .tabItem {
                    Label("Printer", systemImage: "printer")
                }
                .tag(2)
        }
        .accentColor(.orange)
    }
}

#Preview {
    MainTabView()
}

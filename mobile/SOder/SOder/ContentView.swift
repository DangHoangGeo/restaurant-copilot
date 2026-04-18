import SwiftUI

struct ContentView: View {
    @StateObject private var supabaseManager = SupabaseManager.shared
    @EnvironmentObject private var localizationManager: LocalizationManager

    var body: some View {
        Group {
            if !supabaseManager.isAuthenticated {
                LoginView()
                    .environmentObject(supabaseManager)
                    .environmentObject(localizationManager)
            } else if supabaseManager.needsBranchSelection || supabaseManager.currentRestaurant == nil {
                BranchPickerView()
                    .environmentObject(supabaseManager)
                    .environmentObject(localizationManager)
            } else {
                MainTabView()
                    .environmentObject(supabaseManager)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: supabaseManager.isAuthenticated)
        .animation(.easeInOut(duration: 0.25), value: supabaseManager.needsBranchSelection)
        .animation(.easeInOut(duration: 0.25), value: supabaseManager.currentRestaurant == nil)
    }
}

#Preview {
    ContentView()
        .environmentObject(LocalizationManager.shared)
}

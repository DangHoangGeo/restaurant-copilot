import SwiftUI

struct ContentView: View {
    @StateObject private var supabaseManager = SupabaseManager.shared
    @EnvironmentObject private var localizationManager: LocalizationManager

    /// Persisted across launches so the welcome screen only appears on first run.
    @AppStorage("hasSeenWelcome") private var hasSeenWelcome = false

    var body: some View {
        Group {
            if !supabaseManager.isAuthenticated {
                if !hasSeenWelcome {
                    WelcomeView {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            hasSeenWelcome = true
                        }
                    }
                    .environmentObject(localizationManager)
                    .transition(.opacity)
                } else {
                    LoginView()
                        .environmentObject(supabaseManager)
                        .environmentObject(localizationManager)
                        .transition(.opacity)
                }
            } else if supabaseManager.needsBranchSelection || supabaseManager.currentRestaurant == nil {
                BranchPickerView()
                    .environmentObject(supabaseManager)
                    .environmentObject(localizationManager)
                    .transition(.opacity)
            } else {
                MainTabView()
                    .environmentObject(supabaseManager)
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.28), value: supabaseManager.isAuthenticated)
        .animation(.easeInOut(duration: 0.28), value: supabaseManager.needsBranchSelection)
        .animation(.easeInOut(duration: 0.28), value: supabaseManager.currentRestaurant == nil)
        .animation(.easeInOut(duration: 0.28), value: hasSeenWelcome)
    }
}

#Preview {
    ContentView()
        .environmentObject(LocalizationManager.shared)
}

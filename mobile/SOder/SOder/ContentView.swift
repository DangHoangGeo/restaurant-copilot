//
//  ContentView.swift
//  SOder
//
//  Created by Dang Hoang on 2025/06/09.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var supabaseManager = SupabaseManager.shared
    
    var body: some View {
        Group {
            if supabaseManager.isAuthenticated {
                MainTabView()
                    .environmentObject(supabaseManager)
            } else {
                LoginView()
                    .environmentObject(supabaseManager)
            }
        }
        .onAppear {
            Task {
                //await $supabaseManager.checkAuthState
            }
        }
    }
}

#Preview {
    ContentView()
}

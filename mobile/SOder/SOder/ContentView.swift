//
//  ContentView.swift
//  SOder
//
//  Created by Dang Hoang on 2025/06/09.
//

import SwiftUI

struct ContentView: View {
    @StateObject private var supabaseManager = SupabaseManager.shared
    @StateObject private var printerManager = PrinterManager()
    
    var body: some View {
        Group {
            if supabaseManager.isAuthenticated {
                MainTabView()
                    .environmentObject(printerManager)
            } else {
                LoginView()
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

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
    @StateObject private var orderManager = OrderManager()

    var body: some View {
        Group {
            if supabaseManager.isAuthenticated {
                MainTabView()
                    .environmentObject(printerManager)
                    .environmentObject(orderManager)
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

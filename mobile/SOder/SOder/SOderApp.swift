//
//  SOderApp.swift
//  SOder
//
//  Created by Dang Hoang on 2025/06/09.
//

import SwiftUI

@main
struct SOderApp: App {
    @StateObject private var localizationManager = LocalizationManager.shared
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(localizationManager)
        }
    }
}

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
 
    init() {
        AppAppearance.configure()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(localizationManager)
                .environmentObject(OrderManager.shared)
                .environmentObject(PrinterManager.shared)
        }
    }
}

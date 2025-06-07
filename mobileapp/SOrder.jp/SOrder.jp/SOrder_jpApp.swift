//
//  SOrder_jpApp.swift
//  SOrder.jp
//
//  Created by Dang Hoang on 2025/06/06.
//

import SwiftUI

@main
struct SOrder_jpApp: App {
    // MARK: - State Objects

    /// View model responsible for managing tenant-specific data and state.
    /// Instantiated as a `@StateObject` to ensure it persists throughout the app's lifecycle.
    @StateObject var tenantViewModel = TenantViewModel()

    @StateObject var orderService: OrderService
    
    /// View model responsible for managing authentication state and logic. Uses
    /// the same `OrderService` instance so that order updates are reflected in
    /// the views that observe it.
    @StateObject var authViewModel: AuthenticationViewModel

    /// A unique identifier used to force re-rendering of the `ContentView` when critical
    /// global settings (like language) change. This is a common workaround in SwiftUI
    /// for scenarios where direct state binding might not trigger a deep refresh of the view hierarchy.
    @State private var viewID = UUID()

    init() {
        let orderService = OrderService()
        _orderService = StateObject(wrappedValue: orderService)
        _authViewModel = StateObject(wrappedValue: AuthenticationViewModel(orderService: orderService))
    }

    

    // MARK: - Body

    var body: some Scene {
        WindowGroup {
            ContentView()
                // Provide the TenantViewModel to the view hierarchy as an environment object.
                .environmentObject(tenantViewModel)
                // Provide the AuthenticationViewModel to the view hierarchy as an environment object.
                .environmentObject(authViewModel)
                // Provide order management service throughout the app.
                .environmentObject(orderService)
                // Apply the unique ID to the ContentView. Changing this ID will cause SwiftUI
                // to reconstruct the ContentView and its children, helping to reflect global state changes.
                .id(viewID)
                // Listen for notifications that UserDefaults has changed. This is used to detect
                // when the app's language setting ("AppleLanguages") might have been updated.
                .onReceive(NotificationCenter.default.publisher(for: UserDefaults.didChangeNotification)) { notification in
                    // Specifically check if the "AppleLanguages" key was part of the change,
                    // though any UserDefaults change will trigger this for simplicity here.
                    // Upon notification, update `viewID` to a new unique value,
                    // forcing a refresh of the `ContentView`.
                    // Note: A more targeted approach would involve checking `notification.object`
                    // or specific keys if performance becomes an issue.
                    self.viewID = UUID()
                }
        }
    }
}

import SwiftUI

struct ConnectionStatusBar: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @EnvironmentObject var supabaseManager: SupabaseManager
    @ObservedObject var orderManager: OrderManager
    @EnvironmentObject var printerManager: PrinterManager
    
    var body: some View {
        HStack(spacing: Spacing.sm) {
            // Database Connection Status
            HStack(spacing: Spacing.xxs) {
                Circle()
                    .fill(supabaseManager.isAuthenticated ? Color.appSuccess : Color.appError)
                    .frame(width: 8, height: 8)
                Text("connection_status_database".localized)
                    .font(.captionRegular)
                    .foregroundColor(.appTextSecondary)
            }
            
            // Real-time Status
            HStack(spacing: Spacing.xxs) {
                Circle()
                    .fill(orderManager.isRealtimeConnected ? Color.appSuccess : Color.appWarning)
                    .frame(width: 8, height: 8)
                Text("connection_status_live_updates".localized)
                    .font(.captionRegular)
                    .foregroundColor(.appTextSecondary)
            }
            
            // Printer Status
            HStack(spacing: Spacing.xxs) {
                Circle()
                    .fill(printerManager.isConnected ? Color.appSuccess : Color.appTextSecondary)
                    .frame(width: 8, height: 8)
                Text("connection_status_printer".localized)
                    .font(.captionRegular)
                    .foregroundColor(.appTextSecondary)
            }
            
            Spacer()
            
            if let restaurant = supabaseManager.currentRestaurant {
                Text(restaurant.name ?? "connection_status_unknown_restaurant".localized)
                    .font(.captionRegular)
                    .fontWeight(.medium)
                    .foregroundColor(.appTextPrimary)
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(Color.appSurface)
    }
}

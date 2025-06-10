import SwiftUI

struct ConnectionStatusBar: View {
    @EnvironmentObject var supabaseManager: SupabaseManager
    @ObservedObject var orderManager: OrderManager
    @EnvironmentObject var printerManager: PrinterManager
    
    var body: some View {
        HStack(spacing: 12) {
            // Database Connection Status
            HStack(spacing: 4) {
                Circle()
                    .fill(supabaseManager.isAuthenticated ? Color.green : Color.red)
                    .frame(width: 8, height: 8)
                Text("Database")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Real-time Status
            HStack(spacing: 4) {
                Circle()
                    .fill(orderManager.isRealtimeConnected ? Color.green : Color.orange)
                    .frame(width: 8, height: 8)
                Text("Live Updates")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            // Printer Status
            HStack(spacing: 4) {
                Circle()
                    .fill(printerManager.isConnected ? Color.green : Color.gray)
                    .frame(width: 8, height: 8)
                Text("Printer")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
            
            if let restaurant = supabaseManager.currentRestaurant {
                Text(restaurant.name!)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(.primary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color(.systemGray6))
    }
}

import SwiftUI

// Debug version to test if CompactKitchenItemCard is working
struct DebugCompactKitchenItemCard: View {
    let item: GroupedItem
    let onStatusTap: () -> Void
    let onDetailTap: () -> Void
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Debug: Basic item name display
            Text("DEBUG: \(item.itemName)")
                .font(.headline)
                .fontWeight(.bold)
                .foregroundColor(.red)
                .background(Color.yellow.opacity(0.3))
            
            // Debug: Basic quantity display
            Text("DEBUG Qty: \(item.quantity)")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundColor(.blue)
                .background(Color.green.opacity(0.3))
            
            // Debug: Basic tables display
            if !item.tables.isEmpty {
                Text("DEBUG Tables: \(Array(item.tables.sorted()).joined(separator: ", "))")
                    .font(.subheadline)
                    .foregroundColor(.purple)
                    .background(Color.orange.opacity(0.3))
            }
            
            // Debug: Basic status button
            Button(action: onStatusTap) {
                Text("DEBUG TAP TO CHANGE STATUS")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.red)
                    .cornerRadius(8)
            }
        }
        .padding(16)
        .frame(height: 200) // Larger fixed height for debug
        .background(Color.gray.opacity(0.2))
        .border(Color.red, width: 2) // Debug border
        .cornerRadius(12)
        .onTapGesture {
            onDetailTap()
        }
    }
}

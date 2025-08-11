//
//  OrderSummaryBar.swift
//  SOder
//
//  Created by Claude Code on 2025/08/11.
//  Unified order summary bar for POS interfaces
//

import SwiftUI

struct OrderSummaryBar: View {
    let itemsCount: Int
    let totalAmount: Double
    let isVisible: Bool
    let onTap: () -> Void
    
    @State private var isPressed = false
    
    var body: some View {
        if isVisible && itemsCount > 0 {
            HStack(spacing: Spacing.md) {
                // Items count with icon
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "cart")
                        .font(.subheadline)
                        .foregroundColor(.appPrimary)
                    
                    Text(String(format: "pos_items_count_format".localized, itemsCount))
                        .font(.bodyMedium)
                        .fontWeight(.semibold)
                        .foregroundColor(.appTextPrimary)
                }
                
                Spacer()
                
                // Total amount
                Text(String(format: "price_format".localized, totalAmount))
                    .font(.bodyMedium)
                    .fontWeight(.bold)
                    .foregroundColor(.appPrimary)
                
                // Arrow indicator
                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.appTextSecondary)
            }
            .padding(.horizontal, Spacing.lg)
            .padding(.vertical, Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .fill(Color.appSurfaceElevated)
                    .shadow(
                        color: isPressed ? Elevation.level1.color : Elevation.level2.color,
                        radius: isPressed ? Elevation.level1.radius : Elevation.level2.radius,
                        y: isPressed ? Elevation.level1.y : Elevation.level2.y
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(Color.appBorderLight, lineWidth: 1)
            )
            .scaleEffect(isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: isPressed)
            .contentShape(Rectangle())
            .onTapGesture(perform: onTap)
            .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
                isPressed = pressing
            }, perform: {})
            .accessibilityLabel(String(format: "pos_view_cart_accessibility".localized, itemsCount, totalAmount))
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }
}

// Floating variant for overlays
struct FloatingOrderSummaryBar: View {
    let itemsCount: Int
    let totalAmount: Double
    let isVisible: Bool
    let onTap: () -> Void
    let onDismiss: (() -> Void)?
    
    @State private var isPressed = false
    
    var body: some View {
        if isVisible && itemsCount > 0 {
            VStack {
                Spacer()
                
                HStack {
                    Spacer()
                    
                    HStack(spacing: Spacing.md) {
                        // Dismiss button (if provided)
                        if let onDismiss = onDismiss {
                            Button(action: onDismiss) {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.title3)
                                    .foregroundColor(.appTextSecondary)
                            }
                        }
                        
                        // Items count
                        HStack(spacing: Spacing.xs) {
                            Image(systemName: "cart.fill")
                                .font(.subheadline)
                                .foregroundColor(.white)
                            
                            Text(String(format: "pos_items_count_format".localized, itemsCount))
                                .font(.bodyMedium)
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                        }
                        
                        // Total amount
                        Text(String(format: "price_format".localized, totalAmount))
                            .font(.bodyMedium)
                            .fontWeight(.bold)
                            .foregroundColor(.white)
                        
                        // Action text
                        Text("pos_view_cart".localized)
                            .font(.bodyMedium)
                            .fontWeight(.semibold)
                            .foregroundColor(.white)
                        
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.8))
                    }
                    .padding(.horizontal, Spacing.lg)
                    .padding(.vertical, Spacing.md)
                    .background(
                        Capsule()
                            .fill(Color.appPrimary)
                            .shadow(
                                color: isPressed ? Elevation.level2.color : Elevation.level3.color,
                                radius: isPressed ? Elevation.level2.radius : Elevation.level3.radius,
                                y: isPressed ? Elevation.level2.y : Elevation.level3.y
                            )
                    )
                    .scaleEffect(isPressed ? 0.95 : 1.0)
                    .animation(.spring(response: 0.3), value: isPressed)
                    .contentShape(Rectangle())
                    .onTapGesture(perform: onTap)
                    .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
                        isPressed = pressing
                    }, perform: {})
                    
                    Spacer()
                }
            }
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .animation(.spring(), value: isVisible)
        }
    }
}

#Preview {
    VStack(spacing: Spacing.xl) {
        Text("Order Summary Bar Examples")
            .font(.sectionHeader)
            .padding()
        
        // Regular summary bar
        VStack(spacing: Spacing.md) {
            Text("Regular Summary Bar")
                .font(.bodyMedium)
            
            OrderSummaryBar(
                itemsCount: 3,
                totalAmount: 25.50,
                isVisible: true,
                onTap: { print("Summary tapped") }
            )
            .padding()
        }
        
        Spacer()
        
        // Floating summary bar overlay
        ZStack {
            Color.appBackground
                .frame(height: 200)
            
            FloatingOrderSummaryBar(
                itemsCount: 5,
                totalAmount: 47.25,
                isVisible: true,
                onTap: { print("Floating summary tapped") },
                onDismiss: { print("Floating summary dismissed") }
            )
        }
        
        Spacer()
    }
    .background(Color.appBackground)
}
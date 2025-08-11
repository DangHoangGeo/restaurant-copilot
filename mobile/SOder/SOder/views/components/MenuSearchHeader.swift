//
//  MenuSearchHeader.swift
//  SOder
//
//  Created by Claude Code on 2025/08/11.
//  Unified search header for POS menu selection
//

import SwiftUI

struct MenuSearchHeader: View {
    @Binding var searchText: String
    @Binding var selectedCategoryId: String?
    
    let categories: [Category]
    let menuItems: [MenuItem]
    let title: String
    let subtitle: String
    
    var body: some View {
        VStack(spacing: Spacing.md) {
            // Title Section
            HStack {
                VStack(alignment: .leading, spacing: Spacing.xs) {
                    Text(title)
                        .font(.sectionHeader)
                        .fontWeight(.bold)
                        .foregroundColor(.appTextPrimary)
                    Text(subtitle)
                        .font(.captionRegular)
                        .foregroundColor(.appTextSecondary)
                }
                Spacer()
            }
            
            // Search Field
            HStack {
                Image(systemName: "magnifyingglass")
                    .font(.subheadline)
                    .foregroundColor(.appTextTertiary)
                
                TextField("pos_search_placeholder".localized, text: $searchText)
                    .font(.bodyMedium)
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                
                if !searchText.isEmpty {
                    Button(action: { searchText = "" }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.subheadline)
                            .foregroundColor(.appTextTertiary)
                    }
                }
            }
            .padding(.horizontal, Spacing.md)
            .padding(.vertical, Spacing.sm)
            .background(Color.appSurfaceSecondary)
            .cornerRadius(CornerRadius.md)
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.md)
                    .stroke(Color.appBorderLight, lineWidth: 1)
            )
            
            // Category Filter Chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: Spacing.sm) {
                    FilterChip(
                        title: "pos_filter_all".localized,
                        count: menuItems.count,
                        isSelected: selectedCategoryId == nil,
                        color: .appPrimary
                    ) { 
                        selectedCategoryId = nil 
                    }
                    
                    ForEach(categories) { category in
                        FilterChip(
                            title: category.displayName,
                            count: menuItems.filter { $0.category_id == category.id }.count,
                            isSelected: selectedCategoryId == category.id,
                            color: .appAccent
                        ) {
                            selectedCategoryId = selectedCategoryId == category.id ? nil : category.id
                        }
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}

// FilterChip is defined in StatusComponents.swift

#Preview {
    let sampleCategories = [
        Category(id: "1", name_en: "Drinks", name_ja: "飲み物", name_vi: "Đồ uống", position: 1),
        Category(id: "2", name_en: "Food", name_ja: "食べ物", name_vi: "Thức ăn", position: 2)
    ]
    let sampleItems = [
        MenuItem(
            id: "1", restaurant_id: "1", category_id: "1", 
            name_en: "Coffee", name_ja: "コーヒー", name_vi: "Cà phê", 
            code: "COF", description_en: "Hot coffee", description_ja: nil, description_vi: nil, 
            price: 5.0, tags: nil, image_url: nil, stock_level: nil, available: true, 
            position: nil, created_at: "", updated_at: ""
        )
    ]
    
    @State var searchText = ""
    @State var selectedCategory: String? = nil
    
    MenuSearchHeader(
        searchText: $searchText,
        selectedCategoryId: $selectedCategory,
        categories: sampleCategories,
        menuItems: sampleItems,
        title: "pos_search_title".localized,
        subtitle: "pos_search_subtitle".localized
    )
    .padding()
    .background(Color.appSurfaceElevated)
}
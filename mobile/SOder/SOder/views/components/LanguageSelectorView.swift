//
//  LanguageSelectorView.swift
//  SOder
//
//  Created by Dang Hoang on 2025/06/10.
//

import SwiftUI

struct LanguageSelectorView: View {
    @EnvironmentObject private var localizationManager: LocalizationManager
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            List {
                ForEach(localizationManager.supportedLanguages, id: \.self) { languageCode in
                    Button(action: {
                        localizationManager.setLanguage(languageCode)
                        dismiss()
                    }) {
                        HStack {
                            Text(localizationManager.supportedLanguageNames[languageCode] ?? languageCode)
                                .foregroundColor(.appTextPrimary)
                            
                            Spacer()
                            
                            if localizationManager.currentLanguage == languageCode {
                                Image(systemName: "checkmark")
                                    .foregroundColor(.appPrimary)
                            }
                        }
                    }
                }
            }
            .navigationTitle("language".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("done".localized) {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    LanguageSelectorView()
        .environmentObject(LocalizationManager.shared)
}

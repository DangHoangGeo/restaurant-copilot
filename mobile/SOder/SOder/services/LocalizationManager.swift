//
//  LocalizationManager.swift
//  SOder
//
//  Created by Dang Hoang on 2025/06/10.
//

import Foundation
import SwiftUI

class LocalizationManager: ObservableObject {
    static let shared = LocalizationManager()
    
    @Published var currentLanguage: String = Locale.current.language.languageCode?.identifier ?? "en"
    
    private init() {
        // Load saved language preference or use system default
        if let savedLanguage = UserDefaults.standard.string(forKey: "app_language") {
            currentLanguage = savedLanguage
        } else {
            // Set default based on system language
            let systemLanguage = Locale.current.language.languageCode?.identifier ?? "en"
            currentLanguage = supportedLanguages.contains(systemLanguage) ? systemLanguage : "en"
        }
    }
    
    var supportedLanguages: [String] {
        return ["en", "ja", "vi"]
    }
    
    var supportedLanguageNames: [String: String] {
        return [
            "en": "English",
            "ja": "日本語",
            "vi": "Tiếng Việt"
        ]
    }
    
    func setLanguage(_ language: String) {
        guard supportedLanguages.contains(language) else { return }
        currentLanguage = language
        UserDefaults.standard.set(language, forKey: "app_language")
        
        // Force update all views
        objectWillChange.send()
    }
    
    func localizedString(_ key: String) -> String {
        guard let path = Bundle.main.path(forResource: currentLanguage, ofType: "lproj"),
              let bundle = Bundle(path: path) else {
            // Fallback to English if current language bundle is not found
            guard let fallbackPath = Bundle.main.path(forResource: "en", ofType: "lproj"),
                  let fallbackBundle = Bundle(path: fallbackPath) else {
                return key
            }
            return NSLocalizedString(key, bundle: fallbackBundle, comment: "")
        }
        
        return NSLocalizedString(key, bundle: bundle, comment: "")
    }
}

// SwiftUI View extension for easy localization
extension View {
    func localized(_ key: String) -> String {
        return LocalizationManager.shared.localizedString(key)
    }
}

// String extension for localization
extension String {
    var localized: String {
        return LocalizationManager.shared.localizedString(self)
    }
    
    func localized(with arguments: CVarArg...) -> String {
        return String(format: LocalizationManager.shared.localizedString(self), arguments: arguments)
    }
}

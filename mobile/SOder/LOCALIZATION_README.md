# iOS Localization Setup

This document outlines the localization setup for the SOder iOS app.

## Supported Languages

- English (en) - Default
- Japanese (ja)
- Vietnamese (vi)

## Files Created/Modified

### Localization Files
- `localization/en.lproj/Localizable.strings` - English translations
- `localization/ja.lproj/Localizable.strings` - Japanese translations  
- `localization/vi.lproj/Localizable.strings` - Vietnamese translations

### Code Files
- `services/LocalizationManager.swift` - Localization management
- `views/components/LanguageSelectorView.swift` - Language selector UI
- `views/auth/LoginView.swift` - Updated to use localized strings
- `views/orders/CheckoutView.swift` - Partially updated for demonstration
- `SOderApp.swift` - Updated to include LocalizationManager
- `Info.plist` - Added supported localizations

## Usage

### In SwiftUI Views
```swift
// Using the localized extension
Text("login_title".localized)

// Using the view extension
Text(localized("email"))

// With parameters
Text("welcome_message".localized(with: userName))
```

### Adding New Languages
1. Create new `.lproj` directory (e.g., `fr.lproj`)
2. Add `Localizable.strings` file with translations
3. Update `LocalizationManager.supportedLanguages` array
4. Update `LocalizationManager.supportedLanguageNames` dictionary
5. Add language code to `Info.plist` CFBundleLocalizations array

### Adding New Strings
1. Add the key-value pair to all `Localizable.strings` files
2. Use the key in your SwiftUI views with `.localized`

## Implementation Notes

- The app detects system language on first launch
- User language preference is saved in UserDefaults
- Falls back to English if translation not found
- Language can be changed from the login screen
- All views should use LocalizationManager as @EnvironmentObject

## Next Steps for Other Developers

Other developers should:
1. Update their assigned views to use localized strings
2. Add any new strings to all three Localizable.strings files
3. Test the app in all supported languages
4. Ensure UI layout works well with different text lengths

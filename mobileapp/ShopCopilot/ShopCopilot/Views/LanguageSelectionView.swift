import SwiftUI

/// A view that allows the user to select the application's display language.
///
/// This view presents a list of available languages. When a language is selected,
/// it updates the "AppleLanguages" key in `UserDefaults`, which is the standard way
/// to signal preferred languages to the iOS system.
///
/// Note: For the language change to take full effect across the entire application,
/// a restart of the app is typically required. This view includes a notice about this.
/// The `ShopCopilotApp` attempts to refresh the UI by changing the `ContentView`'s ID.
struct LanguageSelectionView: View {
    // MARK: - Environment

    /// Presentation mode environment value, used to dismiss the view (when presented as a sheet).
    @Environment(\.presentationMode) var presentationMode

    // MARK: - State Variables

    /// A state variable to indicate whether a notice about needing an app restart should be shown.
    @State private var appNeedsRestart: Bool = false

    // MARK: - Nested Types

    /// Represents a language choice available to the user.
    /// `Identifiable` for use in `ForEach` loops.
    struct LanguageChoice: Identifiable {
        let id = UUID()         // Unique identifier for the choice.
        let nameKey: String    // Localization key for the language's display name.
        let code: String       // Standard language code (e.g., "en", "ja", "vi").
    }

    // MARK: - Properties

    /// The list of languages available for selection.
    let languages: [LanguageChoice] = [
        LanguageChoice(nameKey: "language_english", code: "en"),
        LanguageChoice(nameKey: "language_japanese", code: "ja"),
        LanguageChoice(nameKey: "language_vietnamese", code: "vi")
    ]

    // MARK: - Body

    var body: some View {
        NavigationView { // Provides a navigation bar for title and done button
            VStack(spacing: 20) {
                // View title
                Text(NSLocalizedString("language_selection_title", comment: "Language selection screen title"))
                    .font(.largeTitle)
                    .padding(.bottom, 30)

                // Buttons for each available language
                ForEach(languages) { lang in
                    Button(NSLocalizedString(lang.nameKey, comment: "Language name display in button")) {
                        changeLanguage(to: lang.code)
                    }
                    .padding()
                    .frame(maxWidth: .infinity) // Make buttons take full width
                    .background(Color.gray.opacity(0.2)) // Subtle background for buttons
                    .cornerRadius(8)
                }

                // Display a notice if a language change has been made
                if appNeedsRestart {
                    Text(NSLocalizedString("language_change_restart_notice", comment: "Notice that app needs restart for language change"))
                        .foregroundColor(.orange) // Use a distinct color for the notice
                        .multilineTextAlignment(.center)
                        .padding(.top)
                }

                Spacer() // Pushes content to the top
            }
            .padding() // Overall padding for the VStack
            .navigationBarTitleDisplayMode(.inline) // Keeps title small in sheet presentation
            .navigationBarItems(trailing: Button(NSLocalizedString("done_button", comment: "Done button text")) {
                presentationMode.wrappedValue.dismiss() // Dismiss the sheet
            })
        }
    }

    // MARK: - Private Methods

    /// Updates the application's preferred language setting in `UserDefaults`.
    ///
    /// - Parameter languageCode: The language code (e.g., "en", "ja") to set as preferred.
    private func changeLanguage(to languageCode: String) {
        // Set the "AppleLanguages" key in UserDefaults. This is the standard way
        // iOS uses to determine app language preference.
        UserDefaults.standard.set([languageCode], forKey: "AppleLanguages")
        UserDefaults.standard.synchronize() // Ensures the change is written to disk immediately.

        // Indicate that a restart notice should be shown.
        appNeedsRestart = true

        // Note: The ShopCopilotApp listens for UserDefaults.didChangeNotification
        // and attempts to refresh the UI by changing ContentView's ID.
        // However, a full app restart is often the most reliable way for all
        // UI elements and system services to pick up the new language.
    }
}

// MARK: - Previews

struct LanguageSelectionView_Previews: PreviewProvider {
    static var previews: some View {
        LanguageSelectionView()
    }
}

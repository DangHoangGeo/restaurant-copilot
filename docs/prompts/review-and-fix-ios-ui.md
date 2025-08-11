Title: Mobile UI localization audit — replace hardcoded strings with Localizable keys

Context:
- Follow the rules in CLAUDE.md (no hardcoded user-facing text; use "key".localized; ensure accessibility labels are localized).
- Localization file: mobile/SOder/SOder/localization/en.lproj/Localizable.strings.
- Use the app’s design system and do not add business logic to Views.

Task:
1) Discover scope
- Enumerate all SwiftUI UI files under mobile/SOder/**/*.swift.
- Focus on Views/Components only (skip models/managers).

2) Find hardcoded user-facing strings
- Search for and audit these patterns:
  - Text("..."), Label("...", systemImage:), Button("..."), Toggle("...", isOn:), Picker("...", selection:), Section(header: Text("..."), footer: Text("...")), NavigationTitle("...") or .navigationTitle("..."), ToolbarItem with text, Alert/ConfirmationDialog/Menu titles/messages/options, TextField("placeholder", text:), .accessibilityLabel("...") and .accessibilityHint("..."), .tabItem { Text("...") }, .sheet/.popover titles, any string passed to user-visible modifiers.
- Include string interpolations like "Hello \(name)" → convert to formatted localized strings.

3) Replace with localized keys
- If a suitable key exists in Localizable.strings, replace with "key".localized.
- If no key exists, add a new one to Localizable.strings:
  - Key format: feature_context_action (snake case), descriptive but concise.
  - Value equals the original English text.
  - Keep the file alphabetically organized and avoid duplicates.

4) Accessibility
- Ensure every interactive control (Button, Toggle, etc.) has .accessibilityLabel("key".localized) and, if needed, .accessibilityHint("key".localized).

5) Do not change design rules
- No hardcoded colors or fonts; keep existing DesignSystem usage intact.

6) Final checks
- Run a final sweep for any remaining hardcoded user-facing strings in Views:
  - Regex suggestions: Text\\("([^"]+)"\\)|\\.navigationTitle\\("([^"]+)"\\)|\\.accessibility(Label|Hint)\\("([^"]+)"\\)|Alert\\("([^"]+)"|message:\\s*Text\\("([^"]+)"\\)|ConfirmationDialog\\("([^"]+)"\\)|Button\\("([^"]+)"\\)|Toggle\\("([^"]+)"\\)|Picker\\("([^"]+)"\\)|TextField\\("([^"]+)"\\)
- Confirm no user-facing Text("...") remains without a .localized key.
- Validate that all keys used exist in Localizable.strings.

Deliverables:
- A concise report (markdown) with:
  - Files changed and a list of replaced strings per file (old text → key).
  - New keys added (key = "Value") and where used.
  - Any strings intentionally skipped (with reason).
- Apply edits to source files and to Localizable.strings.
- Assert: “No remaining hardcoded user-facing strings in SwiftUI Views.”
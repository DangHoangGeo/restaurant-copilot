# Printer UX + Encoding Implementation Plan

Owner: Mobile iOS
Date: 2025-08-09
Branch: ios-app-improvement-high-priority

Context
- Device: EPSON ESC/POS compatible
- UTF-8: Not supported
- Japanese: JIS X0208-1990 supported (Shift-JIS + Kanji mode)
- Chinese: Supported
- Requirement: Owner selects ONE receipt language; entire receipt (header, items, footer) prints in that language (no mixing per receipt)
- Supported app languages for printing: English (EN), Japanese (JA), Vietnamese (VI)
- Owner can choose language separately for: Kitchen tickets and Customer receipts
- Menu items have localized names (name_en, name_ja, name_vi). Notes are free text and may be in any language

Goals
1) Simplify setup and daily usage for restaurant owners
2) Make language output reliable: EN/JA/VI on non-UTF8 printers (with per-language fallbacks)
3) Reduce support load by auto-detecting and persisting per-printer capabilities
4) Ensure the selected language applies to all printed content for that job: header, item names, notes, and footer

Scope
- UX changes (PrinterSettingsView, UnifiedPrinterSetupView)
- Encoding pipeline changes (PrinterService/PrintFormatter/PrinterSettingsManager)
- Language testing and per-printer capability storage
- Non-breaking changes for existing users; migrations not required

Milestones

M1. UX Simplification (Setup-first)
- [ ] PrinterSettingsView: remove discovery/connect duplication; keep status + CTA to setup
- [ ] UnifiedPrinterSetupView: wizard-like grouping (Mode -> Printers -> Assign -> Test -> Done)
- [ ] Consolidate Add/Edit printer into a single component; reuse everywhere
- [ ] Demote Logs/Queue/Advanced from the primary path; keep links
- [ ] Language controls:
      - [ ] Receipt Language (EN/JA/VI) – applies to all receipts
      - [ ] Kitchen Ticket Language (EN/JA/VI) – applies to kitchen prints
      - [ ] Explain that the entire print uses the selected language; menu names localized accordingly; notes are best-effort

M2. Encoding Strategy (per printer, per target: kitchen vs receipt)
- [ ] Determine strategy by target and selected language
- [ ] Default rules per language:
      - English: Windows-1252 (CP1252) via ESC t 16; encode text with .windowsCP1252
      - Japanese: Shift-JIS with Kanji mode (FS & enter / FS . leave), optional ESC t 0x04
      - Vietnamese: try CP1258 (ESC t 27); if unsupported, fallback
- [ ] Notes (free text) handling:
      - Try to encode with the selected language’s encoding
      - If encoding fails or printer rejects:
        - Kitchen: apply diacritic/character fallbacks (ASCII-safe) to preserve speed/legibility
        - Receipt: rasterize the note line(s) to monochrome image and print as image (optional toggle)
- [ ] Ensure CRLF line endings in raw-text segments
- [ ] Avoid sending non-standard UTF-8 commands (ESC t 255) to this printer class

M3. Capability Detection and Tests
- [ ] Extend PrinterService.testPrintSample to probe per language: EN (CP1252), JA (Shift-JIS+Kanji), VI (CP1258)
- [ ] Persist results in PrinterSettingsManager.printerLanguageCapabilities by printer id
- [ ] Auto-select encodingStrategy per printer and per target after tests
- [ ] Provide "Test Again" on assigned printers and show EN/JA/VI badges (Supported/Fallback)

M4. Printing Pipeline Updates
- [ ] In Single mode, use active printer’s capability and the selected target language (receipt or kitchen)
- [ ] In Dual mode, use kitchen vs checkout printer capability respectively; each job uses its target’s selected language
- [ ] Introduce optional raster fallback for notes (and/or entire line) on receipts when selected language unsupported

M5. QA & Samples
- [ ] Add test actions to quickly print full EN/JA/VI sample receipts and kitchen tickets (entire print per language)
- [ ] Verify layout, line breaks (CRLF), and cuts
- [ ] Capture photos of real printer output and iterate

Technical Design Notes

A. ESC/POS sequences
- Init: ESC @ (1B 40)
- Alignment: ESC a n
- Font: GS ! n, Bold on/off, etc.
- Cut: GS V m
- JA Kanji mode (Epson):
  - Enter Kanji: FS &  (1C 26)
  - Cancel Kanji: FS . (1C 2E)
  - Use Shift-JIS bytes for content printed in Japanese
- Code page selection for legacy encodings:
  - EN (CP1252): ESC t 16
  - JA (Shift-JIS): ESC t 0x04 (when required) + Kanji mode on/off around content
  - VI (CP1258): ESC t 27

B. Encoding rules (single language per print target)
- Receipts: encode all text using selected Receipt Language; item names resolved from name_en/name_ja/name_vi
- Kitchen tickets: encode all text using selected Kitchen Ticket Language; item names resolved accordingly
- Notes: attempt encoding with target language rules; on failure apply fallback (kitchen ASCII-safe, receipt rasterize)
- Use CRLF "\r\n" for line ends in raw text blocks

C. Data flow changes
- PrinterSettingsManager:
  - Add selectedReceiptLanguage and selectedKitchenLanguage (PrintLanguage)
  - Store per-printer language capabilities and chosen strategies per target when relevant
  - Expose getters: getStrategy(for printerId, target: .receipt/.kitchen)
- PrintFormatter:
  - Load templates for the selected language (already supported)
  - Resolve menu item names/notes using the selected PrintLanguage per target
  - Provide helpers to wrap JA content with Kanji mode and to pre-process VI text (fallback mapping)
- PrinterService:
  - Pick charset/commands per selected language and target printer
  - Provide raster image print for fallback note lines

D. UI rules (per mobile rules)
- Use DesignSystem colors/fonts (no hardcoded colors/fonts). All text localized.
- Keep Views dumb; move logic into managers/services.

Open Questions
- Default behavior for VI receipts when CP1258 unsupported: auto-rasterize notes only or entire lines? Toggle in Advanced?
- Star printers support roadmap? (their Kanji/encodings differ)

Rollout
- Behind a feature flag: printer.encoding_v2
- Ship to a test group first; capture logs and photos

Appendix: Sample strings (full content per selected language)
- English: Fried noodles (Large) x2, Table A, Notes: no scallions
- Japanese: 焼きそば（大盛り）×2、テーブルA、備考：ネギ抜き
- Vietnamese: Phở bò tái chín, không hành, thêm quẩy

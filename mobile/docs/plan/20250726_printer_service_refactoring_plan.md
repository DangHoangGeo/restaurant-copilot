# Comprehensive Refactoring Plan: Printer Service, UI/UX, and Receipt Customization

## 1. Introduction

This document synthesizes our previous reviews and enhancements into a unified, step‑by‑step plan to:

* **Redefine requirements** for printer encoding, language support, and receipt customization.
* **Refactor the service layer** for robust multi‑language printing.
* **Redesign the SwiftUI interfaces** for an intuitive, modern UX.
* **Overhaul receipt templates** for professional, fully customizable layouts.

---

## 2. Revised Requirements

**A. Functional Requirements**

1. **Multi‐language Support**

   * Detect per‐printer support for English, Japanese, Vietnamese.
   * Fallback to English automatically if unsupported.
2. **Customizable Receipt Sections**

   * **Header**: restaurant name (title), address, phone, tax code.
   * **Footer**: thank‐you message, promotional text.
   * Persist custom header/footer in settings.
3. **Template Management**

   * Store separate `.txt` templates per language (`receipt_en`, `receipt_ja`, `receipt_vi`).
   * Support theme-based variants (standard, minimal, elegant).
4. **Printer Discovery & Configuration**

   * Network & Bluetooth scanning.
   * Add/Edit printers with validation (IP/port, timeout, retries).
   * Per-printer “language capability” flags.
5. **Live Preview & Testing**

   * Preview sample receipt in-app (monospaced text).
   * Test‐print buttons for connection & language samples.
6. **Print Queue & Logging**

   * View/manage pending, printing, failed, completed jobs.
   * Retry or clear jobs.
   * Show recent logs inline; All logs in modal.

**B. Non‑Functional Requirements**

* **Reliability**: robust encoding, error fallback, automatic charset resets.
* **Performance**: fast connection & print latency (<500 ms).
* **Maintainability**: modular code separation (Service / Formatter / UI).
* **Accessibility**: VoiceOver labels, dynamic type support.

---

## 3. Technical Architecture

### 3.1 Service Layer

* **Encoding**: unify on UTF‑8 (`ESC t 255`) by default; user override for legacy code pages.
* **Capability Detection**: new `PrinterService.testPrintSample(language:) → Bool`.
* **Fallback**: on encoding failure, strip diacritics or fall back to ASCII.
* **Commands**: send `setCharsetUTF8` before each job; re‑issue after style resets.

### 3.2 Template Engine

* **Multiple Templates**: load `receipt_template_<lang>_<theme>.txt` dynamically.
* **Variable Injection**: existing `TemplateRenderer`, extended with header/footer placeholders.
* **Style Tags**: preserve `[CENTER]`, `[BOLD]`, `[CUT]` across languages.

### 3.3 Settings Management

* **New Model**: add `supportedLanguages: [PrintLanguage: Bool]` to `PrinterSettingsManager` (persisted via UserDefaults).
* **Custom Header/Footer**: define `ReceiptCustomization` model (title, address, phone, taxCode, footerMessage).
* **Persistence**: load/save on change.

### 3.4 SwiftUI UI/UX

* **Single Settings Hub**: merge Add/Edit printer, language test, receipt customization into a unified `PrinterSettingsView`.
* **Language Picker**: segmented control with flag emojis; locked/unlocked states; test prompts on tap when unsupported.
* **Live Preview**: side-by-side monospaced preview that updates with language, header/footer edits.
* **Print Queue**: inline statistics, retry controls, log modal.
* **Professional Styling**: consistent spacing, icons, color cues (success/orange/warning).

---

## 4. UI/UX Flows

1. **Onboarding (First Launch)**

   * Scan printers → list found.
   * Add via network/Bluetooth → test connection.
   * Prompt: "Would you like to test Japanese print?" → record support.
   * Prompt: "Would you like to test Vietnamese print?" → record support.
2. **Settings**

   * **Printers** tab: list configured, default selection, Add/Edit/Delete.
   * **Language** tab: English (always), 🇯🇵 🇻🇳 (locked until test‐pass).
   * **Header/Footer** tab: fields for title, address, phone, tax code, footer text.
   * **Preview** embedded at bottom of Header/Footer screen.
3. **Receipt Customization**

   * Select theme (standard/minimal/elegant)
   * Edit template variables in a code editor with tooltips.
   * Preview → shows rendered receipt text.
4. **Printing**

   * “Print Test Receipt” & “Print Kitchen Test” buttons accessible globally.
   * On error, show inline message and suggest fallback to English.

---

## 5. Implementation Roadmap

| Phase                        | Tasks                                                                | Duration |
| ---------------------------- | -------------------------------------------------------------------- | -------- |
| **1: Requirements & Schema** | Finalize data models (`supportedLanguages`, `ReceiptCustomization`). | 1 week   |
| **2: Service Refactor**      | - Unify encoding → UTF‑8 default.                                    |          |

* Implement `testPrintSample(language:)`.
* Enhance `stringToData` with fallback. | 1 week |
  \| **3: Template & Formatter** | - Separate language templates.
* Extend placeholder processing for header/footer/tax code. | 2 weeks |
  \| **4: Settings Manager** | - Persist new fields.
* Migrate UserDefaults. | 1 week |
  \| **5: SwiftUI Redesign** | - Build unified `PrinterSettingsView`.
* Language picker with test prompts.
* Receipt preview.  | 2 weeks |
  \| **6: Integration & QA** | - End‑to‑end tests on EPSON/Star printers.
* Localization checks.  | 1 week |
  \| **7: Documentation & Rollout** | - Update README, onboarding tutorial.
* Release notes.  | 1 week |

**Total Estimated Duration: 9 weeks**

---

## 6. Success Criteria & Metrics

* **Garbled‐text reports** < 1% across languages.
* **Configuration time**: average < 2 minutes/user.
* **Positive UX feedback**: > 90% satisfaction in usability survey.

---

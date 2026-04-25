import Foundation

// MARK: - Template Renderer
class TemplateRenderer {
    
    // MARK: - Template Processing
    func render(template: String, data: [String: Any]) -> String {
        var result = template

        // Process loops and conditional sections like {{#items}}...{{/items}} or {{#restaurant.phone}}...{{/restaurant.phone}}
        result = processInverseSections(in: result, with: data)
        result = processSections(in: result, with: data)

        // Replace simple placeholders like {{order.id}}
        result = replacePlaceholders(in: result, with: data)

        return result
    }
    
    // MARK: - Private Methods
    private func replacePlaceholders(in template: String, with data: [String: Any]) -> String {
        var result = template
        
        // Find all {{placeholder}} patterns
        let placeholderPattern = "\\{\\{([^}]+)\\}\\}"
        let regex = try! NSRegularExpression(pattern: placeholderPattern, options: [])
        let matches = regex.matches(in: result, options: [], range: NSRange(result.startIndex..., in: result))
        
        // Replace placeholders from back to front to avoid index shifting
        for match in matches.reversed() {
            let placeholderRange = match.range
            let keyRange = match.range(at: 1)
            
            if let keyNSRange = Range(keyRange, in: result),
               let placeholderNSRange = Range(placeholderRange, in: result) {
                let key = String(result[keyNSRange])
                let value = getDisplayString(for: key, from: data)
                result.replaceSubrange(placeholderNSRange, with: value)
            }
        }
        
        return result
    }
    
    // Support array sections and simple conditionals (truthy values)
    private func processSections(in template: String, with data: [String: Any]) -> String {
        var result = template
        
        // Find all {{#key}}...{{/key}} patterns
        let sectionPattern = "\\{\\{#([^}]+)\\}\\}([\\s\\S]*?)\\{\\{/\\1\\}\\}"
        let regex = try! NSRegularExpression(pattern: sectionPattern, options: [])
        let matches = regex.matches(in: result, options: [], range: NSRange(result.startIndex..., in: result))
        
        for match in matches.reversed() {
            let fullRange = match.range
            let keyRange = match.range(at: 1)
            let contentRange = match.range(at: 2)
            
            guard let keyNSRange = Range(keyRange, in: result),
                  let contentNSRange = Range(contentRange, in: result),
                  let fullNSRange = Range(fullRange, in: result) else { continue }
            
            let key = String(result[keyNSRange])
            let contentTemplate = String(result[contentNSRange])
            
            if let raw = getRawValue(for: key, from: data) {
                if let array = raw as? [[String: Any]] {
                    // Array section: render content for each item
                    var rendered = ""
                    for item in array {
                        rendered += replacePlaceholders(in: contentTemplate, with: item)
                    }
                    result.replaceSubrange(fullNSRange, with: rendered)
                } else if let boolVal = raw as? Bool {
                    // Boolean: render if true
                    let rendered = boolVal ? replacePlaceholders(in: contentTemplate, with: data) : ""
                    result.replaceSubrange(fullNSRange, with: rendered)
                } else if let strVal = raw as? String {
                    // String: render if non-empty
                    let rendered = strVal.isEmpty ? "" : replacePlaceholders(in: contentTemplate, with: data)
                    result.replaceSubrange(fullNSRange, with: rendered)
                } else if let numVal = raw as? NSNumber {
                    // Numbers: render if non-zero
                    let rendered = numVal.doubleValue == 0 ? "" : replacePlaceholders(in: contentTemplate, with: data)
                    result.replaceSubrange(fullNSRange, with: rendered)
                } else {
                    // Unsupported type: remove section
                    result.replaceSubrange(fullNSRange, with: "")
                }
            } else {
                // Key not found: remove section
                result.replaceSubrange(fullNSRange, with: "")
            }
        }
        
        return result
    }

    private func processInverseSections(in template: String, with data: [String: Any]) -> String {
        var result = template

        let sectionPattern = "\\{\\{\\^([^}]+)\\}\\}([\\s\\S]*?)\\{\\{/\\1\\}\\}"
        let regex = try! NSRegularExpression(pattern: sectionPattern, options: [])
        let matches = regex.matches(in: result, options: [], range: NSRange(result.startIndex..., in: result))

        for match in matches.reversed() {
            let fullRange = match.range
            let keyRange = match.range(at: 1)
            let contentRange = match.range(at: 2)

            guard let keyNSRange = Range(keyRange, in: result),
                  let contentNSRange = Range(contentRange, in: result),
                  let fullNSRange = Range(fullRange, in: result) else { continue }

            let key = String(result[keyNSRange])
            let contentTemplate = String(result[contentNSRange])
            let shouldRender = shouldRenderInverseSection(for: key, from: data)
            let rendered = shouldRender ? replacePlaceholders(in: contentTemplate, with: data) : ""
            result.replaceSubrange(fullNSRange, with: rendered)
        }

        return result
    }
    
    // MARK: - Data helpers
    private func getRawValue(for key: String, from data: [String: Any]) -> Any? {
        let keys = key.split(separator: ".").map(String.init)
        var current: Any = data
        for keyComponent in keys {
            if let dict = current as? [String: Any], let next = dict[keyComponent] {
                current = next
            } else {
                return nil
            }
        }
        return current
    }
    
    private func getDisplayString(for key: String, from data: [String: Any]) -> String {
        // Handle nested keys like "order.id"
        if let raw = getRawValue(for: key, from: data) {
            if let stringValue = raw as? String { return stringValue }
            if let intValue = raw as? Int { return String(intValue) }
            if let doubleValue = raw as? Double { return String(format: "%.0f", doubleValue) }
            if let boolValue = raw as? Bool { return boolValue ? "true" : "false" }
            return String(describing: raw)
        }
        return ""
    }

    private func shouldRenderInverseSection(for key: String, from data: [String: Any]) -> Bool {
        guard let raw = getRawValue(for: key, from: data) else {
            return true
        }

        if let boolValue = raw as? Bool {
            return !boolValue
        }

        if let stringValue = raw as? String {
            return stringValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }

        if let arrayValue = raw as? [Any] {
            return arrayValue.isEmpty
        }

        if let numberValue = raw as? NSNumber {
            return numberValue.doubleValue == 0
        }

        return false
    }
}

// MARK: - Template Format Processor
class TemplateFormatProcessor {
    private let escPosPrinter = ESCPOSPrinter()
    
    func processFormatTags(in text: String, encoding: String.Encoding, charsetCommand: [UInt8] = []) -> Data {
        var result = text
        var commands = Data()
        
        // Add initialization commands
        commands.append(escPosPrinter.initializePrinter())
        commands.append(Data(charsetCommand))
        
        let shouldCut = result.contains("[CUT]")

        // Process special layout tags before command tags.
        result = result.replacingOccurrences(of: "[SEPARATOR]", with: String(repeating: "-", count: 48) + "\r\n")
        result = result.replacingOccurrences(of: "[CUT]", with: "")
        result = processRowColumns(in: result)

        appendFormattedText(result, to: &commands, encoding: encoding)

        if shouldCut {
            commands.append(Data([0x1B, 0x4A, 0x0C]))
            commands.append(escPosPrinter.cutPaper())
        }

        return commands
    }

    private func appendFormattedText(_ text: String, to commands: inout Data, encoding: String.Encoding) {
        var cursor = text.startIndex

        while cursor < text.endIndex {
            guard let tagStart = text[cursor...].firstIndex(of: "["),
                  let tagEnd = text[tagStart...].firstIndex(of: "]") else {
                appendPlainText(String(text[cursor...]), to: &commands, encoding: encoding)
                break
            }

            if tagStart > cursor {
                appendPlainText(String(text[cursor..<tagStart]), to: &commands, encoding: encoding)
            }

            let token = String(text[tagStart...tagEnd])
            appendCommand(for: token, to: &commands)
            cursor = text.index(after: tagEnd)
        }
    }

    private func appendPlainText(_ text: String, to commands: inout Data, encoding: String.Encoding) {
        guard !text.isEmpty else { return }
        if let data = text.data(using: encoding) {
            commands.append(data)
        } else if let fallback = text.data(using: .ascii, allowLossyConversion: true) {
            commands.append(fallback)
        }
    }

    private func appendCommand(for token: String, to commands: inout Data) {
        switch token {
        case "[CENTER]":
            commands.append(escPosPrinter.alignCenter())
        case "[/CENTER]", "[/RIGHT]":
            commands.append(escPosPrinter.alignLeft())
        case "[RIGHT]":
            commands.append(escPosPrinter.alignRight())
        case "[LEFT]", "[/LEFT]":
            commands.append(escPosPrinter.alignLeft())
        case "[BOLD]":
            commands.append(escPosPrinter.boldOn())
        case "[/BOLD]":
            commands.append(escPosPrinter.boldOff())
        case "[LARGE]":
            commands.append(escPosPrinter.doubleHeight())
        case "[WIDE]":
            commands.append(escPosPrinter.doubleWidth())
        case "[/LARGE]", "[/WIDE]":
            commands.append(escPosPrinter.normalSize())
        default:
            appendPlainText(token, to: &commands, encoding: .utf8)
        }
    }
    
    private func processRowColumns(in text: String) -> String {
        var result = text
        
        // Simple row/column processing
        result = result.replacingOccurrences(of: "[ROW]", with: "")
        result = result.replacingOccurrences(of: "[/ROW]", with: "\n")
        
        // Process column layout (simplified)
        let columnPattern = "\\[COL_LEFT\\](.*?)\\[/COL_LEFT\\].*?\\[COL_RIGHT\\](.*?)\\[/COL_RIGHT\\]"
        let regex = try! NSRegularExpression(pattern: columnPattern, options: [])
        let matches = regex.matches(in: result, options: [], range: NSRange(result.startIndex..., in: result))
        
        for match in matches.reversed() {
            if let matchRange = Range(match.range, in: result),
               let leftRange = Range(match.range(at: 1), in: result),
               let rightRange = Range(match.range(at: 2), in: result) {
                
                let leftContent = String(result[leftRange])
                let rightContent = String(result[rightRange])
                
                // Simple column formatting (pad to 48 characters total)
                let formatted = formatColumns(left: leftContent, right: rightContent, totalWidth: 48)
                result.replaceSubrange(matchRange, with: formatted)
            }
        }
        
        return result
    }
    
    private func formatColumns(left: String, right: String, totalWidth: Int) -> String {
        let leftTrimmed = left.trimmingCharacters(in: .whitespacesAndNewlines)
        let rightTrimmed = right.trimmingCharacters(in: .whitespacesAndNewlines)
        
        let spacesNeeded = max(1, totalWidth - leftTrimmed.count - rightTrimmed.count)
        let spaces = String(repeating: " ", count: spacesNeeded)
        
        return leftTrimmed + spaces + rightTrimmed
    }
}

// MARK: - ESC/POS Printer Commands
class ESCPOSPrinter {
    private let ESC: UInt8 = 0x1B
    private let GS: UInt8 = 0x1D
    
    func initializePrinter() -> Data {
        return Data([ESC, 0x40]) // Initialize printer
    }
    
    func alignLeft() -> Data {
        return Data([ESC, 0x61, 0x00])
    }
    
    func alignCenter() -> Data {
        return Data([ESC, 0x61, 0x01])
    }
    
    func alignRight() -> Data {
        return Data([ESC, 0x61, 0x02])
    }
    
    func boldOn() -> Data {
        return Data([ESC, 0x45, 0x01])
    }
    
    func boldOff() -> Data {
        return Data([ESC, 0x45, 0x00])
    }
    
    func doubleHeight() -> Data {
        return Data([GS, 0x21, 0x01])
    }
    
    func doubleWidth() -> Data {
        return Data([GS, 0x21, 0x10])
    }
    
    func normalSize() -> Data {
        return Data([GS, 0x21, 0x00])
    }
    
    func cutPaper() -> Data {
        return Data([GS, 0x56, 0x00])
    }
}

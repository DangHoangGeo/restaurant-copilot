import Foundation

class PrintFormatter {
    private let printerCmd = Config.PrinterCommands.self

    func formatOrderForKitchen(order: Order) -> Data? {
        var command = Data()
        command.append(Data(printerCmd.initialize))
        command.append(Data(printerCmd.alignCenter))
        command.append(Data(printerCmd.fontSizeDoubleWidthAndHeight))
        command.append("\nTable: \(order.tableId)\n".data(using: .ascii)!)
        command.append(Data(printerCmd.resetTextStyles))
        command.append(Data(printerCmd.alignLeft))
        for item in order.items {
            command.append(item.menuItemName.data(using: .ascii)!)
            command.append(" x\(item.quantity)\n".data(using: .ascii)!)
            if let notes = item.notes, !notes.isEmpty {
                command.append("  \(notes)\n".data(using: .ascii)!)
            }
        }
        command.append(Data(printerCmd.lineFeed))
        command.append(Data(printerCmd.cutPaperPartial))
        return command
    }
}

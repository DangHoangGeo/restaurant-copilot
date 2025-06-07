import Foundation
import Network

enum PrinterError: Error, LocalizedError {
    case connectionFailed(Error)
    case sendFailed(Error)
    case notConnected
    case configurationError(String)

    var errorDescription: String? {
        switch self {
        case .connectionFailed(let err):
            return "Printer connection failed: \(err.localizedDescription)"
        case .sendFailed(let err):
            return "Failed to send data to printer: \(err.localizedDescription)"
        case .notConnected:
            return "Not connected to the printer."
        case .configurationError(let msg):
            return "Printer configuration error: \(msg)"
        }
    }
}

class PrinterService {
    static let shared = PrinterService()
    private var connection: NWConnection?

    private let printerConfig = Config.kitchenPrinter

    private init() {}

    func connectAndSendData(data: Data) async throws {
        guard !printerConfig.ipAddress.isEmpty, printerConfig.port > 0 else {
            throw PrinterError.configurationError("Printer IP Address or Port is not configured.")
        }

        let host = NWEndpoint.Host(printerConfig.ipAddress)
        guard let port = NWEndpoint.Port(rawValue: UInt16(printerConfig.port)) else {
            throw PrinterError.configurationError("Invalid printer port number.")
        }

        let newConnection = NWConnection(host: host, port: port, using: .tcp)
        self.connection = newConnection

        return try await withCheckedThrowingContinuation { continuation in
            newConnection.stateUpdateHandler = { [weak self] newState in
                guard let self = self else { return }
                switch newState {
                case .ready:
                    self.send(connection: newConnection, data: data) { error in
                        if let error = error {
                            continuation.resume(throwing: error)
                        } else {
                            continuation.resume()
                        }
                        self.disconnect(connection: newConnection)
                    }
                case .failed(let error):
                    continuation.resume(throwing: PrinterError.connectionFailed(error))
                    self.connection = nil
                case .cancelled:
                    self.connection = nil
                default:
                    break
                }
            }
            newConnection.start(queue: .global(qos: .background))
        }
    }

    private func send(connection: NWConnection, data: Data, completion: @escaping (PrinterError?) -> Void) {
        guard connection.state == .ready else {
            completion(.notConnected)
            return
        }
        connection.send(content: data, completion: .contentProcessed { error in
            if let error = error {
                completion(.sendFailed(error))
            } else {
                completion(nil)
            }
        })
    }

    private func disconnect(connection: NWConnection) {
        connection.cancel()
        if self.connection === connection {
            self.connection = nil
        }
    }
}

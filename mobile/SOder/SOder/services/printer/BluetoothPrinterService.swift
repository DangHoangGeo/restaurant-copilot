import Foundation
import CoreBluetooth

// MARK: - Bluetooth Printer Service
class BluetoothPrinterService: NSObject, ObservableObject {
    static let shared = BluetoothPrinterService()
    
    private var centralManager: CBCentralManager?
    private var printerPeripheral: CBPeripheral?
    private var writableCharacteristic: CBCharacteristic?
    
    @Published var isScanning = false
    @Published var isConnected = false
    @Published var discoveredPeripherals: [CBPeripheral] = []
    @Published var connectionStatus = "Disconnected"
    
    private let targetPrinterName = "Printer" // Configure based on your printer
    
    override init() {
        super.init()
        centralManager = CBCentralManager(delegate: self, queue: nil)
    }
    
    // MARK: - Public Methods
    func startScan() {
        guard centralManager?.state == .poweredOn else {
            print("Bluetooth is not powered on")
            return
        }
        
        isScanning = true
        discoveredPeripherals.removeAll()
        centralManager?.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        
        // Stop scan after timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
            if self?.isScanning == true {
                self?.stopScan()
            }
        }
    }
    
    func stopScan() {
        centralManager?.stopScan()
        isScanning = false
    }
    
    func connect(to peripheral: CBPeripheral) {
        if let currentPeripheral = printerPeripheral, currentPeripheral != peripheral {
            centralManager?.cancelPeripheralConnection(currentPeripheral)
        }
        
        printerPeripheral = peripheral
        centralManager?.connect(peripheral, options: nil)
        connectionStatus = "Connecting..."
    }
    
    func disconnect() {
        if let peripheral = printerPeripheral {
            centralManager?.cancelPeripheralConnection(peripheral)
        }
        isConnected = false
        connectionStatus = "Disconnected"
        writableCharacteristic = nil
        printerPeripheral = nil
    }
    
    func printData(_ data: Data) -> Bool {
        guard let peripheral = printerPeripheral,
              peripheral.state == .connected,
              let characteristic = writableCharacteristic else {
            print("Bluetooth printer not connected or characteristic not found")
            return false
        }
        
        let writeType: CBCharacteristicWriteType = characteristic.properties.contains(.write) ? .withResponse : .withoutResponse
        let maxWriteLength = peripheral.maximumWriteValueLength(for: writeType)
        
        var offset = 0
        while offset < data.count {
            let chunkSize = min(maxWriteLength, data.count - offset)
            let chunk = data.subdata(in: offset..<(offset + chunkSize))
            peripheral.writeValue(chunk, for: characteristic, type: writeType)
            offset += chunkSize
        }
        
        return true
    }
}

// MARK: - CBCentralManagerDelegate
extension BluetoothPrinterService: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        switch central.state {
        case .poweredOn:
            print("Bluetooth is powered on")
        case .poweredOff:
            isConnected = false
            connectionStatus = "Bluetooth Off"
        case .resetting:
            connectionStatus = "Bluetooth Resetting"
        case .unauthorized:
            connectionStatus = "Bluetooth Unauthorized"
        case .unknown:
            connectionStatus = "Bluetooth Unknown"
        case .unsupported:
            connectionStatus = "Bluetooth Unsupported"
        @unknown default:
            connectionStatus = "Bluetooth Unknown State"
        }
    }
    
    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        if !discoveredPeripherals.contains(where: { $0.identifier == peripheral.identifier }) {
            discoveredPeripherals.append(peripheral)
        }
        
        // Auto-connect if name matches target
        if let name = peripheral.name, name.contains(targetPrinterName) {
            stopScan()
            connect(to: peripheral)
        }
    }
    
    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        isConnected = true
        connectionStatus = "Connected to \(peripheral.name ?? "Unknown")"
        peripheral.delegate = self
        peripheral.discoverServices(nil)
    }
    
    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        isConnected = false
        connectionStatus = "Connection Failed"
        print("Failed to connect: \(error?.localizedDescription ?? "Unknown error")")
    }
    
    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        isConnected = false
        connectionStatus = "Disconnected"
        writableCharacteristic = nil
        printerPeripheral = nil
    }
}

// MARK: - CBPeripheralDelegate
extension BluetoothPrinterService: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        guard let services = peripheral.services else { return }
        
        for service in services {
            peripheral.discoverCharacteristics(nil, for: service)
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        guard let characteristics = service.characteristics else { return }
        
        for characteristic in characteristics {
            if characteristic.properties.contains(.write) || characteristic.properties.contains(.writeWithoutResponse) {
                if writableCharacteristic == nil {
                    writableCharacteristic = characteristic
                    print("Found writable characteristic: \(characteristic.uuid)")
                }
            }
        }
    }
    
    func peripheral(_ peripheral: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
        if let error = error {
            print("Write error: \(error.localizedDescription)")
        } else {
            print("Successfully wrote to characteristic")
        }
    }
}
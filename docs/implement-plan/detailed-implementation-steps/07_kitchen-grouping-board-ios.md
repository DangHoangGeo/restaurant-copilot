### 7. Kitchen Grouping Board & Printing

7.1. **KitchenBoardView\.swift (iPad Layout)**

```swift
import SwiftUI

struct KitchenBoardView: View {
  @ObservedObject var orderService: OrderService
  @State private var groupedItems: [GroupedItem] = []

  var body: some View {
    ScrollView {
      LazyVGrid(columns: [GridItem(.adaptive(minimum: 200))]) {
        ForEach(groupedItems) { group in
          VStack(alignment: .leading, spacing: 8) {
            Text(group.itemName).font(.headline)
            Text("Qty: \(group.quantity)").font(.subheadline)
            Text("Tables: \(group.tables.joined(separator: ", "))")
              .font(.footnote)
            Button("Mark Done") {
              markGroupDone(group)
            }
            .buttonStyle(.bordered)
          }
          .padding()
          .background(Color(UIColor.systemGray6))
          .cornerRadius(8)
        }
      }
      .padding()
    }
    .navigationTitle("Kitchen Board")
    .onAppear(perform: computeGrouping)
  }

  func computeGrouping() {
    let cutoff = Date().addingTimeInterval(-600) // last 10 min
    var temp: [String: GroupedItem] = [:]
    for order in orderService.activeOrders {
      if order.createdAt >= cutoff {
        for item in order.items {
          let key = item.menuItemId
          if temp[key] == nil {
            temp[key] = GroupedItem(
              itemId: item.menuItemId,
              itemName: item.menuItemName,
              quantity: item.quantity,
              tables: Set([order.tableId])
            )
          } else {
            temp[key]!.quantity += item.quantity
            temp[key]!.tables.insert(order.tableId)
          }
        }
      }
    }
    groupedItems = Array(temp.values)
  }

  func markGroupDone(_ group: GroupedItem) {
    Task {
      // Option: fetch all orders containing this itemId within the cutoff,
      // then call updateOrderStatus(orderId, "completed") for each.
      PrinterManager.shared.printGroupedSummary(group: group)
      computeGrouping()
    }
  }
}

struct GroupedItem: Identifiable {
  let id = UUID()
  let itemId: String
  let itemName: String
  var quantity: Int
  var tables: Set<String>
}
```

(Req 6.5)

* The grouping occurs on orders with `status ∈ {"new", "preparing"}` in the last 10 minutes.
* Test on an actual iPad simulator or device by placing multiple similar orders (e.g. two “Ramen” orders 5 minutes apart) and verify that the card shows `Qty: 3` if you placed 2 + 1.

7.2. **PrinterManager.swift (ESC/POS Over Bluetooth)**

```swift
import CoreBluetooth
import Foundation

class PrinterManager: NSObject, ObservableObject {
  static let shared = PrinterManager()
  private var centralManager: CBCentralManager!
  private var discoveredPeripheral: CBPeripheral?
  private var writeCharacteristic: CBCharacteristic?

  override init() {
    super.init()
    centralManager = CBCentralManager(delegate: self, queue: nil)
  }

  func connectToPrinter() {
    centralManager.scanForPeripherals(withServices: [CBUUID(string: "ESC_POS_SERVICE_UUID")], options: nil)
  }

  func printReceipt(order: Order) {
    guard let characteristic = writeCharacteristic else { return }
    let receiptData = buildReceipt(order: order)
    send(data: receiptData, to: characteristic)
  }

  func printGroupedSummary(group: GroupedItem) {
    guard let characteristic = writeCharacteristic else { return }
    var summary = "Grouped Items Summary\n"
    summary += "\(group.itemName) x\(group.quantity)\n"
    summary += "Tables: \(group.tables.joined(separator: ", "))\n"
    summary += "---------------------\n"
    send(data: Data(summary.utf8), to: characteristic)
  }

  private func buildReceipt(order: Order) -> Data {
    var text = ""
    text += "Order ID: \(order.id)\n"
    text += "Table: \(order.tableId)\n"
    text += "Date: \(Date(), formatter: DateFormatter())\n"
    text += "---------------------\n"
    for item in order.items {
      text += "\(item.menuItemName) x\(item.quantity)\n"
    }
    text += "---------------------\n"
    text += "Total: ¥\(order.totalAmount, specifier: "%.2f")\n"
    text += "Thank You!\n"
    return Data(text.utf8)
  }

  private func send(data: Data, to characteristic: CBCharacteristic) {
    discoveredPeripheral?.writeValue(data, for: characteristic, type: .withResponse)
  }
}

extension PrinterManager: CBCentralManagerDelegate, CBPeripheralDelegate {
  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    if central.state == .poweredOn {
      // Ready to scan
    }
  }

  func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    discoveredPeripheral = peripheral
    central.stopScan()
    central.connect(peripheral, options: nil)
    peripheral.delegate = self
  }

  func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
    peripheral.discoverServices([CBUUID(string: "ESC_POS_SERVICE_UUID")])
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
    if let services = peripheral.services {
      for service in services {
        peripheral.discoverCharacteristics([CBUUID(string: "ESC_POS_CHAR_UUID")], for: service)
      }
    }
  }

  func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    if let characteristics = service.characteristics {
      for char in characteristics {
        if char.uuid == CBUUID(string: "ESC_POS_CHAR_UUID") {
          writeCharacteristic = char
        }
      }
    }
  }
}
```

(Req 6.6)

* Replace `"ESC_POS_SERVICE_UUID"` and `"ESC_POS_CHAR_UUID"` with the actual UUIDs of your ESC/POS printer.
* Test by running on a physical iPhone or iPad with Bluetooth turned on and pairing to a supported thermal printer. Use `PrinterSetupView` (next) to scan and connect.

7.3. **Printer Setup View**

* Create `PrinterSetupView.swift` to scan and list available ESC/POS printers:

  ```swift
  import SwiftUI

  struct PrinterSetupView: View {
    @ObservedObject var printerManager = PrinterManager.shared
    @State private var discoveredPrinters: [CBPeripheral] = []

    var body: some View {
      VStack {
        Button("Scan for Printers") {
          printerManager.connectToPrinter()
        }
        .padding()

        List(discoveredPrinters, id: \.identifier) { peripheral in
          HStack {
            Text(peripheral.name ?? "Unnamed")
            Spacer()
            Button("Connect") {
              // trigger connection
            }
          }
        }

        Button("Test Print") {
          let dummyOrder = Order(... ) // create a dummy Order
          printerManager.printReceipt(order: dummyOrder)
        }
      }
      .navigationTitle("Printer Setup")
      .onReceive(printerManager.$discoveredPeripheral) { peripheral in
        if let p = peripheral {
          discoveredPrinters.append(p)
        }
      }
    }
  }
  ```

  (Req 6.6)
* Verify that scanning finds nearby printers, connecting works, and “Test Print” actually prints a short sample.
  ‣ (Req 6.6)

---

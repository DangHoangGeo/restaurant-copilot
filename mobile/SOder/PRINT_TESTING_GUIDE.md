# Print System Testing Guide

## Overview
The SOder POS app now includes a comprehensive print system with queue management, template customization, and receipt encoding support. This guide explains how to test the new print functionality.

## Testing Methods

### 1. Test Receipt Printing
The easiest way to test the print system is using the built-in test receipt functionality:

#### Method 1: From Printer Settings
1. Open the app and navigate to **Settings** → **Printer Settings**
2. Make sure your printer is configured (IP address and port)
3. Tap **"Test Connection"** to verify basic connectivity
4. Use the **"Test Print"** button to send a test receipt

#### Method 2: From Print Queue
1. Navigate to **Printer Settings** → **Print Queue**
2. Tap **"Test Print"** to add a test job to the queue
3. The queue will process the job automatically

### 2. Test Kitchen Order Printing
To test kitchen order printing:

#### Using Queue System (Recommended)
```swift
// In your code, you can test with:
Task {
    do {
        try await PrinterService.shared.queueKitchenOrder(sampleOrder)
        print("Kitchen order queued successfully")
    } catch {
        print("Failed to queue kitchen order: \(error)")
    }
}
```

#### Direct Print (Legacy)
```swift
// For immediate printing without queue:
Task {
    do {
        try await PrinterService.shared.printKitchenOrder(sampleOrder)
        print("Kitchen order printed successfully")
    } catch {
        print("Failed to print kitchen order: \(error)")
    }
}
```

### 3. Test Customer Receipt Printing
To test customer receipt printing:

#### Using Queue System
```swift
Task {
    do {
        try await PrinterService.shared.queueCustomerReceipt(sampleOrder, isOfficial: false)
        print("Customer receipt queued successfully")
    } catch {
        print("Failed to queue customer receipt: \(error)")
    }
}
```

#### Direct Print
```swift
Task {
    do {
        try await PrinterService.shared.printCustomerReceipt(sampleOrder, isOfficial: false)
        print("Customer receipt printed successfully")
    } catch {
        print("Failed to print customer receipt: \(error)")
    }
}
```

### 4. Test Dual Printer Setup
If you have two printers (kitchen and checkout):

1. Configure both printers in **Printer Settings**
2. Set printer mode to **"Dual Printer"**
3. Test each printer individually:
   - Kitchen: `PrinterService.shared.testKitchenPrinter()`
   - Checkout: `PrinterService.shared.testCheckoutPrinter()`

### 5. Test Print Queue Management
The print queue system allows you to:

1. **View Queue Status**: Navigate to **Printer Settings** → **Print Queue**
2. **Monitor Jobs**: See pending, processing, and completed jobs
3. **Clear Queue**: Use the clear button to remove all jobs
4. **Retry Failed Jobs**: Tap on failed jobs to retry them

## Configuration Testing

### 1. Receipt Customization
Test the new receipt customization features:

1. Navigate to **Printer Settings** → **Receipt Customization**
2. Try different **Receipt Templates**:
   - Default Template
   - Custom Template (if implemented)
3. Test different **Encoding Options**:
   - UTF-8 (default)
   - Shift-JIS (for Japanese printers)
   - Other encodings as needed

### 2. Print Language Settings
Test multilingual printing:

1. Go to **Printer Settings** → **Print Language**
2. Switch between:
   - English
   - Japanese
   - Vietnamese
3. Print a test receipt to verify language changes

### 3. Receipt Header Configuration
Test receipt header customization:

1. Navigate to **Printer Settings** → **Receipt Header**
2. Modify:
   - Restaurant Name
   - Address
   - Phone Number
3. Print a test receipt to verify changes

## Troubleshooting Common Issues

### Connection Issues
- **Error**: "Printer not connected"
  - **Solution**: Check IP address and port in printer settings
  - **Solution**: Ensure printer is on the same network
  - **Solution**: Try the "Test Connection" button

### Queue Issues
- **Error**: "Print queue is full"
  - **Solution**: Clear the print queue or wait for jobs to complete
  - **Solution**: Check if printer is responding

### Encoding Issues
- **Error**: Garbled text on receipts
  - **Solution**: Try different encoding settings (UTF-8, Shift-JIS)
  - **Solution**: Check if printer supports the selected encoding

### Template Issues
- **Error**: Receipt format looks incorrect
  - **Solution**: Verify template files are correctly placed
  - **Solution**: Check template syntax and formatting

## Sample Test Orders

You can create sample orders for testing:

```swift
// Create a sample order for testing
let sampleOrder = Order(
    id: "TEST-001",
    table_id: 1,
    guest_count: 2,
    status: .confirmed,
    order_items: [
        OrderItem(
            id: "ITEM-001",
            menu_item_id: "menu_001",
            quantity: 2,
            status: .pending,
            notes: "Extra spicy"
        ),
        OrderItem(
            id: "ITEM-002", 
            menu_item_id: "menu_002",
            quantity: 1,
            status: .pending,
            notes: nil
        )
    ],
    total_amount: 1500.0,
    createdAt: Date()
)
```

## Performance Testing

### Load Testing
Test the system under load:

1. Queue multiple print jobs simultaneously
2. Monitor queue processing time
3. Check for memory leaks or crashes

### Network Testing
Test network resilience:

1. Test with slow network connections
2. Test with intermittent connectivity
3. Test printer offline scenarios

## Advanced Testing

### Custom Templates
If you want to test custom templates:

1. Create template files in the app bundle
2. Use the template system in `TemplateRenderer`
3. Test variable substitution and formatting

### Error Handling
Test error scenarios:

1. Disconnect printer during print job
2. Send malformed data
3. Test timeout scenarios
4. Test concurrent print operations

## Monitoring and Debugging

### Debug Output
Check the Xcode console for debug messages:
- Connection status
- Print job progress
- Error messages
- Queue status

### Print Queue Monitoring
Use the Print Queue view to monitor:
- Job status
- Processing time
- Error details
- Queue depth

## Best Practices

1. **Always test connectivity** before printing
2. **Use the queue system** for better reliability
3. **Handle errors gracefully** in your app
4. **Monitor queue status** regularly
5. **Test different printer models** for compatibility

## Supported Printer Types

The system has been tested with:
- Thermal receipt printers (ESC/POS compatible)
- Network-enabled printers
- USB printers (through network print servers)

## Next Steps

After testing, consider:
1. Implementing automatic retry mechanisms
2. Adding printer discovery features
3. Creating custom receipt templates
4. Adding more encoding options
5. Implementing print job scheduling

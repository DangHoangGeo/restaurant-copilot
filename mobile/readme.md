## OrdersView and KitchenBoardView fetch data separately at app launch

### Separate OrderManager Instances
Both views create their own separate instances of OrderManager:
OrdersView.swift:
```
struct OrdersView: View {
    @StateObject private var orderManager = OrderManager()
    // ...
}
```

KitchenBoardView.swift:
```
struct KitchenBoardView: View {
    @StateObject private var orderManager = OrderManager()
    // ...
}
```

#### Each OrderManager Fetches Data Independently
When the app launches, both views have their own lifecycle:
1. OrdersView → Creates OrderManager instance #1 → Fetches data in .task{}
2. KitchenBoardView → Creates OrderManager instance #2 → Fetches data in .task{}

#### Each OrderManager instance:
- Establishes its own realtime subscription
- Fetches data independently via fetchActiveOrders()
- Maintains its own @Published properties (orders, allOrders, etc.)

#### Data Synchronization
- While they don't share the same data instance, they stay synchronized because:
1. Same Database Source: Both fetch from the same Supabase tables
2. Realtime Subscriptions: Both listen to the same database changes
3. Identical Filters: Both use restaurant_id filtering and status filtering

```
// Both OrderManager instances set up identical subscriptions
realtimeChannel = supabaseManager.client.realtimeV2.channel("orders-\(restaurantId)")
```

Why This Architecture?
This design has both advantages and potential inefficiencies:

✅ Advantages:
Independence: Each view manages its own data state
Reliability: If one subscription fails, the other continues working
Simplicity: No complex shared state management needed

⚠️ Potential Issues:
Duplicate Network Calls: Two identical API calls at startup
Double Subscription: Two realtime channels for the same data
Memory Usage: Two copies of the same order data in memory

#### Alternative Architecture
A more efficient approach would be to share a single OrderManager instance:
```
// In ContentView or App level
@StateObject private var sharedOrderManager = OrderManager()

// Pass to both views
OrdersView()
    .environmentObject(sharedOrderManager)
KitchenBoardView()  
    .environmentObject(sharedOrderManager)
```

But the current approach works reliably for the restaurant's needs, and the data volume is typically manageable for a single restaurant's orders.
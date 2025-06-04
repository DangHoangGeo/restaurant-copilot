import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, FlatList, Switch, Appearance } from 'react-native';
// Using react-native-vector-icons for icons, common in React Native projects
// For this demo, we'll use placeholder components if icons aren't directly renderable in this environment.
// In a real RN project, you'd install: npm install react-native-vector-icons
// and link it: react-native link react-native-vector-icons
// For lucide-react-native: npm install lucide-react-native
import { Archive, Bell, CheckCircle, ChevronRight, Circle, Clock, Coffee, CreditCard, DollarSign, Edit2, HardDrive, List, LogOut, Menu, Package, Percent, Phone, PlusCircle, Printer, QrCode, Settings, ShoppingCart, Sliders, Tag, Users, Wifi, WifiOff, XCircle, Zap, Layers, ClipboardList, LayoutGrid, AlertTriangle, Info, X, Check, ChevronDown, ChevronUp, Trash2, Edit } from 'lucide-react-native';

const Icon = ({ name, size = 24, color = '#333' }) => {
  // In a real app, 'name' would map to a specific icon component from a library
  // For this environment, we'll use Lucide components directly.
  const IconComponent = name;
  if (!IconComponent) return <Text style={{fontSize: size, color}}>(?)</Text>; // Fallback
  return <IconComponent size={size} color={color} strokeWidth={2} />;
};


// Theme Context & Hooks
const ThemeContext = createContext();

const lightColors = {
  background: '#F0F0F7', // Light grey
  surface: '#FFFFFF',    // White
  primary: '#007AFF',    // iOS Blue
  secondary: '#5856D6',  // iOS Purple (can be an accent)
  text: '#000000',
  subtext: '#8A8A8E',    // iOS Grey for secondary text
  border: '#C7C7CC',
  success: '#34C759',    // iOS Green
  warning: '#FF9500',    // iOS Orange
  error: '#FF3B30',      // iOS Red
  disabled: '#D1D1D6',
  activeTab: '#007AFF',
  inactiveTab: '#8A8A8E',
  groupedItemBackground: '#E5E5EA', // Light grey for grouped items
  kitchenCardHeader: '#EFEFF4',
};

const darkColors = {
  background: '#000000',
  surface: '#1C1C1E',     // Dark grey (iOS system dark)
  primary: '#0A84FF',     // iOS Blue (dark mode variant)
  secondary: '#5E5CE6',   // iOS Purple (dark mode variant)
  text: '#FFFFFF',
  subtext: '#8D8D93',     // iOS Grey (dark mode variant)
  border: '#3A3A3C',
  success: '#30D158',     // iOS Green (dark mode variant)
  warning: '#FF9F0A',     // iOS Orange (dark mode variant)
  error: '#FF453A',       // iOS Red (dark mode variant)
  disabled: '#505054',
  activeTab: '#0A84FF',
  inactiveTab: '#8D8D93',
  groupedItemBackground: '#2C2C2E', // Darker grey for grouped items
  kitchenCardHeader: '#1C1C1E',
};

const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(Appearance.getColorScheme() === 'dark');
  
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setIsDarkMode(colorScheme === 'dark');
    });
    return () => subscription.remove();
  }, []);

  const colors = isDarkMode ? darkColors : lightColors;
  const theme = { isDarkMode, colors, toggleTheme: () => setIsDarkMode(!isDarkMode) };

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

const useTheme = () => useContext(ThemeContext);

// Mock Data
const MOCK_ORDERS_STAFF = [
  { id: 'S1001', table: 'T5', type: 'Dine-in', status: 'New', timestamp: '10:30 AM', total: 45.25, items: [{id: 'item1', name: 'Spring Rolls', qty: 2, notes: 'Extra crispy'}, {id: 'item3', name: 'Grilled Salmon', qty: 1}], printed: false, notificationType: 'new' },
  { id: 'S1002', customerName: 'John D.', type: 'Takeaway', status: 'Preparing', timestamp: '10:35 AM', total: 22.00, items: [{id: 'item4', name: 'Pasta Carbonara', qty: 1}], printed: true, notificationType: 'update' },
  { id: 'S1003', table: 'T2', type: 'Dine-in', status: 'Ready', timestamp: '10:40 AM', total: 18.75, items: [{id: 'item5', name: 'Steak Frites', qty: 1, notes: 'Medium rare'}], printed: true, notificationType: 'ready' },
  { id: 'S1004', table: 'T8', type: 'Dine-in', status: 'New', timestamp: '10:42 AM', total: 62.00, items: [{id: 'item3', name: 'Grilled Salmon', qty: 2}, {id: 'item6', name: 'Lava Cake', qty: 2}], printed: false },
  { id: 'S1005', customerName: 'Sarah K.', type: 'Takeaway', status: 'New', timestamp: '10:45 AM', total: 15.50, items: [{id: 'item7', name: 'Lemonade', qty: 1}, {id: 'item2', name: 'Bruschetta', qty: 1, notes: 'No garlic'}], printed: false },
];

const MOCK_KITCHEN_GROUPS = [
    { 
        id: 'group1', 
        itemName: 'Grilled Salmon', 
        totalQuantity: 3, 
        orders: [
            { orderId: 'S1001', table: 'T5', quantity: 1, notes: '' },
            { orderId: 'S1004', table: 'T8', quantity: 2, notes: '' },
        ],
        status: 'Pending' // Pending, Preparing, Completed
    },
    { 
        id: 'group2', 
        itemName: 'Spring Rolls', 
        totalQuantity: 2, 
        orders: [
            { orderId: 'S1001', table: 'T5', quantity: 2, notes: 'Extra crispy' }
        ],
        status: 'Preparing'
    },
    { 
        id: 'group3', 
        itemName: 'Pasta Carbonara', 
        totalQuantity: 1, 
        orders: [
            { orderId: 'S1002', customerName: 'John D.', quantity: 1, notes: '' }
        ],
        status: 'Completed'
    },
     { 
        id: 'group4', 
        itemName: 'Bruschetta', 
        totalQuantity: 1, 
        orders: [
            { orderId: 'S1005', customerName: 'Sarah K.', quantity: 1, notes: 'No garlic' }
        ],
        status: 'Pending'
    },
];


// Common UI Components
const AppButton = ({ title, onPress, type = 'primary', icon, style, textStyle, disabled = false }) => {
  const { colors } = useTheme();
  const buttonStyles = {
    primary: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    secondary: { backgroundColor: colors.surface, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderWidth: 1, borderColor: colors.primary },
    danger: { backgroundColor: colors.error, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    ghost: { backgroundColor: 'transparent', paddingVertical: 10, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  };
  const textStyles = {
    primary: { color: colors.surface, fontSize: 17, fontWeight: '600' },
    secondary: { color: colors.primary, fontSize: 17, fontWeight: '600' },
    danger: { color: colors.surface, fontSize: 17, fontWeight: '600' },
    ghost: { color: colors.primary, fontSize: 16, fontWeight: '500' },
  };

  const currentStyle = disabled ? {...buttonStyles[type], backgroundColor: colors.disabled} : buttonStyles[type];
  const currentTextStyle = disabled ? {...textStyles[type], color: colors.subtext} : textStyles[type];

  return (
    <TouchableOpacity onPress={onPress} style={[currentStyle, style]} disabled={disabled}>
      {icon && <Icon name={icon} size={20} color={currentTextStyle.color} style={{ marginRight: title ? 8 : 0 }} />}
      {title && <Text style={[currentTextStyle, textStyle]}>{title}</Text>}
    </TouchableOpacity>
  );
};

const CardView = ({ children, style }) => {
  const { colors } = useTheme();
  return (
    <View style={[{ backgroundColor: colors.surface, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, marginBottom: 12 }, style]}>
      {children}
    </View>
  );
};

const ScreenContainer = ({ children, style }) => {
  const { colors } = useTheme();
  return <ScrollView style={[{ flex: 1, backgroundColor: colors.background }, style]} contentContainerStyle={{ paddingBottom: 20 }}>{children}</ScrollView>;
};

const Header = ({ title }) => {
  const { colors } = useTheme();
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
      <Text style={{ fontSize: 22, fontWeight: 'bold', color: colors.text }}>{title}</Text>
    </View>
  );
};

// Order Management Screen
const OrderManagementScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [orders, setOrders] = useState(MOCK_ORDERS_STAFF);
  const [activeFilter, setActiveFilter] = useState('New');

  const statusColors = {
    New: colors.primary,
    Preparing: colors.warning,
    Ready: colors.success,
    Completed: colors.subtext,
  };

  const updateOrderStatus = (orderId, newStatus) => {
    setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, status: newStatus, printed: newStatus !== 'New' ? true : o.printed } : o));
    // TODO: Add real-time feedback/notification for kitchen
  };

  const printOrder = (orderId) => {
    setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? { ...o, printed: true } : o));
    // TODO: Implement actual printing logic
    alert(`Printing order ${orderId}... (Mock)`);
  };

  const renderOrderItem = ({ item }) => (
    <CardView style={{ marginHorizontal: 16 }}>
      <TouchableOpacity onPress={() => navigation.navigate('OrderDetail', { order: item })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>Order {item.id} ({item.table || item.customerName})</Text>
          <Text style={{ fontSize: 14, color: colors.subtext }}>{item.timestamp}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: statusColors[item.status] || colors.disabled, marginRight: 8 }} />
          <Text style={{ fontSize: 16, fontWeight: '600', color: statusColors[item.status] || colors.disabled }}>{item.status}</Text>
          <Text style={{ fontSize: 16, color: colors.text, marginLeft: 'auto' }}>${item.total.toFixed(2)}</Text>
        </View>
        <Text style={{ fontSize: 14, color: colors.subtext, marginBottom: 12 }}>
          {item.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
          {item.status === 'New' && <AppButton title="Accept" onPress={() => updateOrderStatus(item.id, 'Preparing')} type="ghost" icon={Check} />}
          {item.status === 'Preparing' && <AppButton title="Mark Ready" onPress={() => updateOrderStatus(item.id, 'Ready')} type="ghost" icon={Coffee} />}
          {item.status === 'Ready' && <AppButton title="Checkout" onPress={() => navigation.navigate('Checkout', { order: item })} type="ghost" icon={DollarSign} />}
          <AppButton title={item.printed ? "Re-Print" : "Print"} onPress={() => printOrder(item.id)} type="ghost" icon={Printer} />
        </View>
         {item.notificationType && (
            <View style={{position: 'absolute', top: 8, right: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: item.notificationType === 'new' ? colors.primary : item.notificationType === 'update' ? colors.warning : colors.success }}>
                <Text style={{color: colors.surface, fontSize: 10, fontWeight: 'bold'}}>{item.notificationType.toUpperCase()}</Text>
            </View>
        )}
      </TouchableOpacity>
    </CardView>
  );
  
  const filters = ['New', 'Preparing', 'Ready', 'Completed'];
  const filteredOrders = orders.filter(o => activeFilter === 'All' || o.status === activeFilter);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Incoming Orders" />
      <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        {filters.map(filter => (
          <TouchableOpacity key={filter} onPress={() => setActiveFilter(filter)} style={{ paddingVertical: 8, paddingHorizontal:12, borderBottomWidth: activeFilter === filter ? 2 : 0, borderBottomColor: colors.primary }}>
            <Text style={{ color: activeFilter === filter ? colors.primary : colors.subtext, fontWeight: activeFilter === filter ? 'bold' : 'normal' }}>{filter}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {filteredOrders.length > 0 ? (
        <FlatList
            data={filteredOrders}
            renderItem={renderOrderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingTop: 10 }}
        />
      ) : (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Icon name={Archive} size={48} color={colors.subtext} />
            <Text style={{marginTop: 16, fontSize: 18, color: colors.subtext}}>No {activeFilter !== 'All' ? activeFilter.toLowerCase() : ''} orders.</Text>
        </View>
      )}
    </View>
  );
};

// Kitchen Grouping Display Screen
const KitchenGroupingScreen = () => {
  const { colors } = useTheme();
  const [groupedItems, setGroupedItems] = useState(MOCK_KITCHEN_GROUPS);
  const [timeframe, setTimeframe] = useState(15); // minutes

  const updateGroupStatus = (groupId, newStatus) => {
    setGroupedItems(prevGroups => prevGroups.map(g => g.id === groupId ? { ...g, status: newStatus } : g));
  };

  const renderGroupCard = ({ item }) => (
    <CardView style={{ width: Dimensions.get('window').width * 0.8, marginRight: 16, backgroundColor: colors.groupedItemBackground }}>
      <View style={{ paddingBottom: 8, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.kitchenCardHeader, margin: -16, marginBottom: 8, padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>{item.itemName}</Text>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.primary, marginTop: 4 }}>Total: {item.totalQuantity}</Text>
      </View>
      
      {item.orders.map(order => (
        <View key={order.orderId} style={{ marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.border + '50' }}>
          <Text style={{ fontSize: 15, fontWeight: '500', color: colors.text }}>
            {order.quantity}x for {order.table || order.customerName || 'Unknown'} (Order {order.orderId})
          </Text>
          {order.notes && <Text style={{ fontSize: 13, color: colors.warning, fontStyle: 'italic', marginTop: 2 }}>Note: {order.notes}</Text>}
        </View>
      ))}

      <View style={{ marginTop: 'auto', paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border }}>
        {item.status === 'Pending' && <AppButton title="Start Preparing" onPress={() => updateGroupStatus(item.id, 'Preparing')} icon={Zap} />}
        {item.status === 'Preparing' && <AppButton title="Mark Completed" onPress={() => updateGroupStatus(item.id, 'Completed')} type="secondary" icon={CheckCircle} />}
        {item.status === 'Completed' && <Text style={{ fontSize: 16, fontWeight: '600', color: colors.success, textAlign: 'center' }}>Completed <Icon name={CheckCircle} size={18} color={colors.success}/></Text>}
      </View>
    </CardView>
  );

  // Filter out completed items for the main display, or have a separate section for them
  const activeGroups = groupedItems.filter(g => g.status !== 'Completed');
  const completedGroups = groupedItems.filter(g => g.status === 'Completed');


  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Kitchen Production" />
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Text style={{color: colors.text, fontSize: 16}}>Grouping Window: {timeframe} mins</Text>
        <AppButton title="Adjust" onPress={() => alert("Adjust timeframe (Mock)")} type="ghost" size="sm" icon={Sliders}/>
      </View>
      {activeGroups.length > 0 ? (
        <FlatList
          data={activeGroups}
          renderItem={renderGroupCard}
          keyExtractor={item => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 20 }}
        />
      ) : (
        <View style={{flex:1, justifyContent:'center', alignItems:'center', padding: 20}}>
            <Icon name={Coffee} size={48} color={colors.subtext} />
            <Text style={{marginTop:16, fontSize:18, color:colors.subtext, textAlign:'center'}}>All items prepared! Time for a break?</Text>
        </View>
      )}

      {completedGroups.length > 0 && (
        <View style={{paddingHorizontal: 16, marginTop: 20}}>
            <Text style={{fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 10}}>Recently Completed</Text>
            {completedGroups.slice(0,3).map(item => ( // Show a few recent ones
                <CardView key={item.id} style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: 0.7}}>
                    <Text style={{fontSize: 16, color: colors.subtext}}>{item.itemName} (x{item.totalQuantity})</Text>
                    <Icon name={CheckCircle} size={20} color={colors.success} />
                </CardView>
            ))}
        </View>
      )}
    </View>
  );
};

// Checkout Screen
const CheckoutScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const order = route.params?.order || { id: 'N/A', total: 0, items: [] }; // Fallback for direct navigation
  const [paymentMethod, setPaymentMethod] = useState('Card'); // Card, Cash
  const [tipAmount, setTipAmount] = useState(0);
  const [customTip, setCustomTip] = useState('');

  const subtotal = order.total;
  const calculatedTip = customTip ? parseFloat(customTip) : tipAmount;
  const totalAmount = subtotal + (isNaN(calculatedTip) ? 0 : calculatedTip);

  const handlePayment = () => {
    // TODO: Implement actual payment processing & receipt printing
    alert(`Processing ${paymentMethod} payment for $${totalAmount.toFixed(2)} for Order ${order.id}... (Mock)`);
    // Update order status to 'Completed' or 'Paid'
    // navigation.goBack(); // Or navigate to a success screen
    navigation.navigate('OrderManagement'); // Go back to order list
  };

  const tipPercentages = [0.15, 0.18, 0.20];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title={`Checkout: Order ${order.id}`} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <CardView>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 10 }}>Order Summary</Text>
          {order.items.map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ fontSize: 16, color: colors.text }}>{item.qty}x {item.name}</Text>
              {/* <Text style={{ fontSize: 16, color: colors.text }}>${(item.price * item.qty).toFixed(2)}</Text> */}
            </View>
          ))}
          <View style={{ borderTopWidth: 1, borderTopColor: colors.border, marginTop: 10, paddingTop: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>Subtotal</Text>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>${subtotal.toFixed(2)}</Text>
            </View>
          </View>
        </CardView>

        <CardView>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>Add Tip</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
            {tipPercentages.map(p => (
              <AppButton 
                key={p}
                title={`${(p*100).toFixed(0)}%`} 
                onPress={() => { setTipAmount(subtotal * p); setCustomTip(''); }}
                type={tipAmount === subtotal * p && !customTip ? 'primary' : 'secondary'}
                style={{flex: 1, marginHorizontal: 4}}
              />
            ))}
             <AppButton 
                title="Custom" 
                onPress={() => { setTipAmount(0); /* Focus input or show modal */ }}
                type={customTip ? 'primary' : 'secondary'}
                style={{flex: 1, marginHorizontal: 4}}
              />
          </View>
          {/* Basic custom tip input, could be improved with a proper TextInput component */}
          {/* For now, custom tip is conceptual or would require a modal */}
          <Text style={{ fontSize: 16, color: colors.text, textAlign: 'right', marginBottom: 10 }}>
            Tip Amount: ${isNaN(calculatedTip) ? '0.00' : calculatedTip.toFixed(2)}
          </Text>
        </CardView>

        <CardView>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 12 }}>Payment Method</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
            <AppButton title="Card" onPress={() => setPaymentMethod('Card')} type={paymentMethod === 'Card' ? 'primary' : 'secondary'} icon={CreditCard} style={{flex:1, marginRight:8}}/>
            <AppButton title="Cash" onPress={() => setPaymentMethod('Cash')} type={paymentMethod === 'Cash' ? 'primary' : 'secondary'} icon={DollarSign} style={{flex:1, marginLeft:8}}/>
          </View>
          {paymentMethod === 'Card' && <Text style={{fontSize: 14, color: colors.subtext, textAlign: 'center'}}>Connect card reader or enter manually (Mock).</Text>}
        </CardView>

        <View style={{ marginTop: 20, paddingVertical:10, borderTopWidth:1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>Total Due</Text>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>${totalAmount.toFixed(2)}</Text>
            </View>
            <AppButton title={`Pay $${totalAmount.toFixed(2)}`} onPress={handlePayment} type="primary" style={{paddingVertical: 18}} textStyle={{fontSize: 20}}/>
        </View>
      </ScrollView>
    </View>
  );
};

// Settings Screen
const SettingsScreen = () => {
  const { colors, isDarkMode, toggleTheme } = useTheme();
  const [printerStatus, setPrinterStatus] = useState('Connected'); // Connected, Disconnected, Error
  const [autoPrintKitchen, setAutoPrintKitchen] = useState(true);
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);

  const printerStatusColors = {
    Connected: colors.success,
    Disconnected: colors.warning,
    Error: colors.error,
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <CardView>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 10 }}>Printer</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 16, color: colors.text }}>Status: <Text style={{ color: printerStatusColors[printerStatus], fontWeight:'bold' }}>{printerStatus}</Text></Text>
            <AppButton title={printerStatus === 'Connected' ? "Disconnect" : "Connect"} onPress={() => alert("Connect/Disconnect Printer (Mock)")} type="ghost" icon={printerStatus === 'Connected' ? WifiOff : Wifi}/>
          </View>
          <AppButton title="Test Print" onPress={() => alert("Test Print (Mock)")} type="secondary" icon={Printer}/>
        </CardView>

        <CardView>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 10 }}>Printing Rules</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingVertical: 8 }}>
            <Text style={{ fontSize: 16, color: colors.text }}>Auto-print Kitchen Tickets</Text>
            <Switch value={autoPrintKitchen} onValueChange={setAutoPrintKitchen} trackColor={{ false: colors.disabled, true: colors.primary }} thumbColor={colors.surface} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 16, color: colors.text }}>Auto-print Customer Receipts</Text>
            <Switch value={autoPrintReceipt} onValueChange={setAutoPrintReceipt} trackColor={{ false: colors.disabled, true: colors.primary }} thumbColor={colors.surface} />
          </View>
        </CardView>
        
        <CardView>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 10 }}>Appearance</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ fontSize: 16, color: colors.text }}>Dark Mode</Text>
            <Switch value={isDarkMode} onValueChange={toggleTheme} trackColor={{ false: colors.disabled, true: colors.primary }} thumbColor={colors.surface} />
          </View>
        </CardView>

        <CardView>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginBottom: 10 }}>Account</Text>
          <AppButton title="Logout" onPress={() => alert("Logout (Mock)")} type="danger" icon={LogOut}/>
        </CardView>
      </ScrollView>
    </View>
  );
};

// Dummy OrderDetailScreen for navigation example
const OrderDetailScreen = ({ route }) => {
  const { colors } = useTheme();
  const order = route.params?.order || {};
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
      <Header title={`Order Details: ${order.id}`} />
      <Text style={{color: colors.text, fontSize: 18, marginTop: 10}}>Table/Customer: {order.table || order.customerName}</Text>
      <Text style={{color: colors.text, fontSize: 16, marginTop: 5}}>Status: {order.status}</Text>
      <Text style={{color: colors.text, fontSize: 16, marginTop: 5}}>Total: ${order.total?.toFixed(2)}</Text>
      <Text style={{color: colors.text, fontSize: 16, marginTop: 10, fontWeight: 'bold'}}>Items:</Text>
      {order.items?.map((item, index) => (
        <Text key={index} style={{color: colors.text, fontSize: 15, marginLeft: 10}}>- {item.qty}x {item.name} {item.notes ? `(${item.notes})` : ''}</Text>
      ))}
    </View>
  );
};


// Tab Navigator (Conceptual - React Navigation would be used in a real app)
const TabNavigator = () => {
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('Orders');

  const renderScreen = () => {
    // This is a simplified navigation for demo purposes.
    // In a real app, use React Navigation library.
    const MockNavigation = { navigate: (screen, params) => {
        if (screen === 'Checkout') setActiveTab('Checkout');
        if (screen === 'OrderDetail') setActiveTab('OrderDetail');
        // Store params if needed for the Checkout/OrderDetail dummy screen
        global.mockNavParams = params; 
    }, goBack: () => setActiveTab('Orders')};


    switch (activeTab) {
      case 'Orders': return <OrderManagementScreen navigation={MockNavigation} />;
      case 'Kitchen': return <KitchenGroupingScreen />;
      case 'Checkout': return <CheckoutScreen route={{ params: global.mockNavParams }} navigation={MockNavigation} />;
      case 'OrderDetail': return <OrderDetailScreen route={{ params: global.mockNavParams }} navigation={MockNavigation} />;
      case 'Settings': return <SettingsScreen />;
      default: return <OrderManagementScreen navigation={MockNavigation} />;
    }
  };

  const TabItem = ({ name, iconName, label }) => (
    <TouchableOpacity 
      onPress={() => setActiveTab(name)} 
      style={{ flex: 1, alignItems: 'center', paddingVertical: 10, borderTopWidth: activeTab === name ? 2 : 0, borderTopColor: colors.primary }}
    >
      <Icon name={iconName} size={26} color={activeTab === name ? colors.activeTab : colors.inactiveTab} />
      <Text style={{ fontSize: 10, color: activeTab === name ? colors.activeTab : colors.inactiveTab, marginTop: 2 }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>{renderScreen()}</View>
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>
        <TabItem name="Orders" iconName={ClipboardList} label="Orders" />
        <TabItem name="Kitchen" iconName={Layers} label="Kitchen View" />
        {/* Checkout might be a modal or full screen pushed onto stack, not always a tab */}
        {/* <TabItem name="Checkout" iconName={DollarSign} label="Checkout" /> */}
        <TabItem name="Settings" iconName={Settings} label="Settings" />
      </View>
    </View>
  );
};


// Main App Component
const App = () => {
  return (
    <ThemeProvider>
      <TabNavigator />
    </ThemeProvider>
  );
};

export default App;

// Basic Styles (can be expanded)
const styles = StyleSheet.create({
  // Add any global styles if needed, though most are inline for theming
});


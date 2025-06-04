import React, { useState, useEffect, createContext, useContext } from 'react';
import {
  BarChart2, Briefcase, Calendar, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Coffee, CreditCard, DollarSign, Edit2, Eye, FileText, Filter, Grid, Home, LogOut, Menu as MenuIcon, MessageSquare, Moon, MoreVertical, Package, Percent, Phone, PlusCircle, Printer, QrCode, RefreshCw, Search, Settings, ShoppingBag, ShoppingCart, Sun, Trash2, TrendingUp, Truck, Users, UserPlus, X, Zap, Star, MapPin, Edit, List, LayoutGrid, ClipboardList, UserCog, Palette, Type, Smile, ThumbsUp, AlertTriangle, Info, Mail, User, Lock, XCircle
} from 'lucide-react'; // Added CreditCard, User, Lock, Mail, XCircle

// Mock Data
const MOCK_RESTAURANT_INFO = {
  name: "The Gourmet Place",
  address: "123 Culinary Ave, Foodville",
  phone: "555-1234",
  hours: "Mon-Sat: 11am - 10pm, Sun: 12pm - 8pm",
  description: "Serving the finest local ingredients with a modern twist. Join us for an unforgettable dining experience.",
  logoUrl: "https://placehold.co/100x100/3B82F6/FFFFFF?text=GP", // Placeholder logo
  primaryColor: '#3B82F6', // Tailwind blue-500
  secondaryColor: '#10B981', // Tailwind emerald-500
};

const MOCK_MENU_CATEGORIES = [
  { id: 'cat1', name: 'Starters', order: 1, items: [
    { id: 'item1', name: 'Spring Rolls', description: 'Crispy fried rolls with vegetable filling.', price: 8.99, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Spring+Rolls', available: true },
    { id: 'item2', name: 'Bruschetta', description: 'Toasted bread topped with fresh tomatoes, garlic, and basil.', price: 10.50, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Bruschetta', available: true },
  ]},
  { id: 'cat2', name: 'Main Courses', order: 2, items: [
    { id: 'item3', name: 'Grilled Salmon', description: 'Served with roasted vegetables and lemon butter sauce.', price: 22.00, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Salmon', available: true },
    { id: 'item4', name: 'Pasta Carbonara', description: 'Classic Italian pasta with creamy egg sauce, pancetta, and Parmesan.', price: 18.75, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Pasta', available: false },
    { id: 'item5', name: 'Steak Frites', description: 'Grilled sirloin steak with a side of crispy french fries.', price: 25.50, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Steak', available: true },
  ]},
  { id: 'cat3', name: 'Desserts', order: 3, items: [
    { id: 'item6', name: 'Chocolate Lava Cake', description: 'Warm chocolate cake with a molten center.', price: 9.00, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Cake', available: true },
  ]},
  { id: 'cat4', name: 'Drinks', order: 4, items: [
    { id: 'item7', name: 'Fresh Lemonade', description: 'Homemade lemonade.', price: 4.50, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Lemonade', available: true },
    { id: 'item8', name: 'Craft Beer', description: 'Selection of local craft beers.', price: 7.00, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Beer', available: true },
  ]},
];

const MOCK_ORDERS = [
  { id: 'order1', table: 'Table 5', type: 'Dine-in', status: 'New', timestamp: '10:30 AM', total: 45.25, items: [{ name: 'Grilled Salmon', qty: 1 }, { name: 'Spring Rolls', qty: 2 }] },
  { id: 'order2', customerName: 'John D.', type: 'Takeaway', status: 'Preparing', timestamp: '10:35 AM', total: 22.00, items: [{ name: 'Pasta Carbonara', qty: 1 }] },
  { id: 'order3', table: 'Table 2', type: 'Dine-in', status: 'Ready', timestamp: '10:40 AM', total: 18.75, items: [{ name: 'Steak Frites', qty: 1 }] },
  { id: 'order4', customerName: 'Jane S.', type: 'Takeaway', status: 'Completed', timestamp: '10:20 AM', total: 12.50, items: [{ name: 'Fresh Lemonade', qty: 2 }] },
];

const MOCK_TABLES = [
  { id: 't1', name: 'Table 1', status: 'Available', capacity: 4 },
  { id: 't2', name: 'Table 2', status: 'Occupied', capacity: 2, currentOrder: 'order3' },
  { id: 't3', name: 'Table 3', status: 'Reserved', capacity: 6, reservationTime: '7:00 PM' },
  { id: 't4', name: 'Table 4', status: 'Available', capacity: 4 },
  { id: 't5', name: 'Patio 1', status: 'Occupied', capacity: 2, currentOrder: 'order1' },
  { id: 't6', name: 'Bar Seat 1', status: 'Available', capacity: 1 },
  { id: 't7', name: 'Bar Seat 2', status: 'Available', capacity: 1 },
  { id: 't8', name: 'Booth 1', status: 'Reserved', capacity: 5, reservationTime: '8:00 PM' },
];

const MOCK_EMPLOYEES = [
  { id: 'emp1', name: 'Alice Smith', role: 'Manager', email: 'alice@example.com', phone: '555-0101', schedule: { Mon: '9am-5pm', Tue: '9am-5pm', Wed: 'OFF', Thu: '9am-5pm', Fri: '9am-5pm'} },
  { id: 'emp2', name: 'Bob Johnson', role: 'Chef', email: 'bob@example.com', phone: '555-0102', schedule: { Mon: '10am-6pm', Tue: '10am-6pm', Wed: '10am-6pm', Thu: 'OFF', Fri: '10am-6pm'} },
  { id: 'emp3', name: 'Carol Williams', role: 'Server', email: 'carol@example.com', phone: '555-0103', schedule: { Tue: '5pm-10pm', Wed: '5pm-10pm', Fri: '5pm-11pm', Sat: '5pm-11pm'} },
];

// Theme Context
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light'); // 'light' or 'dark'
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

// Helper Components
const Icon = ({ name, size = 20, className = "" }) => {
  const IconComponent = name;
  if (!IconComponent) {
    console.warn(`Icon: component for "${name}" is undefined.`);
    return <Smile size={size} className={className} />; // Fallback icon
  }
  return <IconComponent size={size} className={className} />;
};

const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', iconLeft, iconRight, type = 'button', disabled = false }) => {
  const baseStyle = "font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ease-in-out inline-flex items-center justify-center";
  const variantStyles = {
    primary: `bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-blue-400 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    secondary: `bg-slate-200 hover:bg-slate-300 text-slate-700 focus:ring-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:focus:ring-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    danger: `bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-400 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    ghost: `bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400 dark:hover:bg-slate-700 dark:text-slate-200 dark:focus:ring-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
  };
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`} disabled={disabled}>
      {iconLeft && <Icon name={iconLeft} size={size === 'sm' ? 16 : 20} className="mr-2" />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 20} className="ml-2" />}
    </button>
  );
};

const Card = ({ children, className = '', noPadding = false }) => {
  return (
    <div className={`bg-white dark:bg-slate-800 shadow-lg rounded-xl ${noPadding ? '' : 'p-4 sm:p-6'} ${className}`}>
      {children}
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full h-full rounded-none',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className={`w-full ${sizeClasses[size]} overflow-y-auto max-h-[90vh]`} noPadding>
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <Button onClick={onClose} variant="ghost" size="sm" iconLeft={X} />
        </div>
        <div className="p-4">
          {children}
        </div>
      </Card>
    </div>
  );
};

const Input = ({ label, type = 'text', placeholder, value, onChange, name, className = '', required = false, iconLeft }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>}
      <div className="relative">
        {iconLeft && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon name={iconLeft} className="text-slate-400" /></div>}
        <input
          type={type}
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100 ${iconLeft ? 'pl-10' : ''}`}
        />
      </div>
    </div>
  );
};

const Textarea = ({ label, placeholder, value, onChange, name, className = '', required = false, rows = 3 }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>}
      <textarea
        id={name}
        name={name}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        rows={rows}
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
      />
    </div>
  );
};

const Select = ({ label, value, onChange, name, children, className = '', required = false }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>}
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-slate-100"
      >
        {children}
      </select>
    </div>
  );
};

const Alert = ({ message, type = 'info', onClose }) => {
  const alertStyles = {
    info: "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300",
    success: "bg-green-100 border-green-500 text-green-700 dark:bg-green-900 dark:border-green-700 dark:text-green-300",
    warning: "bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-300",
    error: "bg-red-100 border-red-500 text-red-700 dark:bg-red-900 dark:border-red-700 dark:text-red-300",
  };
  const IconType = {
    info: Info,
    success: CheckCircle,
    warning: AlertTriangle,
    error: XCircle, 
  };
  const CurrentIcon = IconType[type] || Info;

  return (
    <div className={`border-l-4 p-4 rounded-md shadow-md ${alertStyles[type]} flex items-start`} role="alert">
      <Icon name={CurrentIcon} className="mr-3 mt-0.5" />
      <div className="flex-grow">
        <p className="font-medium">{type.charAt(0).toUpperCase() + type.slice(1)}</p>
        <p className="text-sm">{message}</p>
      </div>
      {onClose && (
        <Button onClick={onClose} variant="ghost" size="sm" className="ml-auto -mr-1 -mt-1">
          <Icon name={X} size={16} />
        </Button>
      )}
    </div>
  );
};

// Admin Layout Components
const AdminHeader = ({ toggleSidebar, currentViewName }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-30">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" onClick={toggleSidebar} className="lg:hidden mr-2">
            <Icon name={MenuIcon} />
          </Button>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{currentViewName}</h1>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" onClick={toggleTheme} aria-label="Toggle theme">
            <Icon name={theme === 'light' ? Moon : Sun} />
          </Button>
          <div className="relative">
            <Button variant="ghost" className="flex items-center">
              <img src="https://placehold.co/32x32/E2E8F0/334155?text=A" alt="Admin" className="w-8 h-8 rounded-full mr-2" />
              <span className="hidden sm:inline">Admin User</span>
              <Icon name={ChevronDown} size={16} className="ml-1 hidden sm:inline" />
            </Button>
            {/* Dropdown menu (example) - currently hidden by default */}
            {/* <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-md shadow-lg py-1 hidden group-focus-within:block">
              <a href="#" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">Profile</a>
              <a href="#" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">Settings</a>
              <a href="#" className="block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-600">Logout</a>
            </div> */}
          </div>
        </div>
      </div>
    </header>
  );
};

const AdminSidebar = ({ currentView, setView, isOpen, setIsOpen }) => {
  const NavItem = ({ icon, label, viewName }) => (
    <button
      onClick={() => { setView(viewName); if (isOpen && window.innerWidth < 1024) setIsOpen(false); }}
      className={`flex items-center w-full px-3 py-3 text-left rounded-lg transition-colors duration-150 ease-in-out
        ${currentView === viewName 
          ? 'bg-blue-600 text-white dark:bg-blue-500' 
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
    >
      <Icon name={icon} className="mr-3" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 shadow-xl transform 
                      lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen
                      ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                      transition-transform duration-300 ease-in-out overflow-y-auto pb-4`}>
        <div className="flex items-center justify-between h-16 px-4 border-b dark:border-slate-700">
          <div className="flex items-center">
            <Icon name={Zap} size={28} className="text-blue-600 dark:text-blue-500 mr-2" />
            <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">Restau<span className="text-blue-600 dark:text-blue-500">App</span></span>
          </div>
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="lg:hidden">
            <Icon name={X} />
          </Button>
        </div>
        <nav className="p-4 space-y-2">
          <NavItem icon={Home} label="Dashboard" viewName="adminDashboard" />
          <NavItem icon={ClipboardList} label="Menu Management" viewName="adminMenu" />
          <NavItem icon={ShoppingCart} label="Order Management" viewName="adminOrders" />
          <NavItem icon={LayoutGrid} label="Table Management" viewName="adminTables" />
          <NavItem icon={Users} label="Employee Management" viewName="adminEmployees" />
          <NavItem icon={BarChart2} label="Reports & Analytics" viewName="adminReports" />
          <NavItem icon={Settings} label="Restaurant Settings" viewName="adminSettings" />
          <NavItem icon={Palette} label="Design System" viewName="designSystem" />
          <hr className="my-3 border-slate-200 dark:border-slate-700" />
          <NavItem icon={Eye} label="View Customer Site" viewName="customerLanding" />
          <NavItem icon={LogOut} label="Logout" viewName="logout" />
        </nav>
      </aside>
      {isOpen && <div className="fixed inset-0 z-30 bg-black opacity-50 lg:hidden" onClick={() => setIsOpen(false)}></div>}
    </>
  );
};

const AdminLayout = ({ children, currentView, setView, currentViewName }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <AdminSidebar currentView={currentView} setView={setView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} currentViewName={currentViewName} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

// Admin Screens
const DashboardScreen = () => {
  const StatCard = ({ title, value, icon, trend, color }) => (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900`}> {/* Adjusted dark mode background for better contrast */}
          <Icon name={icon} size={24} className={`text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
      {trend && <p className={`text-sm mt-2 ${trend.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{trend}</p>}
    </Card>
  );

  const recentOrders = MOCK_ORDERS.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Today's Sales" value="$1,280" icon={DollarSign} trend="+5.2% vs yesterday" color="blue" />
        <StatCard title="Active Tables" value="8" icon={Grid} trend="-2 vs last hour" color="indigo" />
        <StatCard title="New Orders" value="15" icon={ShoppingCart} trend="+3 since last check" color="emerald" />
        <StatCard title="Pending Takeaways" value="4" icon={Package} trend="2 preparing" color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">Recent Orders</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                <tr>
                  <th scope="col" className="px-4 py-3">Order ID</th>
                  <th scope="col" className="px-4 py-3">Type</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">#{order.id.slice(-4)}</td>
                    <td className="px-4 py-3">{order.type} {order.table && `(${order.table})`}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      order.status === 'New' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      order.status === 'Preparing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      order.status === 'Ready' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      'bg-slate-100 text-slate-800 dark:bg-slate-600 dark:text-slate-200'
                    }`}>{order.status}</span></td>
                    <td className="px-4 py-3">${order.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">Quick Actions</h3>
          <div className="space-y-3">
            <Button variant="primary" className="w-full" iconLeft={PlusCircle}>Add New Menu Item</Button>
            <Button variant="secondary" className="w-full" iconLeft={QrCode}>Generate QR for Table</Button>
            <Button variant="secondary" className="w-full" iconLeft={UserPlus}>Add New Employee</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const MenuManagementScreen = () => {
  const [menuData, setMenuData] = useState(MOCK_MENU_CATEGORIES);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null); 
  const [selectedCategoryIdForItem, setSelectedCategoryIdForItem] = useState(null);

  const handleOpenCategoryModal = (category = null) => {
    setEditingCategory(category || { name: '', order: menuData.length + 1 });
    setIsCategoryModalOpen(true);
  };

  const handleOpenItemModal = (category, item = null) => {
    setSelectedCategoryIdForItem(category.id);
    setEditingItem(item || { name: '', description: '', price: '', imageUrl: '', available: true });
    setIsItemModalOpen(true);
  };

  const handleSaveCategory = () => {
    console.log("Saving category:", editingCategory);
    // In a real app, update state and call API
    // For mock:
    if (editingCategory.id) {
        setMenuData(menuData.map(cat => cat.id === editingCategory.id ? {...cat, ...editingCategory} : cat));
    } else {
        setMenuData([...menuData, { ...editingCategory, id: `cat${Date.now()}`, items: [] }]);
    }
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  const handleSaveItem = () => {
    console.log("Saving item:", editingItem, "to category:", selectedCategoryIdForItem);
    // In a real app, update state and call API
    // For mock:
    setMenuData(menuData.map(cat => {
        if (cat.id === selectedCategoryIdForItem) {
            if (editingItem.id) { // Existing item
                return {...cat, items: cat.items.map(itm => itm.id === editingItem.id ? {...itm, ...editingItem} : itm)};
            } else { // New item
                return {...cat, items: [...cat.items, {...editingItem, id: `item${Date.now()}`}]};
            }
        }
        return cat;
    }));
    setIsItemModalOpen(false);
    setEditingItem(null);
    setSelectedCategoryIdForItem(null);
  };

  const MenuItemCard = ({ item, category }) => (
    <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 p-3 hover:shadow-md transition-shadow">
      <div className="flex items-center mb-2 sm:mb-0 flex-grow">
        <img src={item.imageUrl || 'https://placehold.co/80x60/E2E8F0/334155?text=Item'} alt={item.name} className="w-20 h-15 object-cover rounded-md mr-4 flex-shrink-0"/>
        <div className="flex-grow">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100">{item.name}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">${item.price.toFixed(2)}</p>
          <p className={`text-xs font-medium mt-1 px-2 py-0.5 rounded-full inline-block ${item.available ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300'}`}>
            {item.available ? 'Available' : 'Unavailable'}
          </p>
        </div>
      </div>
      <div className="flex space-x-2 mt-2 sm:mt-0 self-end sm:self-center flex-shrink-0">
        <Button size="sm" variant="ghost" iconLeft={Edit2} onClick={() => handleOpenItemModal(category, item)}>Edit</Button>
        <Button size="sm" variant="ghost" iconLeft={Trash2} className="text-red-500 hover:text-red-600">Delete</Button>
      </div>
    </Card>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Menu Management</h2>
        <Button onClick={() => handleOpenCategoryModal()} iconLeft={PlusCircle}>Add Category</Button>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Drag and drop categories or items to reorder (visual cue only).</p>

      {menuData.sort((a,b) => a.order - b.order).map(category => (
        <Card key={category.id} className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 gap-2">
            <div className="flex items-center">
              <Icon name={MenuIcon} className="mr-2 text-slate-400 cursor-grab" title="Drag to reorder category"/>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{category.name}</h3>
            </div>
            <div className="flex space-x-2 self-start sm:self-center">
              <Button size="sm" variant="secondary" iconLeft={PlusCircle} onClick={() => handleOpenItemModal(category)}>Add Item</Button>
              <Button size="sm" variant="ghost" iconLeft={Edit2} onClick={() => handleOpenCategoryModal(category)}>Edit</Button>
              <Button size="sm" variant="ghost" iconLeft={Trash2} className="text-red-500 hover:text-red-600">Delete</Button>
            </div>
          </div>
          {category.items.length > 0 ? (
            category.items.map(item => <MenuItemCard key={item.id} item={item} category={category} />)
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">No items in this category yet.</p>
          )}
        </Card>
      ))}

      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={editingCategory?.id ? "Edit Category" : "Add New Category"}>
        {editingCategory && (
          <form onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }}>
            <Input label="Category Name" name="name" value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} required />
            <Input label="Display Order" name="order" type="number" value={editingCategory.order} onChange={e => setEditingCategory({...editingCategory, order: parseInt(e.target.value) || 0})} required />
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Category</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={editingItem?.id ? "Edit Menu Item" : "Add New Menu Item"} size="lg">
        {editingItem && (
          <form onSubmit={(e) => { e.preventDefault(); handleSaveItem(); }}>
            <Input label="Item Name" name="name" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required />
            <Textarea label="Description" name="description" value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} />
            <Input label="Price" name="price" type="number" step="0.01" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value) || 0})} required />
            <Input label="Image URL (Optional)" name="imageUrl" value={editingItem.imageUrl} onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} />
            <div className="my-4">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-blue-500"
                  checked={editingItem.available}
                  onChange={e => setEditingItem({...editingItem, available: e.target.checked})}
                />
                <span className="text-slate-700 dark:text-slate-300">Item is Available</span>
              </label>
            </div>
            <Select label="Category" name="categoryId" value={selectedCategoryIdForItem || ''} onChange={e => setSelectedCategoryIdForItem(e.target.value)} required>
              <option value="" disabled>Select a category</option>
              {menuData.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </Select>
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="secondary" onClick={() => setIsItemModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Item</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

const OrderManagementScreen = () => {
  const [orders, setOrders] = useState(MOCK_ORDERS);
  const [filter, setFilter] = useState('All');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const statusColors = {
    New: 'blue', Preparing: 'yellow', Ready: 'green', Completed: 'slate'
  };

  const filteredOrders = orders.filter(order => filter === 'All' || order.status === filter);

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailModalOpen(true);
  };
  
  const handleUpdateStatus = (orderId, newStatus) => {
    setOrders(prevOrders => prevOrders.map(o => o.id === orderId ? {...o, status: newStatus} : o));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => ({...prev, status: newStatus}));
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Order Management</h2>
        <div className="flex space-x-2 overflow-x-auto pb-2 sm:pb-0">
          {['All', 'New', 'Preparing', 'Ready', 'Completed'].map(status => (
            <Button key={status} variant={filter === status ? 'primary' : 'secondary'} size="sm" onClick={() => setFilter(status)}>
              {status} ({status === 'All' ? orders.length : orders.filter(o => o.status === status).length})
            </Button>
          ))}
        </div>
      </div>

      <div className="hidden md:block">
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                <tr>
                  <th scope="col" className="px-4 py-3">Order ID</th>
                  <th scope="col" className="px-4 py-3">Time</th>
                  <th scope="col" className="px-4 py-3">Type / Details</th>
                  <th scope="col" className="px-4 py-3">Total</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map(order => (
                  <tr key={order.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">#{order.id.slice(-4)}</td>
                    <td className="px-4 py-3">{order.timestamp}</td>
                    <td className="px-4 py-3">{order.type} {order.table && `(${order.table})`} {order.customerName && `(${order.customerName})`}</td>
                    <td className="px-4 py-3">${order.total.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${statusColors[order.status]}-100 text-${statusColors[order.status]}-800 dark:bg-${statusColors[order.status]}-900 dark:text-${statusColors[order.status]}-300`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 flex items-center space-x-2">
                      <Button size="sm" variant="ghost" iconLeft={Eye} onClick={() => handleViewDetails(order)}>View</Button>
                      <div className="relative group">
                        <Button size="sm" variant="secondary" iconRight={ChevronDown}>Update</Button>
                        <div className="absolute z-10 right-0 mt-1 w-36 bg-white dark:bg-slate-700 rounded-md shadow-lg py-1 hidden group-hover:block">
                          {['New', 'Preparing', 'Ready', 'Completed'].map(s => (
                            <button key={s} onClick={() => handleUpdateStatus(order.id, s)} 
                                    className="block w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-50"
                                    disabled={order.status === s}>
                              Set as {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="md:hidden space-y-4">
        {filteredOrders.map(order => (
          <Card key={order.id}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Order #{order.id.slice(-4)}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{order.timestamp}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${statusColors[order.status]}-100 text-${statusColors[order.status]}-800 dark:bg-${statusColors[order.status]}-900 dark:text-${statusColors[order.status]}-300`}>
                {order.status}
              </span>
            </div>
            <p className="text-sm my-2 text-slate-600 dark:text-slate-300">
              {order.type} {order.table && `(${order.table})`} {order.customerName && `(${order.customerName})`} - Total: <span className="font-semibold">${order.total.toFixed(2)}</span>
            </p>
            <div className="flex justify-end space-x-2">
              <Button size="sm" variant="ghost" iconLeft={Eye} onClick={() => handleViewDetails(order)}>View Details</Button>
              {order.status === 'New' && <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(order.id, 'Preparing')}>Mark Preparing</Button>}
              {order.status === 'Preparing' && <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(order.id, 'Ready')}>Mark Ready</Button>}
              {order.status === 'Ready' && <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(order.id, 'Completed')}>Mark Completed</Button>}
            </div>
          </Card>
        ))}
      </div>

      {filteredOrders.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 py-8">No orders match the current filter.</p>}

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Order Details: #${selectedOrder?.id.slice(-4)}`} size="lg">
        {selectedOrder && (
          <div>
            <p><strong>Status:</strong> <span className={`px-2 py-1 text-xs font-medium rounded-full bg-${statusColors[selectedOrder.status]}-100 text-${statusColors[selectedOrder.status]}-800 dark:bg-${statusColors[selectedOrder.status]}-900 dark:text-${statusColors[selectedOrder.status]}-300`}>{selectedOrder.status}</span></p>
            <p><strong>Type:</strong> {selectedOrder.type}</p>
            {selectedOrder.table && <p><strong>Table:</strong> {selectedOrder.table}</p>}
            {selectedOrder.customerName && <p><strong>Customer:</strong> {selectedOrder.customerName}</p>}
            <p><strong>Time:</strong> {selectedOrder.timestamp}</p>
            <p><strong>Total:</strong> ${selectedOrder.total.toFixed(2)}</p>
            <h4 className="font-semibold mt-4 mb-2 text-slate-700 dark:text-slate-200">Items:</h4>
            <ul className="list-disc list-inside text-slate-600 dark:text-slate-300">
              {selectedOrder.items.map((item, index) => (
                <li key={index}>{item.qty}x {item.name}</li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end space-x-2">
              <Button variant="secondary" onClick={() => setIsDetailModalOpen(false)}>Close</Button>
              <Button variant="primary" iconLeft={Printer}>Print Receipt</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const TableManagementScreen = () => {
  const [tables, setTables] = useState(MOCK_TABLES);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null); 

  const tableStatusColors = {
    Available: 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700',
    Occupied: 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700',
    Reserved: 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700',
  };

  const handleOpenTableModal = (table = null) => {
    setEditingTable(table || { name: '', capacity: 2, status: 'Available' });
    setIsTableModalOpen(true);
  };

  const handleSaveTable = () => {
    console.log("Saving table:", editingTable);
    // Mock save
    if(editingTable.id) {
        setTables(tables.map(t => t.id === editingTable.id ? {...t, ...editingTable} : t));
    } else {
        setTables([...tables, {...editingTable, id: `t${Date.now()}`}]);
    }
    setIsTableModalOpen(false);
    setEditingTable(null);
  };
  
  const handleTableAction = (tableId, action) => {
    setTables(prevTables => prevTables.map(t => {
      if (t.id === tableId) {
        if (action === 'occupy') return {...t, status: 'Occupied', currentOrder: `ORD${Math.floor(Math.random()*1000)}`}; // Mock order ID
        if (action === 'free') return {...t, status: 'Available', currentOrder: null, reservationTime: null};
        if (action === 'reserve') return {...t, status: 'Reserved', reservationTime: 'ASAP'}; 
      }
      return t;
    }));
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Table Management</h2>
        <Button onClick={() => handleOpenTableModal()} iconLeft={PlusCircle}>Add Table</Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {tables.map(table => (
          <Card key={table.id} className={`relative group ${tableStatusColors[table.status]} text-white transition-all duration-200 transform hover:scale-105 aspect-square flex flex-col items-center justify-center text-center p-3`}>
            <h3 className="text-lg font-bold">{table.name}</h3>
            <p className="text-sm">{table.capacity} seats</p>
            <p className="text-xs mt-1">{table.status}</p>
            {table.status === 'Occupied' && table.currentOrder && <p className="text-xs">Order #{table.currentOrder.slice(-4)}</p>}
            {table.status === 'Reserved' && table.reservationTime && <p className="text-xs">Res: {table.reservationTime}</p>}
            
            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center space-y-1 p-2">
              {table.status === 'Available' && <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white w-full" onClick={() => handleTableAction(table.id, 'occupy')}>Occupy</Button>}
              {table.status === 'Available' && <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white w-full" onClick={() => handleTableAction(table.id, 'reserve')}>Reserve</Button>}
              {table.status === 'Occupied' && <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white w-full" onClick={() => handleTableAction(table.id, 'free')}>Free Table</Button>}
              {table.status === 'Reserved' && <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white w-full" onClick={() => handleTableAction(table.id, 'occupy')}>Seat Party</Button>}
              {table.status === 'Reserved' && <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white w-full" onClick={() => handleTableAction(table.id, 'free')}>Cancel Res.</Button>}
              <Button size="sm" className="bg-white/20 hover:bg-white/30 text-white w-full" onClick={() => handleOpenTableModal(table)}>Edit</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isTableModalOpen} onClose={() => setIsTableModalOpen(false)} title={editingTable?.id ? "Edit Table" : "Add New Table"}>
        {editingTable && (
          <form onSubmit={(e) => { e.preventDefault(); handleSaveTable(); }}>
            <Input label="Table Name/Number" name="name" value={editingTable.name} onChange={e => setEditingTable({...editingTable, name: e.target.value})} required />
            <Input label="Capacity" name="capacity" type="number" value={editingTable.capacity} onChange={e => setEditingTable({...editingTable, capacity: parseInt(e.target.value) || 1})} required />
            <Select label="Status" name="status" value={editingTable.status} onChange={e => setEditingTable({...editingTable, status: e.target.value})} required>
              <option value="Available">Available</option>
              <option value="Occupied">Occupied</option>
              <option value="Reserved">Reserved</option>
            </Select>
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="secondary" onClick={() => setIsTableModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Table</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

const EmployeeManagementScreen = () => {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null); 
  const [viewMode, setViewMode] = useState('list'); 

  const handleOpenEmployeeModal = (employee = null) => {
    setEditingEmployee(employee || { name: '', role: '', email: '', phone: '', schedule: {} });
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = () => {
    console.log("Saving employee:", editingEmployee);
    // Mock save
    if(editingEmployee.id) {
        setEmployees(employees.map(emp => emp.id === editingEmployee.id ? {...emp, ...editingEmployee} : emp));
    } else {
        setEmployees([...employees, {...editingEmployee, id: `emp${Date.now()}`}]);
    }
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
  };

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Employee Management</h2>
        <div className="flex items-center space-x-2">
          <div className="p-0.5 bg-slate-200 dark:bg-slate-700 rounded-lg flex">
            <Button 
              size="sm" 
              variant={viewMode === 'list' ? 'primary' : 'ghost'} 
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? '' : 'text-slate-600 dark:text-slate-300'}
            >
              <Icon name={List} className="mr-1 sm:mr-2" /> List
            </Button>
            <Button 
              size="sm" 
              variant={viewMode === 'schedule' ? 'primary' : 'ghost'} 
              onClick={() => setViewMode('schedule')}
              className={viewMode === 'schedule' ? '' : 'text-slate-600 dark:text-slate-300'}
            >
              <Icon name={Calendar} className="mr-1 sm:mr-2" /> Schedule
            </Button>
          </div>
          <Button onClick={() => handleOpenEmployeeModal()} iconLeft={UserPlus}>Add Employee</Button>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map(emp => (
            <Card key={emp.id}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{emp.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{emp.role}</p>
                </div>
                <Button variant="ghost" size="sm" iconLeft={MoreVertical} className="-mr-2 -mt-2" />
              </div>
              <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                <p><Icon name={Mail} size={14} className="inline mr-2" /> {emp.email}</p>
                <p><Icon name={Phone} size={14} className="inline mr-2" /> {emp.phone}</p>
              </div>
              <div className="mt-4 flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => handleOpenEmployeeModal(emp)} iconLeft={Edit2}>Edit</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'schedule' && (
        <Card noPadding>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm text-left text-slate-500 dark:text-slate-400">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                <tr>
                  <th scope="col" className="px-4 py-3 sticky left-0 bg-slate-50 dark:bg-slate-700 z-10">Employee</th>
                  {daysOfWeek.map(day => <th key={day} scope="col" className="px-4 py-3 text-center">{day}</th>)}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white sticky left-0 bg-white dark:bg-slate-800 z-10">
                      {emp.name} <br/> <span className="text-xs text-blue-600 dark:text-blue-400">{emp.role}</span>
                    </td>
                    {daysOfWeek.map(day => (
                      <td key={day} className="px-2 py-3 text-center align-top">
                        <div className={`p-1.5 rounded-md text-xs min-h-[40px] ${emp.schedule[day] && emp.schedule[day] !== 'OFF' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : emp.schedule[day] === 'OFF' ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : 'bg-transparent'}`}>
                          {emp.schedule[day] || '-'}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal isOpen={isEmployeeModalOpen} onClose={() => setIsEmployeeModalOpen(false)} title={editingEmployee?.id ? "Edit Employee" : "Add New Employee"} size="lg">
        {editingEmployee && (
          <form onSubmit={(e) => { e.preventDefault(); handleSaveEmployee(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name" name="name" value={editingEmployee.name} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} required />
              <Input label="Role" name="role" value={editingEmployee.role} onChange={e => setEditingEmployee({...editingEmployee, role: e.target.value})} required />
              <Input label="Email" name="email" type="email" value={editingEmployee.email} onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} required />
              <Input label="Phone" name="phone" type="tel" value={editingEmployee.phone} onChange={e => setEditingEmployee({...editingEmployee, phone: e.target.value})} />
            </div>
            <h4 className="text-md font-semibold mt-6 mb-2 text-slate-700 dark:text-slate-200">Schedule</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {daysOfWeek.map(day => (
                <Input 
                  key={day} 
                  label={day} 
                  name={`schedule-${day}`} 
                  placeholder="e.g., 9am-5pm or OFF"
                  value={editingEmployee.schedule[day] || ''} 
                  onChange={e => setEditingEmployee({...editingEmployee, schedule: {...editingEmployee.schedule, [day]: e.target.value }})} 
                />
              ))}
            </div>
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="secondary" onClick={() => setIsEmployeeModalOpen(false)}>Cancel</Button>
              <Button type="submit" variant="primary">Save Employee</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

const ReportsScreen = () => {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Reports & Analytics</h2>
      <Card>
        <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
          <Icon name={BarChart2} size={48} className="mb-4" />
          <p className="text-xl">Detailed reports and analytics are coming soon!</p>
          <p>This section will provide insights into sales, popular items, customer trends, and more.</p>
        </div>
      </Card>
    </div>
  );
};

const RestaurantSettingsScreen = ({ restaurantSettings, setRestaurantSettingsGlobally }) => { // Accept setRestaurantSettingsGlobally
  const [settings, setSettings] = useState(restaurantSettings);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => { // Sync local state if global settings change
    setSettings(restaurantSettings);
  }, [restaurantSettings]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Settings saved:", settings);
    setRestaurantSettingsGlobally(settings); // Update global state
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-6">Restaurant Settings</h2>
      {showNotification && <Alert type="success" message="Settings saved successfully!" onClose={() => setShowNotification(false)} className="mb-4" />}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Restaurant Name" name="name" value={settings.name} onChange={handleChange} required />
            <Input label="Phone Number" name="phone" type="tel" value={settings.phone} onChange={handleChange} />
          </div>
          <Input label="Address" name="address" value={settings.address} onChange={handleChange} />
          <Textarea label="Operating Hours (display)" name="hours" value={settings.hours} onChange={handleChange} rows={3} />
          <Textarea label="Short Description / Welcome Message" name="description" value={settings.description} onChange={handleChange} rows={4} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <Input label="Logo URL" name="logoUrl" value={settings.logoUrl} onChange={handleChange} />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Logo Preview</label>
              <img src={settings.logoUrl || 'https://placehold.co/100x100/E2E8F0/334155?text=Logo'} alt="Logo Preview" className="w-24 h-24 object-contain rounded-md border border-slate-300 dark:border-slate-600 p-1 bg-slate-50 dark:bg-slate-700" 
                   onError={(e) => e.target.src = 'https://placehold.co/100x100/FF0000/FFFFFF?text=Error'}/>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 pt-4 border-t border-slate-200 dark:border-slate-700">Branding Colors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <Input label="Primary Color" name="primaryColor" type="color" value={settings.primaryColor} onChange={handleChange} className="w-full h-12 p-1 border-slate-300 dark:border-slate-600 rounded-lg" />
            </div>
            <div>
              <Input label="Secondary Color" name="secondaryColor" type="color" value={settings.secondaryColor} onChange={handleChange} className="w-full h-12 p-1 border-slate-300 dark:border-slate-600 rounded-lg" />
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Note: Color changes will apply to the customer-facing website.</p>

          <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button type="submit" variant="primary" iconLeft={CheckCircle}>Save Settings</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};


// Customer Frontend Components
const CustomerHeader = ({ restaurantName, logoUrl, primaryColor, onCartClick, cartItemCount }) => {
  return (
    <header className="sticky top-0 z-30 shadow-md" style={{ backgroundColor: primaryColor || MOCK_RESTAURANT_INFO.primaryColor }}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <img src={logoUrl || MOCK_RESTAURANT_INFO.logoUrl} alt={`${restaurantName} Logo`} className="h-10 w-10 rounded-full mr-3 object-cover bg-white" 
               onError={(e) => e.target.src = 'https://placehold.co/40x40/FFFFFF/334155?text=Logo'}/>
          <h1 className="text-xl font-bold text-white">{restaurantName || MOCK_RESTAURANT_INFO.name}</h1>
        </div>
        <Button variant="ghost" onClick={onCartClick} className="text-white hover:bg-white/20 relative">
          <Icon name={ShoppingCart} />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
};

const CustomerFooter = ({ restaurantName }) => (
  <footer className="bg-slate-100 dark:bg-slate-800 py-8 text-center">
    <p className="text-slate-600 dark:text-slate-400 text-sm">&copy; {new Date().getFullYear()} {restaurantName || MOCK_RESTAURANT_INFO.name}. All rights reserved.</p>
    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Powered by RestauApp</p>
  </footer>
);

// Cart Context
const CartContext = createContext();

const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.itemId === item.id);
      if (existingItem) {
        return prevCart.map(cartItem => 
          cartItem.itemId === item.id ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem
        );
      } else {
        return [...prevCart, { itemId: item.id, name: item.name, price: item.price, qty: 1, imageUrl: item.imageUrl }];
      }
    });
  };

  const updateQuantity = (itemId, newQty) => {
    if (newQty <= 0) {
      setCart(prevCart => prevCart.filter(item => item.itemId !== itemId));
    } else {
      setCart(prevCart => prevCart.map(item => item.itemId === itemId ? { ...item, qty: newQty } : item));
    }
  };
  
  const clearCart = () => {
    setCart([]);
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const totalCartPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, totalCartItems, totalCartPrice, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

const useCart = () => useContext(CartContext);


const CustomerLayout = ({ children, setView, restaurantSettings }) => {
  const { totalCartItems } = useCart();
  const handleCartClick = () => {
    setView('customerCheckout');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <CustomerHeader 
        restaurantName={restaurantSettings.name} 
        logoUrl={restaurantSettings.logoUrl}
        primaryColor={restaurantSettings.primaryColor}
        onCartClick={handleCartClick} 
        cartItemCount={totalCartItems}
      />
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
      <CustomerFooter restaurantName={restaurantSettings.name} />
      <div className="fixed bottom-4 right-4 z-50">
        <Button onClick={() => setView('adminDashboard')} iconLeft={Briefcase} variant="secondary" size="sm">
          Admin Panel
        </Button>
      </div>
    </div>
  );
};

// Customer Screens
const RestaurantLandingScreen = ({ setView, restaurantSettings }) => {
  return (
    <div className="text-center">
      <img 
        src={restaurantSettings.logoUrl || 'https://placehold.co/150x150/3B82F6/FFFFFF?text=Logo'} 
        alt={`${restaurantSettings.name} Logo`} 
        className="w-32 h-32 md:w-40 md:h-40 rounded-full mx-auto mb-6 object-cover border-4 bg-white shadow-lg"
        style={{ borderColor: restaurantSettings.primaryColor || MOCK_RESTAURANT_INFO.primaryColor }}
        onError={(e) => e.target.src = 'https://placehold.co/150x150/FF0000/FFFFFF?text=Error'}
      />
      <h2 className="text-3xl sm:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-3">{restaurantSettings.name}</h2>
      <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-xl mx-auto">{restaurantSettings.description}</p>
      
      <Card className="max-w-md mx-auto mb-8 text-left">
        <h3 className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-200">Restaurant Information</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2"><Icon name={MapPin} size={16} className="inline mr-2" />{restaurantSettings.address}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2"><Icon name={Phone} size={16} className="inline mr-2" />{restaurantSettings.phone}</p>
        <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-line"><Icon name={Clock} size={16} className="inline mr-2 align-top" />{restaurantSettings.hours}</p>
      </Card>

      <Button 
        onClick={() => setView('customerMenu')} 
        size="lg" 
        iconRight={ChevronRight}
        style={{ backgroundColor: restaurantSettings.primaryColor, borderColor: restaurantSettings.primaryColor }}
        className="text-white hover:opacity-90"
      >
        View Menu & Order
      </Button>
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Scan QR code at your table or order ahead!</p>
    </div>
  );
};

const CustomerMenuScreen = ({ setView, restaurantSettings }) => {
  const [menu] = useState(MOCK_MENU_CATEGORIES); // Removed setMenu as it's not used
  const { addToCart, totalCartItems, totalCartPrice } = useCart();
  const [showAddedToCartMsg, setShowAddedToCartMsg] = useState('');

  const handleAddToCart = (item) => {
    addToCart(item);
    setShowAddedToCartMsg(`${item.name} added to cart!`);
    setTimeout(() => setShowAddedToCartMsg(''), 2000);
  };

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-slate-800 dark:text-slate-100">Our Menu</h2>
      {showAddedToCartMsg && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50">
          <Alert type="success" message={showAddedToCartMsg} onClose={() => setShowAddedToCartMsg('')}/>
        </div>
      )}

      {menu.sort((a,b) => a.order - b.order).map(category => (
        <section key={category.id} className="mb-8">
          <h3 className="text-xl font-semibold mb-4 pb-2 border-b-2" style={{borderColor: restaurantSettings.primaryColor || MOCK_RESTAURANT_INFO.primaryColor, color: restaurantSettings.primaryColor || MOCK_RESTAURANT_INFO.primaryColor }}>{category.name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.items.filter(item => item.available).map(item => (
              <Card key={item.id} className="flex flex-col">
                <img src={item.imageUrl || 'https://placehold.co/300x200/E2E8F0/334155?text=Food'} alt={item.name} className="w-full h-40 object-cover rounded-t-lg mb-3" 
                     onError={(e) => e.target.src = 'https://placehold.co/300x200/FF0000/FFFFFF?text=No+Image'}/>
                <div className="flex-grow">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{item.name}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{item.description}</p>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-lg font-bold" style={{color: restaurantSettings.secondaryColor || MOCK_RESTAURANT_INFO.secondaryColor}}>${item.price.toFixed(2)}</p>
                  <Button 
                    size="sm" 
                    onClick={() => handleAddToCart(item)} 
                    iconLeft={PlusCircle}
                    style={{ backgroundColor: restaurantSettings.primaryColor, borderColor: restaurantSettings.primaryColor }}
                    className="text-white hover:opacity-90"
                  >
                    Add
                  </Button>
                </div>
              </Card>
            ))}
             {category.items.filter(item => !item.available).map(item => (
              <Card key={item.id} className="flex flex-col opacity-60 relative">
                 <div className="absolute inset-0 bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center z-10 rounded-lg">
                    <span className="px-3 py-1 bg-slate-600 text-white text-sm font-semibold rounded-full">Currently Unavailable</span>
                </div>
                <img src={item.imageUrl || 'https://placehold.co/300x200/E2E8F0/334155?text=Food'} alt={item.name} className="w-full h-40 object-cover rounded-t-lg mb-3" 
                     onError={(e) => e.target.src = 'https://placehold.co/300x200/FF0000/FFFFFF?text=No+Image'}/>
                <div className="flex-grow">
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{item.name}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{item.description}</p>
                </div>
                <div className="flex justify-between items-center mt-3">
                  <p className="text-lg font-bold text-slate-400 dark:text-slate-500">${item.price.toFixed(2)}</p>
                  <Button size="sm" iconLeft={PlusCircle} disabled>Add</Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ))}

      {totalCartItems > 0 && (
        <div className="sticky bottom-4 z-20 p-1">
          <Card className="max-w-md mx-auto shadow-xl" style={{backgroundColor: restaurantSettings.primaryColor || MOCK_RESTAURANT_INFO.primaryColor}}>
            <div className="flex justify-between items-center text-white">
              <div>
                <p className="font-semibold">{totalCartItems} item{totalCartItems > 1 ? 's' : ''} in cart</p>
                <p className="text-sm">Total: ${totalCartPrice.toFixed(2)}</p>
              </div>
              <Button 
                onClick={() => setView('customerCheckout')}
                size="md" 
                iconRight={ShoppingCart}
                className="bg-white hover:bg-slate-100"
                style={{color: restaurantSettings.primaryColor || MOCK_RESTAURANT_INFO.primaryColor}}
              >
                View Cart & Checkout
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const CheckoutScreen = ({ setView, restaurantSettings }) => {
  const { cart, updateQuantity, totalCartPrice, clearCart } = useCart();
  const [orderType, setOrderType] = useState('Dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [formError, setFormError] = useState('');


  const subtotal = totalCartPrice;
  const taxRate = 0.08; 
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const validateForm = () => {
    if (cart.length === 0) {
        setFormError("Your cart is empty. Please add items to proceed.");
        return false;
    }
    if (orderType === 'Dine-in' && !tableNumber.trim()) {
      setFormError("Please enter your table number for Dine-in orders.");
      return false;
    }
    if (orderType === 'Takeaway' && !customerName.trim()) {
      setFormError("Please enter your name for Takeaway orders.");
      return false;
    }
    // Basic card validation if payment method is Card (very simplified)
    if (paymentMethod === 'Card') {
        // This is where more robust card validation would go.
        // For now, just check if some fields are conceptually filled.
        // const cardNumber = document.getElementById('cardNumber')?.value;
        // if (!cardNumber || cardNumber.length < 15) {
        //     setFormError("Please enter a valid card number.");
        //     return false;
        // }
    }
    setFormError('');
    return true;
  };


  const handleAttemptPlaceOrder = () => {
    if (validateForm()) {
        setIsConfirmModalOpen(true);
    }
  };
  
  const handleConfirmPlaceOrder = () => {
    console.log("Placing order:", { cart, orderType, tableNumber, customerName, paymentMethod, specialInstructions, total });
    // In a real app: API call to submit order
    setIsConfirmModalOpen(false);
    const orderId = `ORD${Math.floor(Math.random()*9000)+1000}`;
    setView('customerConfirmation', { orderId });
    clearCart(); // Clear cart after successful order
  };

  return (
    <div>
      <Button onClick={() => setView('customerMenu')} iconLeft={ChevronLeft} variant="ghost" className="mb-4 -ml-2">Back to Menu</Button>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-slate-800 dark:text-slate-100">Checkout</h2>
      
      {formError && <Alert type="error" message={formError} onClose={() => setFormError('')} className="mb-4"/>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Your Order</h3>
            {cart.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400">Your cart is empty. <Button variant="link" onClick={() => setView('customerMenu')} className="text-blue-600 dark:text-blue-400">Add items</Button></p>
            ) : (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.itemId} className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                    <img src={item.imageUrl || 'https://placehold.co/60x40/E2E8F0/334155?text=Item'} alt={item.name} className="w-16 h-12 object-cover rounded-md mr-3 flex-shrink-0"/>
                    <div className="flex-grow">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{item.name}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">${item.price.toFixed(2)} each</p>
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => updateQuantity(item.itemId, item.qty - 1)} disabled={item.qty <= 0}>-</Button>
                      <span>{item.qty}</span>
                      <Button size="sm" variant="ghost" onClick={() => updateQuantity(item.itemId, item.qty + 1)}>+</Button>
                      <p className="font-semibold w-16 text-right text-slate-700 dark:text-slate-200">${(item.price * item.qty).toFixed(2)}</p>
                      <Button size="sm" variant="ghost" onClick={() => updateQuantity(item.itemId, 0)} iconLeft={Trash2} className="text-red-500 hover:text-red-600" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="mt-6">
            <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Order Details</h3>
            <div className="flex space-x-2 mb-4">
              {['Dine-in', 'Takeaway'].map(type => (
                <Button key={type} variant={orderType === type ? 'primary' : 'secondary'} onClick={() => setOrderType(type)}
                  style={orderType === type ? { backgroundColor: restaurantSettings.primaryColor, borderColor: restaurantSettings.primaryColor } : {}}
                  className={orderType === type ? 'text-white' : ''}
                >
                  {type}
                </Button>
              ))}
            </div>
            {orderType === 'Dine-in' && (
              <Input label="Table Number" placeholder="Enter your table number" value={tableNumber} onChange={e => setTableNumber(e.target.value)} required iconLeft={Grid}/>
            )}
            {orderType === 'Takeaway' && (
              <Input label="Your Name" placeholder="Enter your name for pickup" value={customerName} onChange={e => setCustomerName(e.target.value)} required iconLeft={User}/>
            )}
             <Textarea label="Special Instructions (Optional)" placeholder="Any allergies or preferences?" value={specialInstructions} onChange={e => setSpecialInstructions(e.target.value)} />
          </Card>
        </div>

        <div>
          <Card>
            <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Summary</h3>
            <div className="space-y-2 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Tax ({(taxRate*100).toFixed(0)}%):</span><span>${tax.toFixed(2)}</span></div>
              <hr className="my-2 border-slate-200 dark:border-slate-700"/>
              <div className="flex justify-between text-lg font-bold text-slate-800 dark:text-slate-100"><span>Total:</span><span>${total.toFixed(2)}</span></div>
            </div>

            <h4 className="text-md font-semibold mt-6 mb-3 text-slate-700 dark:text-slate-200">Payment Method</h4>
            <div className="space-y-2">
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${paymentMethod === 'Card' ? 'ring-2 dark:border-blue-400' : 'border-slate-300 dark:border-slate-600'}`}
                     style={paymentMethod === 'Card' ? {borderColor: restaurantSettings.primaryColor, ringColor: restaurantSettings.primaryColor} : {}}>
                <input type="radio" name="paymentMethod" value="Card" checked={paymentMethod === 'Card'} onChange={() => setPaymentMethod('Card')} className="form-radio h-4 w-4 mr-2" style={{color: restaurantSettings.primaryColor}}/>
                Pay with Card (Online)
              </label>
              <label className={`flex items-center p-3 border rounded-lg cursor-pointer ${paymentMethod === 'Cash' ? 'ring-2 dark:border-blue-400' : 'border-slate-300 dark:border-slate-600'}`}
                     style={paymentMethod === 'Cash' ? {borderColor: restaurantSettings.primaryColor, ringColor: restaurantSettings.primaryColor} : {}}>
                <input type="radio" name="paymentMethod" value="Cash" checked={paymentMethod === 'Cash'} onChange={() => setPaymentMethod('Cash')} className="form-radio h-4 w-4 mr-2" style={{color: restaurantSettings.primaryColor}}/>
                Pay with Cash (At Counter/Table)
              </label>
            </div>
            {paymentMethod === 'Card' && (
              <div className="mt-4 space-y-3">
                <Input label="Card Number" id="cardNumber" name="cardNumber" placeholder="•••• •••• •••• ••••" iconLeft={CreditCard} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Expiry (MM/YY)" name="cardExpiry" placeholder="MM/YY" />
                  <Input label="CVC" name="cardCvc" placeholder="•••" />
                </div>
                 <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center"><Icon name={Lock} size={12} className="mr-1"/> Secure payment processing (Demo).</p>
              </div>
            )}
            <Button 
              onClick={handleAttemptPlaceOrder} 
              size="lg" 
              className="w-full mt-6 text-white hover:opacity-90"
              style={{ backgroundColor: restaurantSettings.primaryColor, borderColor: restaurantSettings.primaryColor }}
              disabled={cart.length === 0}
            >
              Place Order (${total.toFixed(2)})
            </Button>
          </Card>
        </div>
      </div>
      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title="Confirm Your Order" size="sm">
        <p className="text-slate-700 dark:text-slate-300 mb-4">Are you sure you want to place this order for <strong>${total.toFixed(2)}</strong>?</p>
        <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleConfirmPlaceOrder} style={{backgroundColor: restaurantSettings.primaryColor}}>Yes, Place Order</Button>
        </div>
      </Modal>
    </div>
  );
};

const OrderConfirmationScreen = ({ setView, restaurantSettings, viewProps }) => {
  const orderId = viewProps?.orderId || 'N/A';
  return (
    <div className="text-center py-12">
      <Icon name={CheckCircle} size={64} className="mx-auto mb-6 text-green-500 dark:text-green-400" />
      <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">Order Confirmed!</h2>
      <p className="text-slate-600 dark:text-slate-300 mb-2">Thank you for your order. We're preparing it now.</p>
      <p className="text-lg font-semibold mb-6" style={{color: restaurantSettings.primaryColor || MOCK_RESTAURANT_INFO.primaryColor}}>Your Order ID: {orderId}</p>
      
      <Card className="max-w-md mx-auto mb-8 text-left">
        <h3 className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-200">What's Next?</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
          If you're dining in, please show this confirmation to your server or at the counter.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          For takeaway orders, we'll notify you when it's ready for pickup. Estimated time: 15-20 minutes.
        </p>
      </Card>

      <Button 
        onClick={() => setView('customerMenu')} 
        size="lg" 
        iconLeft={MenuIcon}
        className="text-white hover:opacity-90"
        style={{ backgroundColor: restaurantSettings.primaryColor, borderColor: restaurantSettings.primaryColor }}
      >
        Back to Menu
      </Button>
    </div>
  );
};

const DesignSystemGuide = () => {
  const { theme, toggleTheme } = useTheme();
  const colors = [
    { name: 'Primary Blue', light: 'bg-blue-600', dark: 'dark:bg-blue-500', textLight: 'text-white', textDark: 'dark:text-white' },
    { name: 'Secondary Emerald', light: 'bg-emerald-500', dark: 'dark:bg-emerald-400', textLight: 'text-white', textDark: 'dark:text-black' },
    { name: 'Slate (Text/BG)', light: 'bg-slate-700', dark: 'dark:bg-slate-200', textLight: 'text-white', textDark: 'dark:text-slate-800' },
    { name: 'Background Light', light: 'bg-slate-100', dark: 'dark:bg-slate-50', textLight: 'text-slate-800', textDark: 'dark:text-slate-900' },
    { name: 'Background Dark', light: 'bg-slate-900', dark: 'dark:bg-slate-800', textLight: 'text-white', textDark: 'dark:text-white' },
    { name: 'Card Light', light: 'bg-white', dark: 'dark:bg-slate-100', textLight: 'text-slate-800', textDark: 'dark:text-slate-900' },
    { name: 'Card Dark', light: 'bg-slate-800', dark: 'dark:bg-slate-700', textLight: 'text-white', textDark: 'dark:text-white' },
  ];

  const icons = [ Home, MenuIcon, ShoppingCart, Grid, Users, BarChart2, Settings, PlusCircle, Edit2, Trash2, Eye, CheckCircle, X, ChevronDown, ChevronLeft, ChevronRight, Sun, Moon, Search, Filter, QrCode, DollarSign, Package, Calendar, UserPlus, LogOut, Palette, Type, Smile, ThumbsUp, AlertTriangle, Info, MapPin, Clock, Phone, Briefcase, List, LayoutGrid, ClipboardList, UserCog, MessageSquare, MoreVertical, Printer, RefreshCw, Star, Edit, Zap, CreditCard, User, Lock, Mail, XCircle ];

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Design System Guide</h2>
      
      <Card>
        <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Color Palette</h3>
        <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">Current mode: {theme}. <Button onClick={toggleTheme} size="sm" variant="secondary">Toggle Theme</Button></p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {colors.map(color => (
            <div 
                 key={color.name} 
                 className={`p-4 rounded-lg shadow flex flex-col items-center justify-center text-center ${color.light} ${color.dark} ${color.textLight} ${color.textDark}`}
            >
              <span className="font-medium">{color.name}</span>
              <span className="text-xs opacity-80">{theme === 'light' ? color.light : color.dark}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Typography (Inter)</h3>
        <div className="space-y-3">
          <p className="text-4xl font-bold">Heading 1 (4xl bold)</p>
          <p className="text-3xl font-semibold">Heading 2 (3xl semibold)</p>
          <p className="text-2xl font-semibold">Heading 3 (2xl semibold)</p>
          <p className="text-xl font-medium">Heading 4 (xl medium)</p>
          <p className="text-lg">Body Large / Default Heading (lg)</p>
          <p className="text-base">Body Default (base)</p>
          <p className="text-sm">Body Small / Captions (sm)</p>
          <p className="text-xs">Extra Small / Legal (xs)</p>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Iconography (Lucide React)</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4 text-center">
          {icons.map((Ico, index) => (
            <div key={index} className="flex flex-col items-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700">
              <Icon name={Ico} size={28} className="mb-1 text-slate-600 dark:text-slate-300"/>
              <span className="text-xs text-slate-500 dark:text-slate-400 truncate w-full">{Ico.displayName || Ico.name}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Buttons</h3>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium (Default)</Button>
            <Button variant="primary" size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="primary" iconLeft={ThumbsUp}>With Icon</Button>
            <Button variant="secondary" iconRight={ChevronDown}>Icon Right</Button>
            <Button variant="ghost" iconLeft={Settings} />
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Forms</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Input label="Text Input" name="text_input" placeholder="Enter text here" />
            <Input label="Email Input" name="email_input" type="email" placeholder="you@example.com" iconLeft={Mail}/>
            <Select label="Select Dropdown" name="select_input">
              <option>Option 1</option>
              <option>Option 2</option>
            </Select>
          </div>
          <div>
            <Textarea label="Textarea" name="textarea_input" placeholder="Enter longer text..." />
            <div className="mt-4">
              <label className="flex items-center space-x-2">
                <input type="checkbox" className="form-checkbox h-5 w-5 text-blue-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-blue-500"/>
                <span className="text-slate-700 dark:text-slate-300">Checkbox option</span>
              </label>
            </div>
          </div>
        </div>
      </Card>
      
      <Card>
        <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Alerts & Modals</h3>
        <div className="space-y-4 mb-6">
          <Alert type="info" message="This is an informational message." onClose={() => {}}/>
          <Alert type="success" message="Action completed successfully!" onClose={() => {}}/>
          <Alert type="warning" message="Something needs your attention." onClose={() => {}}/>
          <Alert type="error" message="An error occurred. Please try again." onClose={() => {}}/>
        </div>
        {/* Conceptual button, actual modals are triggered elsewhere */}
        <Button onClick={() => console.log("Conceptual modal trigger: See Menu Management for live example.")}> 
          Show Example Modal (Conceptual)
        </Button>
        <p className="text-xs mt-2 text-slate-500 dark:text-slate-400">Actual modals are implemented in sections like Menu Management.</p>
      </Card>
    </div>
  );
};


// Main App Component
function App() {
  const [currentView, setCurrentView] = useState('adminDashboard'); 
  const [viewProps, setViewProps] = useState({});
  const [restaurantSettings, setRestaurantSettings] = useState(MOCK_RESTAURANT_INFO); 

  const setView = (viewName, props = {}) => {
    setCurrentView(viewName);
    setViewProps(props);
  };

  // This function will be passed to RestaurantSettingsScreen to update the global state
  const updateGlobalRestaurantSettings = (newSettings) => {
    setRestaurantSettings(newSettings);
    // You might also want to update MOCK_RESTAURANT_INFO if it's used elsewhere as a fallback,
    // or ideally, phase out MOCK_RESTAURANT_INFO direct usage outside initial state.
    // For this demo, directly updating the state is sufficient.
  };


  const adminViewNameMap = {
    adminDashboard: "Dashboard",
    adminMenu: "Menu Management",
    adminOrders: "Order Management",
    adminTables: "Table Management",
    adminEmployees: "Employee Management",
    adminReports: "Reports & Analytics",
    adminSettings: "Restaurant Settings",
    designSystem: "Design System Guide",
  };

  let content;
  if (currentView.startsWith('admin') || currentView === 'designSystem') {
    let AdminScreenComponent;
    switch (currentView) {
      case 'adminDashboard': AdminScreenComponent = DashboardScreen; break;
      case 'adminMenu': AdminScreenComponent = MenuManagementScreen; break;
      case 'adminOrders': AdminScreenComponent = OrderManagementScreen; break;
      case 'adminTables': AdminScreenComponent = TableManagementScreen; break;
      case 'adminEmployees': AdminScreenComponent = EmployeeManagementScreen; break;
      case 'adminReports': AdminScreenComponent = ReportsScreen; break;
      case 'adminSettings': 
        // Pass restaurantSettings and the updater function to RestaurantSettingsScreen
        AdminScreenComponent = () => <RestaurantSettingsScreen restaurantSettings={restaurantSettings} setRestaurantSettingsGlobally={updateGlobalRestaurantSettings} />;
        break;
      case 'designSystem': AdminScreenComponent = DesignSystemGuide; break;
      default: AdminScreenComponent = DashboardScreen;
    }
    content = (
      <AdminLayout setView={setView} currentView={currentView} currentViewName={adminViewNameMap[currentView] || "Admin"}>
        {/* For adminSettings, it's already wrapped. For others, pass props if needed. */}
        {currentView === 'adminSettings' ? <AdminScreenComponent /> : <AdminScreenComponent setView={setView} viewProps={viewProps} />}
      </AdminLayout>
    );
  } else if (currentView.startsWith('customer')) {
    let CustomerScreenComponent;
     switch (currentView) {
      case 'customerLanding': CustomerScreenComponent = RestaurantLandingScreen; break;
      case 'customerMenu': CustomerScreenComponent = CustomerMenuScreen; break;
      case 'customerCheckout': CustomerScreenComponent = CheckoutScreen; break;
      case 'customerConfirmation': CustomerScreenComponent = OrderConfirmationScreen; break;
      default: CustomerScreenComponent = RestaurantLandingScreen;
    }
    content = (
      <CustomerLayout setView={setView} restaurantSettings={restaurantSettings}>
        <CustomerScreenComponent setView={setView} restaurantSettings={restaurantSettings} viewProps={viewProps} />
      </CustomerLayout>
    );
  } else if (currentView === 'logout') {
    content = (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
        <Icon name={LogOut} size={48} className="text-blue-500 mb-4"/>
        <h1 className="text-2xl font-semibold mb-2 text-slate-800 dark:text-slate-100">Logged Out</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">You have been successfully logged out.</p>
        <Button onClick={() => setView('adminDashboard')}>Login Again (Demo)</Button>
      </div>
    );
  } else {
    content = <div className="p-8 text-center text-red-500">Error: View not found ({currentView})</div>;
  }

  return (
    <ThemeProvider>
      <CartProvider> {/* Wrap customer-facing part or whole app with CartProvider */}
        <div className="antialiased font-inter">
          {content}
        </div>
      </CartProvider>
    </ThemeProvider>
  );
}

export default App;


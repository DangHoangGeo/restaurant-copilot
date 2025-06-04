import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import {
  BarChart2, Briefcase, Calendar, CheckCircle, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Coffee, CreditCard, DollarSign, Edit2, Eye, FileText, Filter, Grid, Home, LogOut, Menu as MenuIcon, MessageSquare, Moon, MoreVertical, Package, Percent, Phone, PlusCircle, Printer, QrCode, RefreshCw, Search, Settings, ShoppingBag, ShoppingCart, Sun, Trash2, TrendingUp, Truck, Users, UserPlus, X, Zap, Star, MapPin, Edit, List, LayoutGrid, ClipboardList, UserCog, Palette, Type, Smile, ThumbsUp, AlertTriangle, Info, Mail, User, Lock, XCircle, Globe, UploadCloud, Tag, CalendarDays, UsersRound, FileDown, TableIcon as TableSimpleIcon, Building, Languages, SquarePen, ShieldCheck, Sparkles, BookUser, TicketPercent, CalendarCheck2, MessageCircleMore, BarChartBig, PieChartIcon, FileCsv, FilePdf
} from 'lucide-react'; // Added new icons

// --- I18N Placeholder ---
// In a real app, this would come from next-intl
const t = (key: string, params?: object) => {
  let text = key;
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(`{${paramKey}}`, String(value));
    });
  }
  // Simple pluralization for demo
  if (key.endsWith('_plural') && params && 'count' in params && typeof params.count === 'number') {
    text = params.count === 1 ? key.replace('_plural', '') : key.replace('_plural', 's'); // very basic
  }
  if (key === 'currency_format') return `$${params && 'value' in params ? Number(params.value).toFixed(2) : '0.00'}`;
  
  // Mock translations for a few keys to show concept
  const mockTranslations = {
    'ja': {
      'admin.dashboard.title': 'ダッシュボード',
      'admin.menu.add_category': 'カテゴリを追加',
      'customer.menu.add_to_cart': 'カートに追加',
      'common.confirm': '確認',
      'common.cancel': 'キャンセル',
    },
    'vi': {
      'admin.dashboard.title': 'Bảng điều khiển',
      'admin.menu.add_category': 'Thêm danh mục',
      'customer.menu.add_to_cart': 'Thêm vào giỏ',
      'common.confirm': 'Xác nhận',
      'common.cancel': 'Hủy',
    }
  };
  // @ts-ignore
  const currentLocale = typeof window !== 'undefined' ? window.__locale || 'en' : 'en';
  // @ts-ignore
  return mockTranslations[currentLocale]?.[key.toLowerCase()] || text;
};

// --- Feature Flags ---
const FEATURE_FLAGS = {
  tableBooking: true,
  onlinePayment: false, // Set to false as per prompt for "Cash Only" initially
  aiChat: false,
  advancedReviews: true,
  lowStockAlerts: true,
  recommendationsWidget: true,
};

// --- Mock Data ---
const MOCK_RESTAURANT_INFO_BASE = {
  name: "The Gourmet Place",
  address: "123 Culinary Ave, Foodville",
  phone: "555-1234",
  hours: "Mon-Sat: 11am - 10pm\nSun: 12pm - 8pm", // Using newline for multiline display
  description: "Serving the finest local ingredients with a modern twist. Join us for an unforgettable dining experience.",
  logoUrl: "https://placehold.co/100x100/3B82F6/FFFFFF?text=GP",
  primaryColor: '#3B82F6', // Tailwind blue-500
  secondaryColor: '#10B981', // Tailwind emerald-500
  defaultLocale: 'en',
  contactEmail: 'contact@gourmetplace.com',
};

const MOCK_MENU_CATEGORIES_BASE = [
  { id: 'cat1', name: {en: 'Starters', ja: '前菜', vi: 'Khai vị'}, order: 1, items: [
    { id: 'item1', name: {en: 'Spring Rolls', ja: '春巻き', vi: 'Chả giò'}, description: {en: 'Crispy fried rolls with vegetable filling.', ja: '野菜入りのパリパリ春巻き。', vi: 'Chả giò chiên giòn với nhân rau củ.'}, price: 8.99, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Spring+Rolls', available: true, weekdayVisibility: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], averageRating: 4.5, reviewCount: 25 },
    { id: 'item2', name: {en: 'Bruschetta', ja: 'ブルスケッタ', vi: 'Bánh mì Bruschetta'}, description: {en: 'Toasted bread topped with fresh tomatoes, garlic, and basil.', ja: 'トーストしたパンに新鮮なトマト、ニンニク、バジルを乗せて。', vi: 'Bánh mì nướng với cà chua tươi, tỏi và húng quế.'}, price: 10.50, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Bruschetta', available: true, weekdayVisibility: ['Mon', 'Wed', 'Fri', 'Sun'], averageRating: 4.0, reviewCount: 15 },
  ]},
  { id: 'cat2', name: {en: 'Main Courses', ja: 'メインコース', vi: 'Món chính'}, order: 2, items: [
    { id: 'item3', name: {en: 'Grilled Salmon', ja: 'サーモンのグリル', vi: 'Cá hồi nướng'}, description: {en: 'Served with roasted vegetables and lemon butter sauce.', ja: 'ロースト野菜とレモンバターソース添え。', vi: 'Ăn kèm rau củ nướng và sốt bơ chanh.'}, price: 22.00, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Salmon', available: true, weekdayVisibility: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], averageRating: 4.8, reviewCount: 50, stockLevel: 5 }, // Low stock example
    { id: 'item4', name: {en: 'Pasta Carbonara', ja: 'カルボナーラ', vi: 'Mì Ý Carbonara'}, description: {en: 'Classic Italian pasta with creamy egg sauce, pancetta, and Parmesan.', ja: 'クリーミーな卵ソース、パンチェッタ、パルメザンチーズのクラシックイタリアンパスタ。', vi: 'Mì Ý cổ điển với sốt kem trứng, thịt xông khói pancetta và phô mai Parmesan.'}, price: 18.75, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Pasta', available: false, weekdayVisibility: ['Tue', 'Thu', 'Sat'], averageRating: 4.2, reviewCount: 30 },
    { id: 'item5', name: {en: 'Steak Frites', ja: 'ステーキフリット', vi: 'Bò bít tết khoai tây chiên'}, description: {en: 'Grilled sirloin steak with a side of crispy french fries.', ja: 'サーロインステーキのグリルとクリスピーフライドポテト添え。', vi: 'Bò thăn ngoại nướng ăn kèm khoai tây chiên giòn.'}, price: 25.50, imageUrl: 'https://placehold.co/150x100/E2E8F0/334155?text=Steak', available: true, weekdayVisibility: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], averageRating: 0, reviewCount: 0 }, // No reviews example
  ]},
  // ... more categories and items with localized names/descriptions, weekdayVisibility, averageRating, reviewCount, stockLevel
];

const MOCK_TABLES_BASE = [
  { id: 't1', name: 'Table 1', position: 'Window', capacity: 4 },
  { id: 't2', name: 'Table 2', position: 'Center', capacity: 2 },
  { id: 't3', name: 'Patio 1', position: 'Outside', capacity: 6 },
];

const MOCK_EMPLOYEES_BASE = [
  { id: 'emp1', name: 'Alice Smith', role: 'manager', email: 'alice@example.com', phone: '555-0101', shifts: { Mon: '09:00-17:00', Tue: '09:00-17:00', Wed: null, Thu: '09:00-17:00', Fri: '09:00-17:00', Sat: null, Sun: null } },
  { id: 'emp2', name: 'Bob Johnson', role: 'chef', email: 'bob@example.com', phone: '555-0102', shifts: { Mon: '10:00-18:00', Tue: '10:00-18:00', Wed: '10:00-18:00', Thu: null, Fri: '10:00-22:00', Sat: '12:00-22:00', Sun: null } },
  { id: 'emp3', name: 'Carol Williams', role: 'server', email: 'carol@example.com', phone: '555-0103', shifts: { Mon: null, Tue: '17:00-22:00', Wed: '17:00-22:00', Thu: '17:00-22:00', Fri: '17:00-23:00', Sat: '17:00-23:00', Sun: '12:00-20:00' } },
];

const MOCK_BOOKINGS_BASE = [
    { id: 'book1', customerName: 'David Lee', contact: 'david@example.com', date: '2024-07-20', time: '19:00', partySize: 4, status: 'pending', preOrderItems: [{ itemId: 'item1', quantity: 2}, { itemId: 'item3', quantity: 1}] },
    { id: 'book2', customerName: 'Sarah Chen', contact: '555-0202', date: '2024-07-21', time: '18:30', partySize: 2, status: 'confirmed', preOrderItems: [] },
    { id: 'book3', customerName: 'Mike Brown', contact: 'mike@example.com', date: '2024-07-22', time: '20:00', partySize: 5, status: 'canceled', preOrderItems: [] },
];

const MOCK_REVIEWS_BASE = [
    { id: 'rev1', menuItemId: 'item1', menuItemName: {en: 'Spring Rolls', ja: '春巻き', vi: 'Chả giò'}, rating: 5, comment: 'Delicious!', date: '2024-07-15', resolved: false },
    { id: 'rev2', menuItemId: 'item3', menuItemName: {en: 'Grilled Salmon', ja: 'サーモンのグリル', vi: 'Cá hồi nướng'}, rating: 3, comment: 'A bit dry today.', date: '2024-07-14', resolved: true },
    { id: 'rev3', menuItemId: 'item5', menuItemName: {en: 'Steak Frites', ja: 'ステーキフリット', vi: 'Bò bít tết khoai tây chiên'}, rating: 4, comment: '', date: '2024-07-13', resolved: false },
];

// Simulating current locale (would come from URL in Next.js)
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__locale = 'en'; // Default, can be changed by LanguageSwitcher
}
const getCurrentLocale = () => typeof window !== 'undefined' ? (window as any).__locale || 'en' : 'en';

// Helper to get localized text
const getLocalizedText = (localizedField: any, locale: string) => {
  if (typeof localizedField === 'string') return localizedField;
  if (localizedField && typeof localizedField === 'object') {
    return localizedField[locale] || localizedField['en'] || Object.values(localizedField)[0] || '';
  }
  return '';
};

// Theme Context (already exists, good)
const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });
const ThemeProvider = ({ children } : {children: ReactNode}) => {
  const [theme, setTheme] = useState('light');
  const toggleTheme = () => setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    // Set CSS variable for brand color dynamically
    // This is a simplified way for the mockup. In Next.js, this might be done in _app.tsx or a layout.
    const restaurantPrimaryColor = MOCK_RESTAURANT_INFO_BASE.primaryColor; // In real app, this would be dynamic per tenant
    document.documentElement.style.setProperty('--brand-color', restaurantPrimaryColor);
  }, [theme]);
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
};
const useTheme = () => useContext(ThemeContext);

// --- Reusable Helper Components ---
const Icon = ({ name: IconComponent, size = 20, className = "" }) => {
  if (!IconComponent) return <Smile size={size} className={className} />;
  return <IconComponent size={size} className={className} />;
};

const Button = ({ children, onClick, variant = 'primary', size = 'md', className = '', iconLeft, iconRight, type = 'button', disabled = false, ...props }) => {
  const baseStyle = "font-medium rounded-2xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ease-in-out inline-flex items-center justify-center shadow-lg";
  const variantStyles = {
    primary: `bg-[--brand-color] hover:opacity-90 text-white focus:ring-[--brand-color] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    secondary: `bg-slate-200 hover:bg-slate-300 text-slate-700 focus:ring-slate-400 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:focus:ring-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    danger: `bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 dark:bg-red-500 dark:hover:bg-red-600 dark:focus:ring-red-400 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    ghost: `bg-transparent hover:bg-slate-100 text-slate-700 focus:ring-slate-400 dark:hover:bg-slate-700 dark:text-slate-200 dark:focus:ring-slate-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
  };
  const sizeStyles = { sm: "px-3 py-1.5 text-sm", md: "px-4 py-2 text-base", lg: "px-6 py-3 text-lg" };
  return (
    <button type={type} onClick={onClick} className={`${baseStyle} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`} disabled={disabled} {...props}>
      {iconLeft && <Icon name={iconLeft} size={size === 'sm' ? 16 : 20} className="mr-2" />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 20} className="ml-2" />}
    </button>
  );
};

const Card = ({ children, className = '', noPadding = false }) => (
  <div className={`bg-white dark:bg-slate-800 shadow-lg rounded-2xl ${noPadding ? '' : 'p-4 sm:p-6'} ${className}`}>
    {children}
  </div>
);

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', full: 'max-w-full h-full rounded-none' };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
         role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <Card className={`w-full ${sizeClasses[size]} overflow-y-auto max-h-[90vh]`} noPadding>
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
          <h3 id="modal-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          <Button onClick={onClose} variant="ghost" size="sm" iconLeft={X} aria-label={t('common.close_modal')} />
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </Card>
    </div>
  );
};

const Input = ({ label, type = 'text', placeholder, value, onChange, name, className = '', required = false, iconLeft, error, ...props }) => (
  <div className={`mb-4 ${className}`}>
    {label && <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t(label)}{required && <span className="text-red-500">*</span>}</label>}
    <div className="relative">
      {iconLeft && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Icon name={iconLeft} className="text-slate-400" /></div>}
      <input type={type} id={name} name={name} placeholder={t(placeholder || '')} value={value} onChange={onChange} required={required}
             className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[--brand-color] dark:bg-slate-700 dark:text-slate-100 ${iconLeft ? 'pl-10' : ''} ${error ? 'border-red-500 ring-red-500' : ''}`} {...props} />
    </div>
    {error && <p className="mt-1 text-xs text-red-500">{t(error)}</p>}
  </div>
);
// Zod error placeholder: <p className="text-xs text-red-500">{t('validation.required_field')}</p>

const Textarea = ({ label, placeholder, value, onChange, name, className = '', required = false, rows = 3, error, ...props }) => (
    <div className={`mb-4 ${className}`}>
      {label && <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t(label)}{required && <span className="text-red-500">*</span>}</label>}
      <textarea id={name} name={name} placeholder={t(placeholder || '')} value={value} onChange={onChange} required={required} rows={rows}
             className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[--brand-color] dark:bg-slate-700 dark:text-slate-100 ${error ? 'border-red-500 ring-red-500' : ''}`} {...props} />
      {error && <p className="mt-1 text-xs text-red-500">{t(error)}</p>}
    </div>
);

const Select = ({ label, value, onChange, name, children, className = '', required = false, error, ...props }) => (
    <div className={`mb-4 ${className}`}>
      {label && <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t(label)}{required && <span className="text-red-500">*</span>}</label>}
      <select id={name} name={name} value={value} onChange={onChange} required={required}
             className={`w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-[--brand-color] dark:bg-slate-700 dark:text-slate-100 pr-8 ${error ? 'border-red-500 ring-red-500' : ''}`} {...props} >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-500">{t(error)}</p>}
    </div>
);

const Alert = ({ message, type = 'info', onClose, className = '' }) => {
  const alertStyles = {
    info: "bg-blue-100 border-[--brand-color] text-blue-700 dark:bg-blue-900/50 dark:border-[--brand-color] dark:text-blue-300",
    success: "bg-green-100 border-green-500 text-green-700 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300",
    warning: "bg-yellow-100 border-yellow-500 text-yellow-700 dark:bg-yellow-900/50 dark:border-yellow-700 dark:text-yellow-300",
    error: "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/50 dark:border-red-700 dark:text-red-300",
  };
  const IconType = { info: Info, success: CheckCircle, warning: AlertTriangle, error: XCircle };
  return (
    <div className={`border-l-4 p-4 rounded-md shadow-md ${alertStyles[type]} flex items-start ${className}`} role="alert">
      <Icon name={IconType[type] || Info} className="mr-3 mt-0.5 flex-shrink-0" />
      <div className="flex-grow">
        <p className="font-medium">{t(`alert.${type}.title`)}</p>
        <p className="text-sm">{t(message)}</p>
      </div>
      {onClose && <Button onClick={onClose} variant="ghost" size="sm" className="ml-auto -mr-1 -mt-1"><Icon name={X} size={16} /></Button>}
    </div>
  );
};

const ComingSoon = ({ featureName }: { featureName?: string }) => (
  <Card className="text-center">
    <Icon name={Zap} size={32} className="mx-auto mb-3 text-slate-400 dark:text-slate-500" />
    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{t('common.coming_soon')}</h3>
    {featureName && <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.feature_in_development', { feature: t(featureName) })}</p>}
  </Card>
);

const LanguageSwitcher = ({ preserveQuery = true }: { preserveQuery?: boolean }) => {
  const [currentLocale, setCurrentLocale] = useState(getCurrentLocale());
  const locales = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  ];
  const [isOpen, setIsOpen] = useState(false);

  const switchLocale = (localeCode: string) => {
    // @ts-ignore
    window.__locale = localeCode; // Simulate locale change
    setCurrentLocale(localeCode);
    setIsOpen(false);
    // In Next.js, this would involve router.push with new locale and query params
    console.log(`Language switched to ${localeCode}. In Next.js, this would update URL and re-render.`);
    if (preserveQuery && typeof window !== 'undefined') {
      console.log(`Current query: ${window.location.search}`);
    }
    // Force re-render of parent for mockup, real app would re-render due to next-intl provider update
    // This is a hack for the mockup:
    (window as any).appRoot?.forceUpdate(); 
  };

  const selectedLocale = locales.find(l => l.code === currentLocale) || locales[0];

  return (
    <div className="relative">
      <Button variant="ghost" onClick={() => setIsOpen(!isOpen)} className="flex items-center" aria-label={t('common.language_switcher.toggle_label')}>
        <span className="mr-1 sm:mr-2">{selectedLocale.flag}</span>
        <span className="hidden sm:inline">{selectedLocale.name}</span>
        <Icon name={ChevronDown} size={16} className="ml-1" />
      </Button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-slate-700 rounded-2xl shadow-lg py-1 z-50">
          {locales.map(locale => (
            <button
              key={locale.code}
              onClick={() => switchLocale(locale.code)}
              className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"
              role="menuitem"
            >
              <span className="mr-2">{locale.flag}</span> {locale.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const StarRating = ({ value, count, size = "md", interactive = false, onRate }: { value: number, count?: number, size?: "sm" | "md" | "lg", interactive?: boolean, onRate?: (rating: number) => void }) => {
  const stars = Array(5).fill(0);
  const iconSize = size === "sm" ? 16 : size === "md" ? 20 : 24;
  const [hoverRating, setHoverRating] = useState(0);
  
  const handleClick = (rating: number) => {
    if (interactive && onRate) {
      onRate(rating);
    }
  };

  return (
    <div className="flex items-center">
      {stars.map((_, index) => {
        const ratingValue = index + 1;
        let starState = "empty";
        if ((hoverRating || value) >= ratingValue) {
          starState = "full";
        } else if ((hoverRating || value) > index && (hoverRating || value) < ratingValue) {
          starState = "half"; // simple half, could be more precise
        }
        
        return (
          <button 
            key={index} 
            disabled={!interactive}
            onClick={() => handleClick(ratingValue)}
            onMouseEnter={() => interactive && setHoverRating(ratingValue)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            aria-label={interactive ? t('rating.set_stars', {count: ratingValue}) : t('rating.current_stars', {count: value})}
            className={`p-0.5 ${interactive ? 'cursor-pointer' : ''}`}
          >
            <Star 
              size={iconSize} 
              className={`
                ${starState === "full" ? 'text-yellow-400 fill-yellow-400' : 
                  starState === "half" ? 'text-yellow-400 fill-yellow-400 opacity-50' : // Simple half star for now
                  'text-slate-300 dark:text-slate-600 fill-slate-300 dark:fill-slate-600'}`} 
            />
          </button>
        );
      })}
      {count !== undefined && <span className={`ml-2 text-sm text-slate-500 dark:text-slate-400 ${size === "sm" ? "text-xs" : ""}`}>({count})</span>}
      {value === 0 && count === 0 && !interactive && <span className="ml-1 text-xs text-slate-400 dark:text-slate-500">{t('rating.no_reviews')}</span>}
    </div>
  );
};

const QRCodeDisplay = ({ value, size = 256 }: { value: string, size?: number }) => (
  <div className="flex flex-col items-center">
    {/* In a real app, use a QR library like qrcode.react */}
    <div style={{ width: size, height: size }} className="bg-slate-200 dark:bg-slate-700 flex items-center justify-center rounded-lg">
      <QrCode size={size * 0.8} className="text-slate-600 dark:text-slate-300" />
    </div>
    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 break-all max-w-[256px] text-center">{value}</p>
  </div>
);

// --- Admin Layout Components ---
const AdminHeader = ({ toggleSidebar, currentViewName, restaurantSettings }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="bg-white dark:bg-slate-800 shadow-lg sticky top-0 z-30">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" onClick={toggleSidebar} className="lg:hidden mr-2" aria-label={t('admin.sidebar.toggle')}>
            <Icon name={MenuIcon} />
          </Button>
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{t(currentViewName)}</h1>
        </div>
        <div className="flex items-center space-x-1 sm:space-x-3">
          <LanguageSwitcher />
          <Button variant="ghost" onClick={toggleTheme} aria-label={t('theme.toggle')}>
            <Icon name={theme === 'light' ? Moon : Sun} />
          </Button>
          <div className="relative group">
            <Button variant="ghost" className="flex items-center" aria-label={t('admin.user_menu.toggle')}>
              <img src="https://placehold.co/32x32/CBD5E1/475569?text=A" alt={t('admin.user_menu.admin_alt')} className="w-8 h-8 rounded-full mr-0 sm:mr-2" />
              <span className="hidden sm:inline">{t('admin.user_menu.admin_user')}</span>
              <Icon name={ChevronDown} size={16} className="ml-0 sm:ml-1 hidden sm:inline" />
            </Button>
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 rounded-2xl shadow-xl py-1 hidden group-focus-within:block group-hover:block z-20">
              <a href="#" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">{t('admin.user_menu.profile')}</a>
              <a href="#" className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600">{t('admin.user_menu.settings')}</a>
              <a href="#" className="block px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-600">{t('admin.user_menu.logout')}</a>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

const AdminSidebar = ({ currentView, setView, isOpen, setIsOpen, restaurantSettings }) => {
  const NavItem = ({ icon, label, viewName }) => (
    <button
      onClick={() => { setView(viewName); if (isOpen && window.innerWidth < 1024) setIsOpen(false); }}
      className={`flex items-center w-full px-3 py-3 text-left rounded-xl transition-colors duration-150 ease-in-out
        ${currentView === viewName 
          ? 'bg-[--brand-color] text-white' 
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
      aria-current={currentView === viewName ? "page" : undefined}
    >
      <Icon name={icon} className="mr-3" />
      <span className="font-medium">{t(label)}</span>
    </button>
  );

  return (
    <>
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 shadow-xl transform 
                      lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen
                      ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                      transition-transform duration-300 ease-in-out overflow-y-auto pb-4 flex flex-col`}>
        <div className="flex items-center justify-between h-16 px-4 border-b dark:border-slate-700 flex-shrink-0">
          <div className="flex items-center">
            <img src={restaurantSettings.logoUrl} alt={`${restaurantSettings.name} ${t('logo_alt_suffix')}`} className="h-8 w-8 rounded-md mr-2 object-contain bg-slate-200 p-0.5" />
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate" title={restaurantSettings.name}>{restaurantSettings.name}</span>
          </div>
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="lg:hidden" aria-label={t('admin.sidebar.close')}>
            <Icon name={X} />
          </Button>
        </div>
        <nav className="p-4 space-y-1.5 flex-grow">
          <NavItem icon={Home} label="admin.sidebar.dashboard" viewName="adminDashboard" />
          <NavItem icon={Settings} label="admin.sidebar.restaurant_settings" viewName="adminSettings" />
          <NavItem icon={ClipboardList} label="admin.sidebar.menu_management" viewName="adminMenu" />
          <NavItem icon={TableSimpleIcon} label="admin.sidebar.table_qr_management" viewName="adminTables" />
          <NavItem icon={UserCog} label="admin.sidebar.employees_schedules" viewName="adminEmployees" />
          {FEATURE_FLAGS.tableBooking && <NavItem icon={BookUser} label="admin.sidebar.bookings_preorders" viewName="adminBookings" />}
          <NavItem icon={BarChartBig} label="admin.sidebar.reports_analytics" viewName="adminReports" />
          
          <hr className="my-3 border-slate-200 dark:border-slate-700" />
          <NavItem icon={Palette} label="admin.sidebar.design_system" viewName="designSystem" />
        </nav>
        <div className="p-4 mt-auto flex-shrink-0 border-t dark:border-slate-700">
          <NavItem icon={Eye} label="admin.sidebar.view_customer_site" viewName="customerLanding" />
          <NavItem icon={LogOut} label="admin.sidebar.logout" viewName="logout" />
        </div>
      </aside>
      {isOpen && <div className="fixed inset-0 z-30 bg-black opacity-50 lg:hidden" onClick={() => setIsOpen(false)}></div>}
    </>
  );
};

const AdminLayout = ({ children, currentView, setView, currentViewName, restaurantSettings }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <AdminSidebar currentView={currentView} setView={setView} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} restaurantSettings={restaurantSettings} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} currentViewName={currentViewName} restaurantSettings={restaurantSettings} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

// --- Admin Screens ---
const DashboardScreen = ({ restaurantSettings }) => {
  const StatCard = ({ title, value, icon, trend, color, alert = false }) => (
    <Card className={alert ? 'border-2 border-red-500 dark:border-red-400' : ''}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(title)}</p>
          <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
        <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900`}>
          <Icon name={icon} size={24} className={`text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
      {trend && <p className={`text-sm mt-2 ${trend.startsWith('+') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{t(trend)}</p>}
    </Card>
  );

  const topSeller = MOCK_MENU_CATEGORIES_BASE.flatMap(c => c.items).sort((a,b) => (b.averageRating * b.reviewCount) - (a.averageRating * a.reviewCount))[0];
  const lowStockItems = MOCK_MENU_CATEGORIES_BASE.flatMap(c => c.items).filter(item => item.stockLevel !== undefined && item.stockLevel < 10);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="admin.dashboard.cards.todays_sales" value={t('currency_format', {value: 1280.50})} icon={DollarSign} trend="+5.2% vs yesterday" color="blue" />
        <StatCard title="admin.dashboard.cards.active_orders" value="8" icon={ShoppingCart} trend="-2 vs last hour" color="indigo" />
        <StatCard title="admin.dashboard.cards.top_seller" value={getLocalizedText(topSeller.name, getCurrentLocale())} icon={TrendingUp} trend={`${topSeller.averageRating} stars`} color="emerald" />
        {FEATURE_FLAGS.lowStockAlerts ? (
            <StatCard title="admin.dashboard.cards.low_stock_alerts" value={String(lowStockItems.length)} icon={AlertTriangle} trend={lowStockItems.length > 0 ? t('common.needs_attention') : t('common.all_good')} color="amber" alert={lowStockItems.length > 0} />
        ) : (
            <Card><ComingSoon featureName="feature.low_stock_alerts" /></Card>
        )}
      </div>
      {/* ... rest of DashboardScreen (Recent Orders, Quick Actions) ... existing one is good */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">{t('admin.dashboard.recent_orders')}</h3>
          {/* Placeholder for recent orders table */}
           <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.data_table_placeholder')}</p>
        </Card>
        <Card>
          <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">{t('admin.dashboard.quick_actions')}</h3>
          <div className="space-y-3">
            <Button variant="primary" className="w-full" iconLeft={PlusCircle}>{t('admin.menu.add_item_short')}</Button>
            <Button variant="secondary" className="w-full" iconLeft={QrCode}>{t('admin.tables.generate_qr_short')}</Button>
            <Button variant="secondary" className="w-full" iconLeft={UserPlus}>{t('admin.employees.add_employee_short')}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const RestaurantSettingsScreen = ({ restaurantSettings, setRestaurantSettingsGlobally }) => {
  const [settings, setSettings] = useState(restaurantSettings);
  const [showNotification, setShowNotification] = useState(false);
  const [logoPreview, setLogoPreview] = useState(settings.logoUrl);

  useEffect(() => { setSettings(restaurantSettings); setLogoPreview(restaurantSettings.logoUrl); }, [restaurantSettings]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'file') {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLogoPreview(reader.result as string);
          setSettings(prev => ({ ...prev, logoFile: file, logoUrl: reader.result as string })); // Store file for upload, update URL for preview
        };
        reader.readAsDataURL(file);
      }
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Settings saved:", settings); // Mock API call
    setRestaurantSettingsGlobally(settings); 
    document.documentElement.style.setProperty('--brand-color', settings.primaryColor); // Update live brand color
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('admin.settings.title')}</h2>
      </div>
      {showNotification && <Alert type="success" message={t('admin.settings.save_success_msg')} onClose={() => setShowNotification(false)} className="mb-4" />}
      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form fields from existing mockup, add defaultLocale and logo upload */}
          <Input label="admin.settings.restaurant_name" name="name" value={settings.name} onChange={handleChange} required />
          <Input label="admin.settings.contact_email" name="contactEmail" type="email" value={settings.contactEmail} onChange={handleChange} />
          <Input label="admin.settings.phone" name="phone" type="tel" value={settings.phone} onChange={handleChange} />
          <Textarea label="admin.settings.address" name="address" value={settings.address} onChange={handleChange} />
          <Textarea label="admin.settings.hours" name="hours" value={settings.hours} onChange={handleChange} rows={3} placeholder={t('admin.settings.hours_placeholder')}/>
          <Textarea label="admin.settings.description" name="description" value={settings.description} onChange={handleChange} rows={4} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            <div>
              <label htmlFor="logoUpload" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('admin.settings.logo_upload')}</label>
              <div className="flex items-center">
                <input type="file" id="logoUpload" name="logoUpload" accept="image/*" onChange={handleChange} className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[--brand-color] file:text-white hover:file:opacity-90 cursor-pointer"/>
              </div>
               <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('admin.settings.logo_url_fallback')}:</p>
              <Input name="logoUrl" value={settings.logoUrl} onChange={handleChange} placeholder={t('admin.settings.logo_url_placeholder')} className="mt-1"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('admin.settings.logo_preview')}</label>
              <img src={logoPreview || 'https://placehold.co/100x100/E2E8F0/334155?text=Logo'} alt={t('admin.settings.logo_preview_alt')} className="w-24 h-24 object-contain rounded-md border border-slate-300 dark:border-slate-600 p-1 bg-slate-50 dark:bg-slate-700" onError={(e) => e.target.src = 'https://placehold.co/100x100/FF0000/FFFFFF?text=Error'}/>
            </div>
          </div>

          <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 pt-4 border-t border-slate-200 dark:border-slate-700">{t('admin.settings.branding_colors')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="admin.settings.primary_color" name="primaryColor" type="color" value={settings.primaryColor} onChange={handleChange} className="w-full h-12 p-1" />
            <Input label="admin.settings.secondary_color" name="secondaryColor" type="color" value={settings.secondaryColor} onChange={handleChange} className="w-full h-12 p-1" />
          </div>

          <Select label="admin.settings.default_language" name="defaultLocale" value={settings.defaultLocale} onChange={handleChange}>
            <option value="en">English</option>
            <option value="ja">日本語 (Japanese)</option>
            <option value="vi">Tiếng Việt (Vietnamese)</option>
          </Select>
          
          <div className="flex justify-end pt-6 border-t border-slate-200 dark:border-slate-700">
            <Button type="submit" variant="primary" iconLeft={CheckCircle}>{t('admin.settings.save_button')}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const MenuManagementScreen = ({ restaurantSettings }) => {
  const [menuData, setMenuData] = useState(MOCK_MENU_CATEGORIES_BASE);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCategoryIdForItem, setSelectedCategoryIdForItem] = useState(null);
  const locale = getCurrentLocale();

  // Drag and drop simulation: state for dragged item/category
  const [draggedItem, setDraggedItem] = useState(null);

  const handleOpenCategoryModal = (category = null) => {
    setEditingCategory(category ? { ...category, name: getLocalizedText(category.name, locale) } : { name: '', order: menuData.length + 1 });
    setIsCategoryModalOpen(true);
  };

  const handleOpenItemModal = (category, item = null) => {
    setSelectedCategoryIdForItem(category.id);
    setEditingItem(item ? { ...item, name: getLocalizedText(item.name, locale), description: getLocalizedText(item.description, locale), weekdayVisibility: item.weekdayVisibility || [] } : { name: '', description: '', price: '', imageUrl: '', available: true, weekdayVisibility: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], stockLevel: 100 });
    setIsItemModalOpen(true);
  };
  
  const handleSaveCategory = () => { /* ... */ setIsCategoryModalOpen(false); }; // Simplified
  const handleSaveItem = () => { /* ... */ setIsItemModalOpen(false); }; // Simplified

  const WeekdaySelector = ({ selectedDays, onChange }) => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return (
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('admin.menu.item.weekday_visibility')}</label>
        <div className="flex flex-wrap gap-2">
          {days.map(day => (
            <label key={day} className="flex items-center space-x-1.5 px-2.5 py-1.5 border rounded-lg cursor-pointer hover:border-[--brand-color] has-[:checked]:bg-[--brand-color]/10 has-[:checked]:border-[--brand-color]">
              <input type="checkbox" className="form-checkbox h-4 w-4 text-[--brand-color] rounded border-slate-300 focus:ring-[--brand-color]"
                     checked={selectedDays.includes(day)}
                     onChange={e => {
                       const newDays = e.target.checked ? [...selectedDays, day] : selectedDays.filter(d => d !== day);
                       onChange(newDays);
                     }}/>
              <span className="text-sm text-slate-700 dark:text-slate-300">{t(`weekdays.${day.toLowerCase()}`)}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const MenuItemCard = ({ item, category }) => (
    <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 p-3 hover:shadow-md transition-shadow relative" draggable="true" onDragStart={() => setDraggedItem(item.id)}>
      {item.stockLevel !== undefined && item.stockLevel < 10 && FEATURE_FLAGS.lowStockAlerts && (
        <div className="absolute top-2 right-2 bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-200 text-xs px-2 py-0.5 rounded-full flex items-center">
          <Icon name={AlertTriangle} size={12} className="mr-1" /> {t('admin.menu.item.low_stock')} ({item.stockLevel})
        </div>
      )}
      <div className="flex items-center mb-2 sm:mb-0 flex-grow">
        <img src={item.imageUrl || 'https://placehold.co/80x60/E2E8F0/334155?text=Item'} alt={getLocalizedText(item.name, locale)} className="w-20 h-16 object-cover rounded-md mr-4 flex-shrink-0"/>
        <div className="flex-grow">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100">{getLocalizedText(item.name, locale)}</h4>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('currency_format', {value: item.price})}</p>
          <StarRating value={item.averageRating || 0} count={item.reviewCount || 0} size="sm"/>
          <div className="mt-1 flex flex-wrap gap-1">
            {item.weekdayVisibility.map(day => <span key={day} className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">{t(`weekdays.${day.toLowerCase()}_short`)}</span>)}
          </div>
        </div>
      </div>
      <div className="flex space-x-1 sm:space-x-2 mt-2 sm:mt-0 self-end sm:self-center flex-shrink-0">
         <span className={`text-xs font-medium px-2 py-1 rounded-full ${item.available ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300'}`}>
            {item.available ? t('common.available') : t('common.unavailable')}
          </span>
        <Button size="sm" variant="ghost" iconLeft={SquarePen} onClick={() => handleOpenItemModal(category, item)}>{t('common.edit')}</Button>
        <Button size="sm" variant="ghost" iconLeft={Trash2} className="text-red-500 hover:text-red-600">{t('common.delete')}</Button>
      </div>
    </Card>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('admin.menu.title')}</h2>
        <Button onClick={() => handleOpenCategoryModal()} iconLeft={PlusCircle}>{t('admin.menu.add_category')}</Button>
      </div>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t('admin.menu.drag_reorder_hint')}</p>

      {menuData.sort((a,b) => a.order - b.order).map(category => (
        <Card key={category.id} className="mb-6" draggable="true" onDragStart={() => setDraggedItem(category.id)}>
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 gap-2">
            <div className="flex items-center">
              <Icon name={MenuIcon} className="mr-2 text-slate-400 cursor-grab" title={t('admin.menu.drag_category_title')}/>
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{getLocalizedText(category.name, locale)}</h3>
            </div>
            <div className="flex space-x-1 sm:space-x-2 self-start sm:self-center">
              <Button size="sm" variant="secondary" iconLeft={PlusCircle} onClick={() => handleOpenItemModal(category)}>{t('admin.menu.add_item')}</Button>
              <Button size="sm" variant="ghost" iconLeft={SquarePen} onClick={() => handleOpenCategoryModal(category)}>{t('common.edit')}</Button>
              <Button size="sm" variant="ghost" iconLeft={Trash2} className="text-red-500 hover:text-red-600">{t('common.delete')}</Button>
            </div>
          </div>
          {category.items.length > 0 ? (
            category.items.map(item => <MenuItemCard key={item.id} item={item} category={category} />)
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">{t('admin.menu.no_items_in_category')}</p>
          )}
        </Card>
      ))}

      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title={editingCategory?.id ? t('admin.menu.edit_category') : t('admin.menu.add_category')}>
        {editingCategory && (
          <form onSubmit={(e) => { e.preventDefault(); handleSaveCategory(); }}>
            {/* Form for category name (multi-language input simulation) */}
            <Input label="admin.menu.category.name_en" name="name_en" value={editingCategory.name?.en || editingCategory.name || ''} onChange={e => setEditingCategory({...editingCategory, name: {...(editingCategory.name||{}), en: e.target.value}})} required />
            <Input label="admin.menu.category.name_ja" name="name_ja" value={editingCategory.name?.ja || ''} onChange={e => setEditingCategory({...editingCategory, name: {...(editingCategory.name||{}), ja: e.target.value}})} />
            <Input label="admin.menu.category.name_vi" name="name_vi" value={editingCategory.name?.vi || ''} onChange={e => setEditingCategory({...editingCategory, name: {...(editingCategory.name||{}), vi: e.target.value}})} />
            <Input label="admin.menu.category.order" name="order" type="number" value={editingCategory.order} onChange={e => setEditingCategory({...editingCategory, order: parseInt(e.target.value) || 0})} required />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('common.zod_form_hint')}</p>
            <div className="flex justify-end space-x-2 mt-6">
              <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="primary">{t('common.save')}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={isItemModalOpen} onClose={() => setIsItemModalOpen(false)} title={editingItem?.id ? t('admin.menu.edit_item') : t('admin.menu.add_item')} size="xl">
        {editingItem && (
          <form onSubmit={(e) => { e.preventDefault(); handleSaveItem(); }}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              <div>
                <Input label="admin.menu.item.name_en" name="name_en" value={editingItem.name?.en || editingItem.name || ''} onChange={e => setEditingItem({...editingItem, name: {...(editingItem.name||{}), en: e.target.value}})} required />
                <Input label="admin.menu.item.name_ja" name="name_ja" value={editingItem.name?.ja || ''} onChange={e => setEditingItem({...editingItem, name: {...(editingItem.name||{}), ja: e.target.value}})} />
                <Input label="admin.menu.item.name_vi" name="name_vi" value={editingItem.name?.vi || ''} onChange={e => setEditingItem({...editingItem, name: {...(editingItem.name||{}), vi: e.target.value}})} />

                <Textarea label="admin.menu.item.description_en" name="description_en" value={editingItem.description?.en || editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: {...(editingItem.description||{}), en: e.target.value}})} />
                <Textarea label="admin.menu.item.description_ja" name="description_ja" value={editingItem.description?.ja || ''} onChange={e => setEditingItem({...editingItem, description: {...(editingItem.description||{}), ja: e.target.value}})} />
                <Textarea label="admin.menu.item.description_vi" name="description_vi" value={editingItem.description?.vi || ''} onChange={e => setEditingItem({...editingItem, description: {...(editingItem.description||{}), vi: e.target.value}})} />
              </div>
              <div>
                <Input label="admin.menu.item.price" name="price" type="number" step="0.01" value={editingItem.price} onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value) || 0})} required />
                <Input label="admin.menu.item.image_url" name="imageUrl" value={editingItem.imageUrl} onChange={e => setEditingItem({...editingItem, imageUrl: e.target.value})} placeholder="https://example.com/image.jpg" />
                <div className="mb-4">
                    <label htmlFor="itemImageUpload" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t('admin.menu.item.upload_image')}</label>
                    <Input type="file" id="itemImageUpload" name="itemImageUpload" accept="image/*" onChange={() => console.log("Image upload field changed")} />
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('admin.menu.item.image_upload_note')}</p>
                </div>
                 <Input label="admin.menu.item.stock_level" name="stockLevel" type="number" value={editingItem.stockLevel || ''} onChange={e => setEditingItem({...editingItem, stockLevel: parseInt(e.target.value) })} placeholder={t('admin.menu.item.stock_level_optional')} />
                <div className="my-4">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-[--brand-color] rounded border-slate-300 focus:ring-[--brand-color]"
                      checked={editingItem.available}
                      onChange={e => setEditingItem({...editingItem, available: e.target.checked})} />
                    <span className="text-slate-700 dark:text-slate-300">{t('admin.menu.item.is_available')}</span>
                  </label>
                </div>
              </div>
            </div>
            <WeekdaySelector selectedDays={editingItem.weekdayVisibility} onChange={(days) => setEditingItem({...editingItem, weekdayVisibility: days})} />
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">{t('common.zod_form_hint')}</p>
            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t dark:border-slate-700">
              <Button type="button" variant="secondary" onClick={() => setIsItemModalOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" variant="primary">{t('common.save')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

const TableManagementScreen = ({ restaurantSettings }) => {
  const [tables, setTables] = useState(MOCK_TABLES_BASE);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [selectedTableForQr, setSelectedTableForQr] = useState(null);

  const handleOpenTableModal = (table = null) => { /* ... */ setIsTableModalOpen(true); };
  const handleSaveTable = () => { /* ... */ setIsTableModalOpen(false); };

  const handleGenerateQr = (table) => {
    setSelectedTableForQr(table);
    setIsQrModalOpen(true);
  };

  const qrCodeUrl = selectedTableForQr ? `https://${restaurantSettings.name.toLowerCase().replace(/\s+/g, '')}.shop-copilot.com/${getCurrentLocale()}/customer/order?tableId=${selectedTableForQr.id}` : '';

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('admin.tables.title')}</h2>
        <Button onClick={() => handleOpenTableModal()} iconLeft={PlusCircle}>{t('admin.tables.add_table')}</Button>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {tables.map(table => (
          <Card key={table.id}>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{table.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.tables.capacity')}: {table.capacity}</p>
            {table.position && <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.tables.position')}: {table.position}</p>}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" iconLeft={SquarePen} onClick={() => handleOpenTableModal(table)}>{t('common.edit')}</Button>
              <Button size="sm" variant="primary" iconLeft={QrCode} onClick={() => handleGenerateQr(table)}>{t('admin.tables.generate_qr')}</Button>
              {/* Add Delete button here */}
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isTableModalOpen} onClose={() => setIsTableModalOpen(false)} title={editingTable ? t('admin.tables.edit_table') : t('admin.tables.add_table')}>
        {/* Table Add/Edit Form */}
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('common.form_placeholder')}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">{t('common.zod_form_hint')}</p>
        <div className="flex justify-end space-x-2 mt-6"> <Button type="button" variant="secondary" onClick={() => setIsTableModalOpen(false)}>{t('common.cancel')}</Button> <Button type="submit" variant="primary">{t('common.save')}</Button> </div>
      </Modal>

      <Modal isOpen={isQrModalOpen} onClose={() => setIsQrModalOpen(false)} title={`${t('admin.tables.qr_for_table')} ${selectedTableForQr?.name || ''}`} size="sm">
        {selectedTableForQr && (
          <div className="text-center">
            <QRCodeDisplay value={qrCodeUrl} size={256} />
            <Button variant="primary" iconLeft={FileDown} className="mt-6 w-full" onClick={() => alert(t('admin.tables.download_png_action'))}>
              {t('admin.tables.download_png')}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

const EmployeeManagementScreen = () => {
  const [employees, setEmployees] = useState(MOCK_EMPLOYEES_BASE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'schedule'

  const roles = ['manager', 'chef', 'server', 'cashier'];
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const timeSlots = Array.from({ length: 18 }, (_, i) => `${String(i + 6).padStart(2, '0')}:00`); // 06:00 to 23:00

  const handleOpenModal = (employee = null) => {
    setEditingEmployee(employee || { name: '', email: '', role: 'server', shifts: {} });
    setIsModalOpen(true);
  };
  const handleSave = () => { /* ... */ setIsModalOpen(false); };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('admin.employees.title')}</h2>
        <div className="flex items-center space-x-2">
          <div className="p-0.5 bg-slate-200 dark:bg-slate-700 rounded-xl flex">
            <Button size="sm" variant={viewMode === 'list' ? 'primary' : 'ghost'} onClick={() => setViewMode('list')} className={`rounded-lg ${viewMode === 'list' ? '' : 'text-slate-600 dark:text-slate-300'}`}><Icon name={List} className="mr-1 sm:mr-2" /> {t('common.list')}</Button>
            <Button size="sm" variant={viewMode === 'schedule' ? 'primary' : 'ghost'} onClick={() => setViewMode('schedule')} className={`rounded-lg ${viewMode === 'schedule' ? '' : 'text-slate-600 dark:text-slate-300'}`}><Icon name={Calendar} className="mr-1 sm:mr-2" /> {t('common.schedule')}</Button>
          </div>
          <Button onClick={() => handleOpenModal()} iconLeft={UserPlus}>{t('admin.employees.add_employee')}</Button>
        </div>
      </div>

      {viewMode === 'list' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.map(emp => (
            <Card key={emp.id}>
              <h3 className="text-lg font-semibold">{emp.name}</h3>
              <p className="text-sm text-[--brand-color]">{t(`roles.${emp.role}`)}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{emp.email}</p>
              <div className="mt-4 flex justify-end">
                <Button size="sm" variant="secondary" iconLeft={SquarePen} onClick={() => handleOpenModal(emp)}>{t('common.edit')}</Button>
                {/* Delete button */}
              </div>
            </Card>
          ))}
        </div>
      )}

      {viewMode === 'schedule' && (
        <Card noPadding>
          <p className="p-4 text-sm text-slate-600 dark:text-slate-400">{t('admin.employees.schedule_calendar_note')}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700">
                  <th className="sticky left-0 z-10 bg-slate-50 dark:bg-slate-700 p-2 border dark:border-slate-600 text-left">{t('admin.employees.employee_name')}</th>
                  {daysOfWeek.map(day => <th key={day} className="p-2 border dark:border-slate-600 text-center">{t(`weekdays.${day.toLowerCase()}`)}</th>)}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-800 p-2 border dark:border-slate-600 font-medium">
                      {emp.name}<br/><span className="text-xs text-[--brand-color]">{t(`roles.${emp.role}`)}</span>
                    </td>
                    {daysOfWeek.map(day => (
                      <td key={day} className="p-1 border dark:border-slate-600 text-center align-top">
                        <div className={`p-1.5 rounded text-xs min-h-[30px] ${emp.shifts[day] ? 'bg-[--brand-color]/20 text-[--brand-color]-700 dark:text-[--brand-color]-300' : 'text-slate-400 dark:text-slate-500'}`}>
                          {emp.shifts[day] || t('common.off_duty')}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t dark:border-slate-700 text-right">
            <Button iconLeft={CalendarCheck2} onClick={() => alert(t('admin.employees.edit_shifts_action'))}>{t('admin.employees.edit_shifts')}</Button>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingEmployee?.id ? t('admin.employees.edit_employee') : t('admin.employees.add_employee')} size="lg">
        {editingEmployee && (
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <Input label="admin.employees.form.full_name" name="name" value={editingEmployee.name} onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value})} required />
            <Input label="admin.employees.form.email_lookup" name="email" type="email" value={editingEmployee.email} onChange={e => setEditingEmployee({...editingEmployee, email: e.target.value})} required placeholder={t('admin.employees.form.email_lookup_placeholder')}/>
            <Select label="admin.employees.form.role" name="role" value={editingEmployee.role} onChange={e => setEditingEmployee({...editingEmployee, role: e.target.value})}>
              {roles.map(role => <option key={role} value={role}>{t(`roles.${role}`)}</option>)}
            </Select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">{t('common.zod_form_hint')}</p>
            <div className="flex justify-end space-x-2 mt-6"> <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>{t('common.cancel')}</Button> <Button type="submit" variant="primary">{t('common.save')}</Button> </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

const BookingsManagementScreen = ({ restaurantSettings }) => {
    const [bookings, setBookings] = useState(MOCK_BOOKINGS_BASE);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const menuItems = MOCK_MENU_CATEGORIES_BASE.flatMap(cat => cat.items);
    const locale = getCurrentLocale();

    if (!FEATURE_FLAGS.tableBooking) return <ComingSoon featureName="feature.table_booking_admin" />;

    const handleViewDetails = (booking) => { setSelectedBooking(booking); setIsDetailModalOpen(true); };
    const handleUpdateStatus = (bookingId, status) => {
        setBookings(prev => prev.map(b => b.id === bookingId ? {...b, status} : b));
        if (selectedBooking?.id === bookingId) setSelectedBooking(prev => ({...prev, status}));
        if (status === 'confirmed' || status === 'canceled') setIsDetailModalOpen(false);
    };
    
    const statusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-800 dark:text-yellow-300',
            confirmed: 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300',
            canceled: 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300',
        };
        return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[status]}`}>{t(`bookings.status.${status}`)}</span>;
    };

    return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">{t('admin.bookings.title')}</h2>
      <Card noPadding>
        <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
            <tr>
              {['customer_name', 'contact', 'date_time', 'party_size', 'status', 'actions'].map(col => (
                <th key={col} scope="col" className="px-4 py-3">{t(`admin.bookings.table.${col}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map(booking => (
              <tr key={booking.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                <td className="px-4 py-3 font-medium">{booking.customerName}</td>
                <td className="px-4 py-3">{booking.contact}</td>
                <td className="px-4 py-3">{booking.date} @ {booking.time}</td>
                <td className="px-4 py-3 text-center">{booking.partySize}</td>
                <td className="px-4 py-3">{statusBadge(booking.status)}</td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="ghost" iconLeft={Eye} onClick={() => handleViewDetails(booking)}>{t('common.view_details')}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>

      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={t('admin.bookings.details_title')} size="lg">
        {selectedBooking && (
          <div>
            <p><strong>{t('admin.bookings.table.customer_name')}:</strong> {selectedBooking.customerName}</p>
            <p><strong>{t('admin.bookings.table.contact')}:</strong> {selectedBooking.contact}</p>
            <p><strong>{t('admin.bookings.table.date_time')}:</strong> {selectedBooking.date} @ {selectedBooking.time}</p>
            <p><strong>{t('admin.bookings.table.party_size')}:</strong> {selectedBooking.partySize}</p>
            <p><strong>{t('admin.bookings.table.status')}:</strong> {statusBadge(selectedBooking.status)}</p>
            
            {selectedBooking.preOrderItems.length > 0 && (
                <div className="mt-4">
                    <h4 className="font-semibold mb-1">{t('admin.bookings.preorder_items')}:</h4>
                    <ul className="list-disc list-inside text-sm">
                        {selectedBooking.preOrderItems.map(itemOrder => {
                            const menuItem = menuItems.find(mi => mi.id === itemOrder.itemId);
                            return <li key={itemOrder.itemId}>{itemOrder.quantity}x {menuItem ? getLocalizedText(menuItem.name, locale) : t('common.unknown_item')}</li>;
                        })}
                    </ul>
                </div>
            )}
            {selectedBooking.preOrderItems.length === 0 && <p className="text-sm mt-2 text-slate-500">{t('admin.bookings.no_preorder_items')}</p>}

            {selectedBooking.status === 'pending' && (
                <div className="mt-6 flex justify-end space-x-2">
                    <Button variant="danger" onClick={() => handleUpdateStatus(selectedBooking.id, 'canceled')}>{t('common.cancel_booking')}</Button>
                    <Button variant="primary" onClick={() => handleUpdateStatus(selectedBooking.id, 'confirmed')}>{t('common.confirm_booking')}</Button>
                </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

const ReportsScreen = ({ restaurantSettings }) => {
  const [activeTab, setActiveTab] = useState('sales'); // sales, items, feedback
  const [dateRange, setDateRange] = useState('last7days');

  const SummaryCard = ({ title, value, icon, color }) => ( /* Same as DashboardScreen's StatCard */
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t(title)}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
        <div className={`p-2.5 rounded-full bg-${color}-100 dark:bg-${color}-900`}>
          <Icon name={icon} size={20} className={`text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </Card>
  );
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'sales': return <SalesReportsTab dateRange={dateRange} setDateRange={setDateRange} />;
      case 'items': return <ItemsReportTab />;
      case 'feedback': return <FeedbackReportTab />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{t('admin.reports.title')}</h2>
      
      {/* Reports Home Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="admin.reports.summary.total_sales_today" value={t('currency_format', {value: 1280.50})} icon={DollarSign} color="blue" />
        <SummaryCard title="admin.reports.summary.active_orders_count" value="8" icon={ShoppingCart} color="indigo" />
        <SummaryCard title="admin.reports.summary.top_selling_item_today" value={getLocalizedText(MOCK_MENU_CATEGORIES_BASE[0].items[0].name, getCurrentLocale())} icon={TrendingUp} color="emerald" />
        {FEATURE_FLAGS.lowStockAlerts ? (
            <SummaryCard title="admin.reports.summary.low_stock_alerts_count" value="3" icon={AlertTriangle} color="amber" />
        ): (
            <Card className="flex items-center justify-center"><ComingSoon featureName="feature.low_stock_alerts" /></Card>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
        {['sales', 'items', 'feedback'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 -mb-px font-medium text-sm focus:outline-none
                    ${activeTab === tab 
                      ? 'border-b-2 border-[--brand-color] text-[--brand-color]' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
            {t(`admin.reports.tabs.${tab}`)}
          </button>
        ))}
      </div>
      
      {renderTabContent()}

      {FEATURE_FLAGS.recommendationsWidget && (
        <Card className="mt-8">
          <h3 className="text-lg font-semibold mb-3">{t('admin.reports.recommendations.title')}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{t('admin.reports.recommendations.description_7_days')}</p>
          <ul className="space-y-1 text-sm">
            {[MOCK_MENU_CATEGORIES_BASE[0].items[0], MOCK_MENU_CATEGORIES_BASE[1].items[0], MOCK_MENU_CATEGORIES_BASE[1].items[1]].slice(0,3).map(item => (
              <li key={item.id} className="flex justify-between">
                <span>{getLocalizedText(item.name, getCurrentLocale())}</span>
                <span className="font-medium">{Math.floor(Math.random()*50) + 10} {t('common.sold')}</span>
              </li>
            ))}
          </ul>
          <Button variant="primary" className="mt-4 w-full sm:w-auto" iconLeft={Sparkles}>{t('admin.reports.recommendations.apply_button')}</Button>
        </Card>
      )}
    </div>
  );
};

const SalesReportsTab = ({ dateRange, setDateRange }) => (
  <Card>
    <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
      <h3 className="text-xl font-semibold">{t('admin.reports.sales.title')}</h3>
      <div className="flex items-center gap-2">
        <Select value={dateRange} onChange={e => setDateRange(e.target.value)} className="mb-0">
          <option value="last7days">{t('admin.reports.daterange.last_7_days')}</option>
          <option value="last30days">{t('admin.reports.daterange.last_30_days')}</option>
          {/* Custom date range picker would go here */}
        </Select>
        <Button variant="secondary" size="sm" iconLeft={FileCsv}>{t('common.export_csv')}</Button>
        <Button variant="secondary" size="sm" iconLeft={FilePdf}>{t('common.export_pdf')}</Button>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
            <Icon name={BarChartBig} size={48} className="text-slate-400 dark:text-slate-500" />
            <p className="ml-2 text-slate-500 dark:text-slate-400">{t('admin.reports.sales.daily_revenue_chart_placeholder')}</p>
        </div>
        <div className="h-64 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
            <Icon name={PieChartIcon} size={48} className="text-slate-400 dark:text-slate-500" />
            <p className="ml-2 text-slate-500 dark:text-slate-400">{t('admin.reports.sales.category_breakdown_chart_placeholder')}</p>
        </div>
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{t('common.recharts_note')}</p>
  </Card>
);

const ItemsReportTab = () => (
  <Card noPadding>
    <div className="flex justify-between items-center p-4 sm:p-6 border-b dark:border-slate-700">
      <h3 className="text-xl font-semibold">{t('admin.reports.items.title')}</h3>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" iconLeft={FileCsv}>{t('common.export_csv')}</Button>
        <Button variant="secondary" size="sm" iconLeft={FilePdf}>{t('common.export_pdf')}</Button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
          <tr>
            {['item_name', 'total_sold', 'total_revenue', 'avg_rating'].map(col => (
              <th key={col} scope="col" className="px-4 py-3">{t(`admin.reports.items.table.${col}`)} <Icon name={ChevronDown} size={14} className="inline-block ml-1 cursor-pointer"/></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MOCK_MENU_CATEGORIES_BASE.flatMap(c => c.items).slice(0,5).map(item => (
            <tr key={item.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
              <td className="px-4 py-3 font-medium">{getLocalizedText(item.name, getCurrentLocale())}</td>
              <td className="px-4 py-3">{Math.floor(Math.random()*100)+20}</td>
              <td className="px-4 py-3">{t('currency_format', { value: (Math.random()*200+50).toFixed(2)})}</td>
              <td className="px-4 py-3"><StarRating value={item.averageRating || 0} count={item.reviewCount || 0} size="sm"/></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <p className="p-4 text-xs text-slate-500 dark:text-slate-400">{t('common.datatable_component_note')}</p>
  </Card>
);

const FeedbackReportTab = () => {
  const [reviews, setReviews] = useState(MOCK_REVIEWS_BASE);
  const locale = getCurrentLocale();

  const handleResolve = (reviewId) => {
    setReviews(prev => prev.map(r => r.id === reviewId ? {...r, resolved: !r.resolved} : r));
  };

  if (!FEATURE_FLAGS.advancedReviews) return <Card><ComingSoon featureName="feature.advanced_reviews_admin" /></Card>;

  return (
  <Card noPadding>
    <div className="p-4 sm:p-6 border-b dark:border-slate-700">
      <h3 className="text-xl font-semibold">{t('admin.reports.feedback.title')}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.reports.feedback.description_last_50')}</p>
    </div>
    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
      {reviews.map(review => (
        <li key={review.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold">{getLocalizedText(review.menuItemName, locale)}</p>
              <StarRating value={review.rating} size="sm" />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{review.date}</span>
          </div>
          {review.comment && <p className="text-sm mt-1 text-slate-600 dark:text-slate-300 italic">"{review.comment}"</p>}
          <div className="mt-2 flex justify-end">
            <Button size="sm" variant={review.resolved ? "secondary" : "primary"} onClick={() => handleResolve(review.id)}>
              {review.resolved ? t('common.mark_unresolved') : t('common.mark_resolved')}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  </Card>
  );
};

// --- Customer Frontend Components & Screens ---
const CustomerHeader = ({ restaurantSettings, onCartClick, cartItemCount }) => (
  <header className="sticky top-0 z-30 shadow-lg" style={{ backgroundColor: restaurantSettings.primaryColor }}>
    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
      <div className="flex items-center">
        <img src={restaurantSettings.logoUrl} alt={`${restaurantSettings.name} ${t('logo_alt_suffix')}`} className="h-10 w-10 rounded-full mr-3 object-cover bg-white p-0.5" onError={(e) => e.target.src = 'https://placehold.co/40x40/FFFFFF/334155?text=Logo'}/>
        <h1 className="text-xl font-bold text-white">{restaurantSettings.name}</h1>
      </div>
      <div className="flex items-center space-x-1 sm:space-x-2">
        <LanguageSwitcher />
        <Button variant="ghost" onClick={onCartClick} className="text-white hover:bg-white/20 relative" aria-label={t('customer.cart.view_cart_label', {count: cartItemCount})}>
          <Icon name={ShoppingCart} />
          {cartItemCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-[--brand-color]">
              {cartItemCount}
            </span>
          )}
        </Button>
      </div>
    </div>
  </header>
);

const CustomerFooter = ({ restaurantSettings }) => (
  <footer className="bg-slate-100 dark:bg-slate-800 py-8 text-center">
    <p className="text-slate-600 dark:text-slate-400 text-sm">&copy; {new Date().getFullYear()} {restaurantSettings.name}. {t('common.all_rights_reserved')}</p>
    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t('common.powered_by')} Shop-Copilot</p>
  </footer>
);

const CartContext = createContext(null);
const CartProvider = ({ children }) => { /* ... existing CartProvider is good ... */ 
    const [cart, setCart] = useState([]);
    const addToCart = (item, quantity = 1) => {
        setCart(prevCart => {
          const existingItem = prevCart.find(cartItem => cartItem.itemId === item.id);
          if (existingItem) {
            return prevCart.map(cartItem => 
              cartItem.itemId === item.id ? { ...cartItem, qty: cartItem.qty + quantity } : cartItem
            );
          } else {
            return [...prevCart, { itemId: item.id, name: item.name, price: item.price, qty: quantity, imageUrl: item.imageUrl, description: item.description }];
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
    const clearCart = () => setCart([]);
    const totalCartItems = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalCartPrice = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    return <CartContext.Provider value={{ cart, addToCart, updateQuantity, totalCartItems, totalCartPrice, clearCart }}>{children}</CartContext.Provider>;
};
const useCart = () => useContext(CartContext);

const CustomerLayout = ({ children, setView, restaurantSettings }) => {
  const { totalCartItems } = useCart();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <CustomerHeader restaurantSettings={restaurantSettings} onCartClick={() => setView('customerCheckout')} cartItemCount={totalCartItems} />
      <main className="flex-1 container mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
      <CustomerFooter restaurantSettings={restaurantSettings} />
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {FEATURE_FLAGS.aiChat && (
            <Button variant="primary" size="md" className="rounded-full p-3 shadow-xl" aria-label={t('customer.ai_chat.toggle_label')}>
                <Icon name={MessageCircleMore} size={24}/>
            </Button>
        )}
        <Button onClick={() => setView('adminDashboard')} iconLeft={Briefcase} variant="secondary" size="sm" className="hidden sm:flex">{t('common.admin_panel_button')}</Button>
      </div>
    </div>
  );
};

const CustomerMenuScreen = ({ setView, restaurantSettings, viewProps }) => {
  const { cart, addToCart, updateQuantity, totalCartItems, totalCartPrice } = useCart();
  const [showAddedToCartMsg, setShowAddedToCartMsg] = useState('');
  const [menu] = useState(MOCK_MENU_CATEGORIES_BASE);
  const [activeFilters, setActiveFilters] = useState({ sort: 'default', category: 'all' }); // Example filters
  const locale = getCurrentLocale();
  const tableId = viewProps?.tableId; // From QR scan /?tableId={id}
  const sessionId = viewProps?.sessionId; // From API after QR scan
  const sessionStatus = viewProps?.sessionStatus || "new"; // "new", "expired", etc.

  useEffect(() => {
    if (tableId) {
      // Simulate API call for session
      console.log(`Table ID detected: ${tableId}. Mocking session fetch.`);
      // setSessionStatus('new'); // or 'expired' to test
    }
  }, [tableId]);


  if (sessionStatus === "expired") {
    return <Alert type="error" message={t('customer.session.expired_message')} className="max-w-md mx-auto"/>;
  }

  const handleAddToCart = (item, quantity = 1) => {
    addToCart(item, quantity);
    setShowAddedToCartMsg(t('customer.menu.item_added_to_cart_msg', { item: getLocalizedText(item.name, locale) }));
    setTimeout(() => setShowAddedToCartMsg(''), 2000);
  };
  
  const getQuantityInCart = (itemId) => cart.find(ci => ci.itemId === itemId)?.qty || 0;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }); // e.g., "Mon"

  return (
    <div>
      {tableId && <p className="text-center text-sm mb-4 text-slate-600 dark:text-slate-400">{t('customer.menu.ordering_for_table', {tableId})}</p>}
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-1 text-slate-800 dark:text-slate-100">{t('customer.menu.title')}</h2>
      <p className="text-center text-sm mb-6 text-slate-500 dark:text-slate-400">{t('customer.menu.serving_today', {day: t(`weekdays.${today.toLowerCase()}`)})}</p>

      {showAddedToCartMsg && ( /* Alert message as before */
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-[100]">
          <Alert type="success" message={showAddedToCartMsg} onClose={() => setShowAddedToCartMsg('')}/>
        </div>
      )}

      {/* Filters/Sorting Placeholder */}
      <div className="mb-6 flex flex-wrap gap-2 justify-center sm:justify-start">
        <Select value={activeFilters.sort} onChange={e => setActiveFilters(f => ({...f, sort: e.target.value}))} className="mb-0 w-auto">
          <option value="default">{t('customer.menu.filter.sort_default')}</option>
          <option value="top_seller">{t('customer.menu.filter.sort_top_seller')}</option>
          <option value="price_asc">{t('customer.menu.filter.sort_price_asc')}</option>
          <option value="price_desc">{t('customer.menu.filter.sort_price_desc')}</option>
          <option value="rating_desc">{t('customer.menu.filter.sort_rating_desc')}</option>
        </Select>
        {/* Category filter could be tabs or another select */}
      </div>

      {menu.sort((a,b) => a.order - b.order).map(category => (
        <section key={category.id} className="mb-8" id={`category-${category.id}`}>
          <h3 className="text-xl font-semibold mb-4 pb-2 border-b-2" style={{borderColor: restaurantSettings.primaryColor, color: restaurantSettings.primaryColor }}>{getLocalizedText(category.name, locale)}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {category.items
              .filter(item => item.available && item.weekdayVisibility.includes(today)) // Filter by availability and today's weekday
              .map(item => {
                const itemInCartQty = getQuantityInCart(item.id);
                return (
                  <Card key={item.id} className="flex flex-col">
                    <img src={item.imageUrl || 'https://placehold.co/300x200/E2E8F0/334155?text=Food'} alt={getLocalizedText(item.name, locale)} className="w-full h-40 object-cover rounded-t-2xl mb-3" loading="lazy"/>
                    <div className="flex-grow">
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{getLocalizedText(item.name, locale)}</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-1 h-10 overflow-hidden">{getLocalizedText(item.description, locale)}</p>
                      <StarRating value={item.averageRating || 0} count={item.reviewCount || 0} size="sm"/>
                    </div>
                    <div className="flex justify-between items-center mt-3">
                      <p className="text-lg font-bold" style={{color: restaurantSettings.secondaryColor}}>{t('currency_format', {value: item.price})}</p>
                      {itemInCartQty > 0 ? (
                        <div className="flex items-center space-x-2">
                          <Button size="sm" variant="secondary" onClick={() => updateQuantity(item.id, itemInCartQty - 1)} className="p-2 aspect-square rounded-full" aria-label={t('customer.menu.decrease_quantity')}>-</Button>
                          <span className="font-medium w-5 text-center">{itemInCartQty}</span>
                          <Button size="sm" variant="secondary" onClick={() => updateQuantity(item.id, itemInCartQty + 1)} className="p-2 aspect-square rounded-full" aria-label={t('customer.menu.increase_quantity')}>+</Button>
                        </div>
                      ) : (
                        <Button size="sm" onClick={() => handleAddToCart(item)} iconLeft={PlusCircle} style={{ backgroundColor: restaurantSettings.primaryColor }} className="text-white hover:opacity-90">{t('customer.menu.add_to_cart')}</Button>
                      )}
                    </div>
                  </Card>
                );
            })}
            {/* Display unavailable items differently if needed */}
          </div>
        </section>
      ))}
      
      {/* Floating Cart */}
      {totalCartItems > 0 && (
        <div className="sticky bottom-4 z-20 p-1 mt-8">
          <Card className="max-w-md mx-auto shadow-xl backdrop-blur-md bg-opacity-80 dark:bg-opacity-80" style={{backgroundColor: restaurantSettings.primaryColor}}>
            <div className="flex justify-between items-center text-white">
              <div>
                <p className="font-semibold">{t('customer.cart.items_in_cart_plural', {count: totalCartItems})}</p>
                <p className="text-sm">{t('common.total')}: {t('currency_format', {value: totalCartPrice})}</p>
              </div>
              <Button onClick={() => setView('customerCheckout', {tableId, sessionId})} size="md" iconRight={ShoppingCart} className="bg-white hover:bg-slate-100" style={{color: restaurantSettings.primaryColor}}>
                {t('customer.cart.checkout_button')}
              </Button>
            </div>
          </Card>
        </div>
      )}
       {/* Booking button if feature enabled */}
      {FEATURE_FLAGS.tableBooking && (
          <div className="text-center mt-12">
            <Button onClick={() => setView('customerBooking')} size="lg" iconLeft={CalendarDays} style={{ backgroundColor: restaurantSettings.secondaryColor }} className="text-white hover:opacity-90">
                {t('customer.booking.book_table_button')}
            </Button>
          </div>
      )}
    </div>
  );
};

const CheckoutScreen = ({ setView, restaurantSettings, viewProps }) => {
  const { cart, updateQuantity, totalCartPrice, clearCart } = useCart();
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [formError, setFormError] = useState('');
  // Assume cash only as per prompt
  const paymentMethod = "Cash"; 

  if (cart.length === 0 && !isConfirmModalOpen) { // Redirect if cart is empty and not in confirmation
    setView('customerMenu', viewProps); // Pass back tableId, sessionId
    return <p>{t('customer.checkout.redirecting_empty_cart')}</p>;
  }

  const handleConfirmOrder = () => {
    // Mock API call: POST /api/v1/orders/create
    console.log("Order confirmed (Cash Only):", { cart, total: totalCartPrice, tableId: viewProps?.tableId });
    const mockOrderId = `SC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    setIsConfirmModalOpen(false);
    setView('customerThankYou', { orderId: mockOrderId, items: cart, total: totalCartPrice, tableId: viewProps?.tableId });
    clearCart();
  };

  return (
    <div>
      <Button onClick={() => setView('customerMenu', viewProps)} iconLeft={ChevronLeft} variant="ghost" className="mb-4 -ml-2">{t('customer.checkout.back_to_menu')}</Button>
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">{t('customer.checkout.title')}</h2>
      
      {formError && <Alert type="error" message={formError} onClose={() => setFormError('')} className="mb-4"/>}

      <Card className="max-w-lg mx-auto">
        <h3 className="text-xl font-semibold mb-4">{t('customer.checkout.order_summary')}</h3>
        {cart.map(item => (
          <div key={item.itemId} className="flex items-center justify-between py-2 border-b last:border-b-0 dark:border-slate-700">
            <div className="flex items-center">
              <img src={item.imageUrl || 'https://placehold.co/60x40/E2E8F0/334155?text=Item'} alt={getLocalizedText(item.name, getCurrentLocale())} className="w-12 h-10 object-cover rounded mr-3"/>
              <div>
                <p className="font-medium">{getLocalizedText(item.name, getCurrentLocale())}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.qty} x {t('currency_format', {value: item.price})}</p>
              </div>
            </div>
            <p className="font-semibold">{t('currency_format', {value: item.price * item.qty})}</p>
          </div>
        ))}
        <div className="flex justify-between text-lg font-bold mt-4 pt-2 border-t dark:border-slate-700">
          <span>{t('common.total')}:</span>
          <span>{t('currency_format', {value: totalCartPrice})}</span>
        </div>

        <p className="mt-6 text-sm text-center text-slate-600 dark:text-slate-400">
          {viewProps?.tableId ? t('customer.checkout.payment_instruction_table', {tableId: viewProps.tableId}) : t('customer.checkout.payment_instruction_counter')}
        </p>
        
        {!FEATURE_FLAGS.onlinePayment && (
            <Button onClick={() => setIsConfirmModalOpen(true)} size="lg" className="w-full mt-6 text-white hover:opacity-90" style={{ backgroundColor: restaurantSettings.primaryColor }} disabled={cart.length === 0}>
            {t('customer.checkout.confirm_cash_order_button')} ({t('currency_format', {value: totalCartPrice})})
            </Button>
        )}
        {FEATURE_FLAGS.onlinePayment && (
            <>
            <p className="text-center mt-4"><ComingSoon featureName="feature.online_payment" /></p>
             {/* Placeholder for online payment form if enabled later */}
            </>
        )}
      </Card>

      <Modal isOpen={isConfirmModalOpen} onClose={() => setIsConfirmModalOpen(false)} title={t('customer.checkout.confirm_modal_title')} size="sm">
        <p className="mb-4">{t('customer.checkout.confirm_modal_text', {total: t('currency_format', {value: totalCartPrice})})}</p>
        <div className="flex justify-end space-x-3">
            <Button variant="secondary" onClick={() => setIsConfirmModalOpen(false)}>{t('common.cancel')}</Button>
            <Button variant="primary" onClick={handleConfirmOrder} style={{backgroundColor: restaurantSettings.primaryColor}}>{t('common.confirm')}</Button>
        </div>
      </Modal>
    </div>
  );
};

const CustomerThankYouScreen = ({ setView, restaurantSettings, viewProps }) => {
  const { orderId, items, total, tableId } = viewProps;
  const locale = getCurrentLocale();

  return (
    <div className="text-center py-12">
      <Icon name={CheckCircle} size={64} className="mx-auto mb-6 text-green-500 dark:text-green-400" />
      <h2 className="text-3xl font-bold mb-3">{t('customer.thankyou.title')}</h2>
      <p className="text-slate-600 dark:text-slate-300 mb-2">{t('customer.thankyou.subtitle')}</p>
      <p className="text-lg font-semibold mb-6" style={{color: restaurantSettings.primaryColor}}>{t('customer.thankyou.order_id_label')}: {orderId}</p>
      
      <Card className="max-w-md mx-auto mb-8 text-left">
        <h3 className="text-lg font-semibold mb-3">{t('customer.thankyou.order_summary_title')}</h3>
        {items.map(item => (
          <div key={item.itemId} className="flex justify-between text-sm py-1">
            <span>{item.qty}x {getLocalizedText(item.name, locale)}</span>
            <span>{t('currency_format', {value: item.price * item.qty})}</span>
          </div>
        ))}
        <div className="flex justify-between font-bold mt-2 pt-2 border-t dark:border-slate-700">
          <span>{t('common.total')}:</span>
          <span>{t('currency_format', {value: total})}</span>
        </div>
        {tableId && <p className="text-sm mt-2">{t('customer.thankyou.table_number_label')}: {tableId}</p>}
      </Card>
      
      {FEATURE_FLAGS.advancedReviews && (
        <div className="mt-8">
            <h3 className="text-xl font-semibold mb-3">{t('customer.thankyou.rate_dishes_title')}</h3>
            <div className="space-y-3 max-w-md mx-auto">
                {items.slice(0,3).map(item => ( // Show for first few items for brevity
                    <Button key={item.itemId} variant="secondary" className="w-full justify-between" onClick={() => setView('customerReview', { menuItemId: item.itemId, menuItemName: getLocalizedText(item.name, locale) })}>
                        {t('customer.thankyou.rate_this_dish_button', {dish: getLocalizedText(item.name, locale)})}
                        <Icon name={ChevronRight} />
                    </Button>
                ))}
            </div>
        </div>
      )}

      <Button onClick={() => setView('customerMenu')} size="lg" iconLeft={MenuIcon} className="mt-10 text-white hover:opacity-90" style={{ backgroundColor: restaurantSettings.primaryColor }}>
        {t('customer.thankyou.back_to_menu_button')}
      </Button>
    </div>
  );
};

const CustomerReviewScreen = ({ setView, restaurantSettings, viewProps }) => {
    const { menuItemId, menuItemName } = viewProps;
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSubmitReview = (e) => {
        e.preventDefault();
        if (rating === 0) {
            alert(t('customer.review.rating_required_alert'));
            return;
        }
        // Mock API POST /api/v1/reviews/create
        console.log("Submitting review:", { menuItemId, rating, comment });
        setSubmitted(true);
    };

    if (!FEATURE_FLAGS.advancedReviews) return <ComingSoon featureName="feature.customer_reviews" />;

    if (submitted) {
        return (
            <div className="text-center py-12">
                <Icon name={ThumbsUp} size={64} className="mx-auto mb-6 text-green-500 dark:text-green-400" />
                <h2 className="text-3xl font-bold mb-3">{t('customer.review.submission_thank_you_title')}</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">{t('customer.review.submission_thank_you_message')}</p>
                <Button onClick={() => setView('customerMenu')} size="lg" style={{ backgroundColor: restaurantSettings.primaryColor }} className="text-white">{t('customer.thankyou.back_to_menu_button')}</Button>
            </div>
        );
    }
    
    return (
        <div>
            <Button onClick={() => setView('customerMenu')} iconLeft={ChevronLeft} variant="ghost" className="mb-4 -ml-2">{t('customer.checkout.back_to_menu')}</Button>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">{t('customer.review.title')}</h2>
            <p className="text-center text-lg mb-6 text-slate-600 dark:text-slate-400">{menuItemName}</p>
            <Card className="max-w-md mx-auto">
                <form onSubmit={handleSubmitReview}>
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-center mb-2">{t('customer.review.rating_label')}</label>
                        <div className="flex justify-center">
                           <StarRating value={rating} size="lg" interactive onRate={setRating} />
                        </div>
                    </div>
                    <Textarea label="customer.review.comment_label_optional" name="comment" value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder={t('customer.review.comment_placeholder')} />
                    <Button type="submit" size="lg" className="w-full mt-6 text-white" style={{ backgroundColor: restaurantSettings.primaryColor }}>{t('customer.review.submit_button')}</Button>
                </form>
            </Card>
        </div>
    );
};

const CustomerBookingScreen = ({ setView, restaurantSettings }) => {
    const [formData, setFormData] = useState({
        tableId: '', customerName: '', contact: '', date: new Date().toISOString().split('T')[0], time: '19:00', partySize: 2, preOrderItems: []
    });
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const menuItems = MOCK_MENU_CATEGORIES_BASE.flatMap(cat => cat.items).filter(item => item.available); // only available items for preorder
    const locale = getCurrentLocale();

    if (!FEATURE_FLAGS.tableBooking) {
        setView('customerMenu'); // Or show a message
        return <ComingSoon featureName="feature.table_booking_customer" />;
    }

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name === "preOrderItems") {
            const itemId = value;
            setFormData(prev => ({
                ...prev,
                preOrderItems: checked 
                    ? [...prev.preOrderItems, { itemId, quantity: 1 }] // Default quantity 1 for checkbox
                    : prev.preOrderItems.filter(item => item.itemId !== itemId)
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };
    
    const handlePreOrderItemQuantityChange = (itemId, quantity) => {
        const numQuantity = parseInt(quantity);
        if (numQuantity > 0) {
             setFormData(prev => ({
                ...prev,
                preOrderItems: prev.preOrderItems.map(item => item.itemId === itemId ? {...item, quantity: numQuantity} : item)
            }));
        } else { // Remove if quantity is 0 or less
            setFormData(prev => ({
                ...prev,
                preOrderItems: prev.preOrderItems.filter(item => item.itemId !== itemId)
            }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Basic validation
        if (!formData.customerName || !formData.contact || !formData.date || !formData.time || formData.partySize < 1) {
            setError(t('customer.booking.form.validation_error_fill_fields'));
            return;
        }
        setError('');
        // Mock API POST /api/v1/bookings/create
        console.log("Submitting booking:", formData);
        // Handle 409 conflict (e.g., table booked) - setError(t('customer.booking.form.conflict_error'));
        setSubmitted(true);
    };

    if (submitted) {
        return (
            <div className="text-center py-12">
                <Icon name={CalendarCheck2} size={64} className="mx-auto mb-6 text-green-500 dark:text-green-400" />
                <h2 className="text-3xl font-bold mb-3">{t('customer.booking.submission_thank_you_title')}</h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6">{t('customer.booking.submission_thank_you_message')}</p>
                <Button onClick={() => setView('customerMenu')} size="lg" style={{ backgroundColor: restaurantSettings.primaryColor }} className="text-white">{t('customer.thankyou.back_to_menu_button')}</Button>
            </div>
        );
    }

    return (
        <div>
            <Button onClick={() => setView('customerMenu')} iconLeft={ChevronLeft} variant="ghost" className="mb-4 -ml-2">{t('customer.checkout.back_to_menu')}</Button>
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">{t('customer.booking.title')}</h2>
            {error && <Alert type="error" message={error} onClose={() => setError('')} className="mb-4"/>}
            <Card className="max-w-lg mx-auto">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Select label="customer.booking.form.table_select_label" name="tableId" value={formData.tableId} onChange={handleChange} required>
                        <option value="" disabled>{t('customer.booking.form.table_select_placeholder')}</option>
                        {MOCK_TABLES_BASE.map(table => <option key={table.id} value={table.id}>{table.name} ({t('customer.booking.form.table_capacity', {count: table.capacity})})</option>)}
                    </Select>
                    <Input label="customer.booking.form.name_label" name="customerName" value={formData.customerName} onChange={handleChange} required placeholder={t('customer.booking.form.name_placeholder')}/>
                    <Input label="customer.booking.form.contact_label" name="contact" value={formData.contact} onChange={handleChange} required placeholder={t('customer.booking.form.contact_placeholder')}/>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="customer.booking.form.date_label" name="date" type="date" value={formData.date} onChange={handleChange} required min={new Date().toISOString().split('T')[0]}/>
                        <Input label="customer.booking.form.time_label" name="time" type="time" value={formData.time} onChange={handleChange} required />
                    </div>
                    <Input label="customer.booking.form.party_size_label" name="partySize" type="number" value={formData.partySize} onChange={handleChange} required min="1" />

                    <h4 className="text-md font-semibold pt-4 border-t dark:border-slate-700">{t('customer.booking.form.preorder_optional_title')}</h4>
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                        {menuItems.map(item => {
                            const isPreOrdered = formData.preOrderItems.find(pi => pi.itemId === item.id);
                            return (
                                <div key={item.id} className="p-2 border rounded-lg dark:border-slate-600 flex items-center justify-between">
                                    <label className="flex items-center space-x-2 cursor-pointer">
                                        <input type="checkbox" name="preOrderItems" value={item.id} checked={!!isPreOrdered} onChange={handleChange} className="form-checkbox h-4 w-4 text-[--brand-color] rounded focus:ring-[--brand-color]"/>
                                        <span>{getLocalizedText(item.name, locale)} ({t('currency_format',{value:item.price})})</span>
                                    </label>
                                    {isPreOrdered && (
                                        <Input type="number" name={`preorder_${item.id}_qty`} value={isPreOrdered.quantity} min="1" 
                                               onChange={e => handlePreOrderItemQuantityChange(item.id, e.target.value)} 
                                               className="w-20 text-sm py-1 mb-0"/>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-4">{t('common.zod_form_hint')}</p>
                    <Button type="submit" size="lg" className="w-full mt-6 text-white" style={{ backgroundColor: restaurantSettings.primaryColor }}>{t('customer.booking.form.submit_button')}</Button>
                </form>
            </Card>
        </div>
    );
};

const DesignSystemGuide = () => { /* ... existing DesignSystemGuide (update rounded corners if needed) ... */ 
    const { theme, toggleTheme } = useTheme();
    return (
    <div className="space-y-8">
      <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{t('admin.design_system.title')}</h2>
      <Card><p>{t('admin.design_system.buttons_cards_rounded_note')}</p></Card>
      <Card><p>{t('admin.design_system.typography_note')}</p></Card>
      {/* ... other elements ... */}
    </div>
    );
};

// --- Main App Component ---
function App() {
  const [currentView, setCurrentView] = useState('adminDashboard'); 
  const [viewProps, setViewProps] = useState({}); // For passing props like orderId, tableId to screens
  const [restaurantSettings, setRestaurantSettings] = useState(MOCK_RESTAURANT_INFO_BASE);
  const [, forceUpdate] = useState({}); // To force re-render on locale change for mockup

  // @ts-ignore (for mockup locale change re-render)
  if (typeof window !== 'undefined') window.appRoot = { forceUpdate: () => forceUpdate({}) };


  useEffect(() => { // Apply brand color from settings
    document.documentElement.style.setProperty('--brand-color', restaurantSettings.primaryColor);
  }, [restaurantSettings.primaryColor]);

  const setView = (viewName, props = {}) => {
    setCurrentView(viewName);
    setViewProps(props);
    window.scrollTo(0,0); // Scroll to top on view change
  };

  const updateGlobalRestaurantSettings = (newSettings) => {
    setRestaurantSettings(newSettings);
  };

  const adminViewNameMap = {
    adminDashboard: "admin.sidebar.dashboard",
    adminSettings: "admin.sidebar.restaurant_settings",
    adminMenu: "admin.sidebar.menu_management",
    adminTables: "admin.sidebar.table_qr_management",
    adminEmployees: "admin.sidebar.employees_schedules",
    adminBookings: "admin.sidebar.bookings_preorders",
    adminReports: "admin.sidebar.reports_analytics",
    designSystem: "admin.sidebar.design_system",
  };

  let content;
  if (currentView.startsWith('admin') || currentView === 'designSystem') {
    let AdminScreenComponent;
    switch (currentView) {
      case 'adminDashboard': AdminScreenComponent = () => <DashboardScreen restaurantSettings={restaurantSettings} />; break;
      case 'adminSettings': AdminScreenComponent = () => <RestaurantSettingsScreen restaurantSettings={restaurantSettings} setRestaurantSettingsGlobally={updateGlobalRestaurantSettings} />; break;
      case 'adminMenu': AdminScreenComponent = () => <MenuManagementScreen restaurantSettings={restaurantSettings} />; break;
      case 'adminTables': AdminScreenComponent = () => <TableManagementScreen restaurantSettings={restaurantSettings} />; break;
      case 'adminEmployees': AdminScreenComponent = () => <EmployeeManagementScreen />; break;
      case 'adminBookings': AdminScreenComponent = () => <BookingsManagementScreen restaurantSettings={restaurantSettings} />; break;
      case 'adminReports': AdminScreenComponent = () => <ReportsScreen restaurantSettings={restaurantSettings} />; break;
      case 'designSystem': AdminScreenComponent = DesignSystemGuide; break;
      default: AdminScreenComponent = () => <DashboardScreen restaurantSettings={restaurantSettings} />;
    }
    content = (
      <AdminLayout setView={setView} currentView={currentView} currentViewName={adminViewNameMap[currentView] || "Admin"} restaurantSettings={restaurantSettings}>
        <AdminScreenComponent /> {/* Pass props directly now */}
      </AdminLayout>
    );
  } else if (currentView.startsWith('customer')) {
    let CustomerScreenComponent;
     switch (currentView) {
      case 'customerLanding': CustomerScreenComponent = RestaurantLandingScreen; break; // Needs to be created or use menu as landing
      case 'customerMenu': CustomerScreenComponent = CustomerMenuScreen; break;
      case 'customerCheckout': CustomerScreenComponent = CheckoutScreen; break;
      case 'customerThankYou': CustomerScreenComponent = CustomerThankYouScreen; break;
      case 'customerReview': CustomerScreenComponent = CustomerReviewScreen; break;
      case 'customerBooking': CustomerScreenComponent = CustomerBookingScreen; break;
      default: CustomerScreenComponent = CustomerMenuScreen; // Default to menu for customer
    }
    content = (
      <CustomerLayout setView={setView} restaurantSettings={restaurantSettings}>
        <CustomerScreenComponent setView={setView} restaurantSettings={restaurantSettings} viewProps={viewProps} />
      </CustomerLayout>
    );
  } else if (currentView === 'logout') {
    content = ( /* ... existing logout screen ... */ 
      <div className="flex flex-col items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
        <Icon name={LogOut} size={48} className="text-[--brand-color] mb-4"/>
        <h1 className="text-2xl font-semibold mb-2 text-slate-800 dark:text-slate-100">{t('logout.title')}</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{t('logout.message')}</p>
        <Button onClick={() => setView('adminDashboard')}>{t('logout.login_again_button')}</Button>
      </div>
    );
  } else {
    // Fallback for unhandled views
    content = <RestaurantLandingScreen setView={setView} restaurantSettings={restaurantSettings} />; // Or a specific error page
  }

  return (
    <ThemeProvider>
      <CartProvider>
        <div className="antialiased font-sans"> {/* Changed to font-sans as Inter may not be globally available in mockup */}
          {content}
        </div>
      </CartProvider>
    </ThemeProvider>
  );
}

// Placeholder for RestaurantLandingScreen if not fully defined from original, or use CustomerMenuScreen as default customer view.
// For this iteration, I'll make CustomerMenuScreen the default landing if 'customerLanding' is not explicitly built.
const RestaurantLandingScreen = ({ setView, restaurantSettings }) => {
    // This is a very basic landing. Often, restaurants might go straight to menu.
    return (
        <div className="text-center py-10">
             <img 
                src={restaurantSettings.logoUrl || 'https://placehold.co/150x150/3B82F6/FFFFFF?text=Logo'} 
                alt={`${restaurantSettings.name} Logo`} 
                className="w-32 h-32 md:w-40 md:h-40 rounded-full mx-auto mb-6 object-cover border-4 bg-white shadow-lg"
                style={{ borderColor: restaurantSettings.primaryColor }}
                onError={(e) => e.target.src = 'https://placehold.co/150x150/FF0000/FFFFFF?text=Error'}
            />
            <h1 className="text-3xl sm:text-4xl font-bold mb-4" style={{color: restaurantSettings.primaryColor}}>{restaurantSettings.name}</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-8 max-w-xl mx-auto">{restaurantSettings.description}</p>
            <Button onClick={() => setView('customerMenu')} size="lg" iconRight={ChevronRight} style={{backgroundColor: restaurantSettings.primaryColor}} className="text-white">
                {t('customer.landing.view_menu_button')}
            </Button>
             {FEATURE_FLAGS.tableBooking && (
                <Button onClick={() => setView('customerBooking')} size="lg" iconLeft={CalendarDays} style={{ backgroundColor: restaurantSettings.secondaryColor }} className="text-white ml-4">
                    {t('customer.booking.book_table_button')}
                </Button>
            )}
        </div>
    );
};


export default App;
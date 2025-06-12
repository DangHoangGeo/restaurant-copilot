<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CoOrder Web</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>

    <style>
        :root {
            --brand-color: #4A90E2;
            --brand-color-rgb: 74, 144, 226;
        }
        body {
            font-family: 'Inter', sans-serif;
            -webkit-tap-highlight-color: transparent;
        }
        .brand-bg { background-color: var(--brand-color); }
        .brand-text { color: var(--brand-color); }
        .brand-border { border-color: var(--brand-color); }
        .brand-ring { --tw-ring-color: var(--brand-color); }
        .brand-tint-bg { background-color: rgba(var(--brand-color-rgb), 0.15); }
        .shadow-brand { box-shadow: 0 4px 14px 0 rgba(var(--brand-color-rgb), 0.39); }
        
        /* Custom scrollbar for better aesthetics */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #f1f1f1; }
        ::-webkit-scrollbar-thumb { background: #888; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }

        /* Animation for view transitions */
        .view-enter {
            animation: fadeIn 0.3s ease-in-out;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
    </style>
</head>
<body class="bg-gray-50 antialiased">
    <div id="root" class="h-screen w-screen overflow-hidden"></div>

    <script type="module">
        // MARK: - ------------------ App Entry Point ------------------
        
        const root = document.getElementById('root');

        // MARK: - ------------------ Mock Data & Services ------------------

        // --- Localization ---
        const translations = {
            en: {
                login_subtitle: "Staff Sign In",
                placeholder_email: "Email Address",
                placeholder_password: "Password",
                placeholder_subdomain: "Restaurant Subdomain",
                button_sign_in: "Sign In",
                alert_login_failed_title: "Login Failed",
                error_invalid_credentials: "The email, password, or subdomain is incorrect. Please try again.",
                tab_orders: "Orders",
                tab_kitchen: "Kitchen",
                tab_bookings: "Bookings",
                tab_printer: "Printer",
                tab_inventory: "Inventory",
                title_active_orders: "Active Orders",
                table_prefix: "Table",
                label_item_count: (c) => `${c} item${c > 1 ? 's' : ''}`,
                header_items: "Items",
                label_total: "Total",
                button_mark_preparing: "Mark as Preparing",
                button_mark_ready: "Mark as Ready",
                button_complete_and_print: "Complete & Print",
                title_kitchen_board: "Kitchen Board",
                placeholder_no_items_to_prepare: "No recent items to prepare.",
                label_qty: "Qty",
                label_tables: "Tables",
                button_mark_done: "Mark Done",
                title_bookings: "Bookings",
                label_party_size: (c) => `Party: ${c}`,
                title_booking_detail: "Booking Detail",
                header_customer_info: "Customer Info",
                label_name: "Name",
                label_contact: "Contact",
                header_booking_details: "Booking Details",
                label_date: "Date",
                label_party_size_detail: "Party Size",
                header_preorder: "Pre-order",
                button_confirm: "Confirm",
                button_cancel: "Cancel",
                button_cancel_booking: "Cancel Booking",
                title_printer_setup: "Printer Setup",
                status_connected_to: "Connected to",
                status_not_connected: "Not Connected",
                button_scan_for_printers: "Scan for Printers",
                button_scanning: "Scanning...",
                button_test_print: "Test Print",
                header_discovered_printers: "Discovered Printers",
                button_connect: "Connect",
                label_unnamed_printer: "Unnamed Printer",
                alert_bluetooth_off: "Bluetooth is off. Please enable it to use printers.",
                error_no_printer_connected: "Error: No printer connected.",
                status_test_print_sent: "Test print sent successfully.",
                status_connecting_to: "Connecting to",
                status_printed_summary_for: "Printed summary for",
                title_inventory_alerts: "Inventory Alerts",
                banner_low_stock_title: "Low Stock Alert!",
                banner_low_stock_detail: (name, level) => `${name} has only ${level} left.`,
                placeholder_all_items_stocked: "All items are sufficiently stocked.",
                label_stock_level: "Stock Level",
                button_reorder: "Reorder",
                menu_ramen: "Tonkotsu Ramen",
                note_extra_noodles: "Extra noodles",
                menu_gyoza: "Gyoza",
                menu_miso_ramen: "Miso Ramen",
                menu_coke: "Cola",
                menu_chefs_course: "Chef's Course",
                note_one_vegetarian: "1 order vegetarian",
                item_test: "Test Item",
                menu_ramen_noodles: "Ramen Noodles",
                item_pork_chashu: "Pork Chashu",
                item_nori_seaweed: "Nori Seaweed"
            },
            ja: {
                login_subtitle: "スタッフログイン",
                placeholder_email: "メールアドレス",
                placeholder_password: "パスワード",
                placeholder_subdomain: "レストランのサブドメイン",
                button_sign_in: "サインイン",
                alert_login_failed_title: "ログイン失敗",
                error_invalid_credentials: "メール、パスワード、またはサブドメインが正しくありません。再試行してください。",
                tab_orders: "注文",
                tab_kitchen: "キッチン",
                tab_bookings: "予約",
                tab_printer: "プリンター",
                tab_inventory: "在庫",
                title_active_orders: "現在の注文",
                table_prefix: "テーブル",
                label_item_count: (c) => `${c}品`,
                header_items: "商品",
                label_total: "合計",
                button_mark_preparing: "調理中にする",
                button_mark_ready: "準備完了にする",
                button_complete_and_print: "完了して印刷",
                title_kitchen_board: "キッチンボード",
                placeholder_no_items_to_prepare: "調理する商品がありません。",
                label_qty: "数量",
                label_tables: "テーブル",
                button_mark_done: "完了",
                title_bookings: "予約一覧",
                label_party_size: (c) => `${c}名様`,
                title_booking_detail: "予約詳細",
                header_customer_info: "お客様情報",
                label_name: "お名前",
                label_contact: "連絡先",
                header_booking_details: "予約詳細",
                label_date: "日時",
                label_party_size_detail: "人数",
                header_preorder: "事前注文",
                button_confirm: "確定",
                button_cancel: "キャンセル",
                button_cancel_booking: "予約をキャンセル",
                title_printer_setup: "プリンター設定",
                status_connected_to: "接続先:",
                status_not_connected: "未接続",
                button_scan_for_printers: "プリンターをスキャン",
                button_scanning: "スキャン中...",
                button_test_print: "テスト印刷",
                header_discovered_printers: "見つかったプリンター",
                button_connect: "接続",
                label_unnamed_printer: "名称未設定プリンター",
                alert_bluetooth_off: "Bluetoothがオフです。プリンターを使用するにはオンにしてください。",
                error_no_printer_connected: "エラー：プリンターが接続されていません。",
                status_test_print_sent: "テスト印刷を送信しました。",
                status_connecting_to: "接続中:",
                status_printed_summary_for: "の概要を印刷しました:",
                title_inventory_alerts: "在庫アラート",
                banner_low_stock_title: "在庫低下アラート！",
                banner_low_stock_detail: (name, level) => `${name}の在庫が${level}個しかありません。`,
                placeholder_all_items_stocked: "すべての商品の在庫は十分にあります。",
                label_stock_level: "在庫数",
                button_reorder: "再発注",
                menu_ramen: "豚骨ラーメン",
                note_extra_noodles: "麺大盛り",
                menu_gyoza: "餃子",
                menu_miso_ramen: "味噌ラーメン",
                menu_coke: "コーラ",
                menu_chefs_course: "シェフのおまかせコース",
                note_one_vegetarian: "1名様ベジタリアン対応",
                item_test: "テスト品目",
                menu_ramen_noodles: "ラーメン麺",
                item_pork_chashu: "チャーシュー",
                item_nori_seaweed: "海苔"
            }
        };
        let currentLang = 'en';
        const Localized = (key, ...args) => {
            const translation = translations[currentLang][key];
            if (typeof translation === 'function') {
                return translation(...args);
            }
            return translation || key;
        };

        // --- Feature Flags ---
        const FeatureFlags = {
            enableTableBooking: true,
            enableLowStockAlerts: true,
        };
        
        // --- State ---
        let AppState = {
            isAuthenticated: false,
            activeOrders: [],
            bookings: [],
            lowStockItems: [],
            connectedPrinter: null,
            currentView: 'login', // login, orders, kitchen, bookings, etc.
            detailViewData: null,
            listeners: [],
            
            // State management
            subscribe(listener) {
                this.listeners.push(listener);
            },
            notify() {
                this.listeners.forEach(listener => listener());
            },
            setState(newState) {
                Object.assign(this, newState);
                this.notify();
            }
        };

        // --- Mock Services ---
        class OrderService {
            static fetchOrders() {
                const orders = [
                    {id: "O1001", tableId: "3", totalAmount: 3200, status: "new", createdAt: new Date(Date.now() - 60000), items: [{id: "OI1", menuItemId: "R01", menuItemName: Localized("menu_ramen"), quantity: 2, notes: Localized("note_extra_noodles")}, {id: "OI2", menuItemId: "G01", menuItemName: Localized("menu_gyoza"), quantity: 1, notes: null}]},
                    {id: "O1002", tableId: "5", totalAmount: 1800, status: "preparing", createdAt: new Date(Date.now() - 300000), items: [{id: "OI3", menuItemId: "R02", menuItemName: Localized("menu_miso_ramen"), quantity: 1, notes: null}, {id: "OI4", menuItemId: "D01", menuItemName: Localized("menu_coke"), quantity: 1, notes: null}]},
                    {id: "O1003", tableId: "1", totalAmount: 950, status: "ready", createdAt: new Date(Date.now() - 600000), items: [{id: "OI5", menuItemId: "R01", menuItemName: Localized("menu_ramen"), quantity: 1, notes: null}]}
                ];
                AppState.setState({ activeOrders: orders });
            }

            static updateOrderStatus(orderId, newStatus) {
                let orders = [...AppState.activeOrders];
                const index = orders.findIndex(o => o.id === orderId);
                if (index === -1) return;
                
                if (newStatus === 'completed') {
                    setTimeout(() => {
                        AppState.setState({ activeOrders: AppState.activeOrders.filter(o => o.id !== orderId) });
                    }, 500);
                } else {
                    orders[index].status = newStatus;
                    AppState.setState({ activeOrders: orders });
                }
            }
        }

        class BookingService {
            static fetchBookings() {
                const bookings = [
                    {id: "B001", customerName: "Tanaka Yuki", customerContact: "080-1234-5678", bookingDate: new Date(), bookingTime: "19:00", partySize: 4, preorderItems: [{id: "OI10", menuItemId: "C01", menuItemName: Localized("menu_chefs_course"), quantity: 4, notes: Localized("note_one_vegetarian")}], status: "pending"},
                    {id: "B002", customerName: "John Smith", customerContact: "john.s@example.com", bookingDate: new Date(Date.now() + 86400000), bookingTime: "20:30", partySize: 2, preorderItems: [], status: "confirmed"},
                    {id: "B003", customerName: "Nguyen Anh", customerContact: "anh.n@example.com", bookingDate: new Date(Date.now() + 86400000 * 2), bookingTime: "18:00", partySize: 6, preorderItems: [], status: "canceled"}
                ];
                 AppState.setState({ bookings });
            }
             static updateBookingStatus(bookingId, newStatus) {
                let bookings = [...AppState.bookings];
                const index = bookings.findIndex(b => b.id === bookingId);
                if (index > -1) {
                    bookings[index].status = newStatus;
                    AppState.setState({ bookings });
                }
            }
        }
        
        class AuthManager {
            static signIn(email, password, subdomain) {
                // Mock Supabase call
                return new Promise(resolve => {
                    setTimeout(() => {
                        if (email.toLowerCase() === "staff@example.com" && password === "password123") {
                            localStorage.setItem("jwt_token", "mock.jwt.token");
                            AppState.setState({ isAuthenticated: true, currentView: 'orders' });
                            resolve({ success: true });
                        } else {
                            resolve({ success: false, message: Localized('error_invalid_credentials') });
                        }
                    }, 1500);
                });
            }
            static checkSession() {
                if (localStorage.getItem("jwt_token")) {
                     AppState.setState({ isAuthenticated: true, currentView: 'orders' });
                }
            }
        }
        
        // --- Initial Data Fetch ---
        OrderService.fetchOrders();
        if(FeatureFlags.enableTableBooking) BookingService.fetchBookings();

        // MARK: - ------------------ UI Components / Views ------------------
        
        const Icon = (name, size = 20, classes = '') => {
            return `<i data-lucide="${name}" class="${classes}" style="width: ${size}px; height: ${size}px;"></i>`;
        }
        
        const StatusBadge = (status) => {
            const config = {
                new: { text: Localized('status_new'), color: 'blue', icon: 'sparkles' },
                preparing: { text: Localized('status_preparing'), color: 'orange', icon: 'flame' },
                ready: { text: Localized('status_ready'), color: 'green', icon: 'check-circle-2' },
                pending: { text: Localized('status_pending'), color: 'gray', icon: 'hourglass' },
                confirmed: { text: Localized('status_confirmed'), color: 'green', icon: 'shield-check' },
                canceled: { text: Localized('status_canceled'), color: 'red', icon: 'x-circle' },
            }[status] || { text: status, color: 'gray', icon: 'help-circle' };
            
            return `
                <div class="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-medium bg-${config.color}-100 text-${config.color}-800">
                    ${Icon(config.icon, 14)}
                    <span>${config.text}</span>
                </div>
            `;
        };
        
        // --- Login View ---
        const LoginView = () => {
            return `
                <div class="flex flex-col items-center justify-center h-full bg-white p-8 view-enter">
                    <div class="w-full max-w-sm text-center">
                        <h1 class="text-5xl font-extrabold brand-text">CoOrder</h1>
                        <p class="mt-2 text-lg text-gray-600">${Localized('login_subtitle')}</p>
                        
                        <form id="login-form" class="mt-10 space-y-4 text-left">
                            <input id="email" type="email" placeholder="${Localized('placeholder_email')}" class="w-full px-4 py-3 bg-gray-100 rounded-xl border-2 border-transparent focus:border-blue-500 focus:ring-blue-500 focus:outline-none transition" required>
                            <input id="password" type="password" placeholder="${Localized('placeholder_password')}" class="w-full px-4 py-3 bg-gray-100 rounded-xl border-2 border-transparent focus:border-blue-500 focus:ring-blue-500 focus:outline-none transition" required>
                            <input id="subdomain" type="text" placeholder="${Localized('placeholder_subdomain')}" class="w-full px-4 py-3 bg-gray-100 rounded-xl border-2 border-transparent focus:border-blue-500 focus:ring-blue-500 focus:outline-none transition" required>
                            
                            <button type="submit" class="w-full py-4 text-white font-bold rounded-xl brand-bg hover:opacity-90 transition-all duration-300 shadow-brand disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                <span id="login-btn-text">${Localized('button_sign_in')}</span>
                                <div id="login-spinner" class="hidden w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            </button>
                        </form>
                        <div id="error-message" class="mt-4 text-red-500 text-sm"></div>
                    </div>
                </div>
            `;
        };

        // --- Main Application Shell ---
        const MainShell = (content) => {
            const tabs = [
                { id: 'orders', label: Localized('tab_orders'), icon: 'list-bullet-rectangle-portrait' },
                { id: 'kitchen', label: Localized('tab_kitchen'), icon: 'flame' },
                ...(FeatureFlags.enableTableBooking ? [{ id: 'bookings', label: Localized('tab_bookings'), icon: 'calendar-badge-clock' }] : []),
                { id: 'printer', label: Localized('tab_printer'), icon: 'printer' },
                ...(FeatureFlags.enableLowStockAlerts ? [{ id: 'inventory', label: Localized('tab_inventory'), icon: 'exclamationmark-bubble' }] : []),
            ];
            const iconMap = {
                'list-bullet-rectangle-portrait': 'notebook-tabs',
                'flame': 'flame',
                'calendar-badge-clock': 'calendar-clock',
                'printer': 'printer',
                'exclamationmark-bubble': 'shield-alert'
            };
            return `
                <div class="h-full w-full flex flex-col md:flex-row bg-white">
                    <!-- Main Content -->
                    <main class="flex-1 flex flex-col overflow-hidden">
                        ${content}
                    </main>
                    <!-- Mobile Tab Bar -->
                    <nav class="md:hidden border-t border-gray-200 bg-gray-50 flex justify-around">
                        ${tabs.map(tab => `
                            <button data-view="${tab.id}" class="tab-btn flex-1 flex flex-col items-center justify-center p-3 ${AppState.currentView === tab.id ? 'brand-text' : 'text-gray-500'}">
                                ${Icon(iconMap[tab.icon], 24, AppState.currentView === tab.id ? 'stroke-[2.5px]' : 'stroke-[2px]')}
                                <span class="text-xs mt-1 font-medium">${tab.label}</span>
                            </button>
                        `).join('')}
                    </nav>
                </div>
            `;
        };

        // --- Order List View ---
        const OrderListView = () => {
            if (AppState.activeOrders.length === 0) {
                 return `<div class="p-8 text-center text-gray-500">No active orders.</div>`;
            }
            return `
                <div class="flex-1 overflow-y-auto">
                    <ul class="divide-y divide-gray-200">
                        ${AppState.activeOrders.map(order => `
                            <li data-order-id="${order.id}" class="order-item p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition">
                                <div>
                                    <p class="font-bold text-lg text-gray-800">${Localized('table_prefix')} ${order.tableId}</p>
                                    <p class="text-sm text-gray-500">${Localized('label_item_count', order.items.length)}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-sm text-gray-500 mb-1">${new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                    ${StatusBadge(order.status)}
                                </div>
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        };

        // --- Order Detail View ---
        const OrderDetailView = (order) => {
            const getActionButton = () => {
                switch(order.status) {
                    case 'new': return `<button id="update-status-btn" data-new-status="preparing" class="w-full py-3 text-white font-bold rounded-xl brand-bg hover:opacity-90 transition shadow-brand">${Localized('button_mark_preparing')}</button>`;
                    case 'preparing': return `<button id="update-status-btn" data-new-status="ready" class="w-full py-3 text-white font-bold rounded-xl brand-bg hover:opacity-90 transition shadow-brand">${Localized('button_mark_ready')}</button>`;
                    case 'ready': return `<button id="update-status-btn" data-new-status="completed" class="w-full py-3 text-white font-bold rounded-xl brand-bg hover:opacity-90 transition shadow-brand flex items-center justify-center gap-2">${Icon('printer', 20)} ${Localized('button_complete_and_print')}</button>`;
                    default: return '';
                }
            }

            return `
                <div class="flex flex-col h-full bg-gray-50 view-enter">
                    <div class="flex-1 overflow-y-auto p-4 space-y-4">
                        <div class="bg-white p-4 rounded-xl shadow-sm">
                            <h3 class="font-bold text-gray-700 mb-2">${Localized('header_items')}</h3>
                            <ul class="divide-y divide-gray-100">
                                ${order.items.map(item => `
                                    <li class="py-3">
                                        <div class="flex justify-between font-medium">
                                            <span>${item.menuItemName}</span>
                                            <span>x${item.quantity}</span>
                                        </div>
                                        ${item.notes ? `<p class="text-sm text-gray-500 mt-1">${item.notes}</p>` : ''}
                                    </li>
                                `).join('')}
                            </ul>
                        </div>
                        <div class="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center font-bold text-lg">
                            <span>${Localized('label_total')}</span>
                            <span>${new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(order.totalAmount)}</span>
                        </div>
                    </div>
                    <div class="p-4 bg-white border-t">${getActionButton()}</div>
                </div>
            `;
        }

        // --- Kitchen Board View ---
        const KitchenBoardView = () => {
            const tenMinutesAgo = new Date(Date.now() - 600000);
            const recentOrders = AppState.activeOrders.filter(o => (o.status === 'new' || o.status === 'preparing') && new Date(o.createdAt) >= tenMinutesAgo);
            
            const groupedItems = recentOrders.reduce((acc, order) => {
                order.items.forEach(item => {
                    if (!acc[item.menuItemId]) {
                        acc[item.menuItemId] = { itemId: item.menuItemId, itemName: item.menuItemName, quantity: 0, tables: new Set() };
                    }
                    acc[item.menuItemId].quantity += item.quantity;
                    acc[item.menuItemId].tables.add(order.tableId);
                });
                return acc;
            }, {});
            const groups = Object.values(groupedItems);

            if (groups.length === 0) {
                 return `<div class="h-full flex flex-col items-center justify-center text-gray-500 p-8">
                            ${Icon('fork-knife-circle', 60, 'text-gray-300')}
                            <p class="mt-4 text-xl">${Localized('placeholder_no_items_to_prepare')}</p>
                         </div>`;
            }

            return `
                <div class="flex-1 overflow-y-auto p-4 bg-gray-100">
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        ${groups.map(group => `
                            <div class="bg-white rounded-2xl shadow-md p-4 flex flex-col">
                                <h3 class="text-xl font-bold text-gray-800">${group.itemName}</h3>
                                <p class="text-lg font-semibold text-gray-600 mt-2">${Localized('label_qty')}: ${group.quantity}</p>
                                <p class="text-sm text-gray-500 mt-1">${Localized('label_tables')}: ${[...group.tables].join(', ')}</p>
                                <div class="flex-grow"></div>
                                <button class="mt-4 w-full py-2 text-sm text-white font-bold rounded-full brand-bg hover:opacity-90 transition">${Localized('button_mark_done')}</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // --- View Renderer ---
        const renderView = () => {
            let viewContent = '';
            let headerTitle = '';
            let showBackButton = false;
            
            // Determine which view to render
            switch(AppState.currentView) {
                case 'login':
                    root.innerHTML = LoginView();
                    lucide.createIcons();
                    addLoginListeners();
                    return; // Fullscreen view, no shell
                case 'orders':
                    headerTitle = Localized('title_active_orders');
                    viewContent = OrderListView();
                    break;
                case 'order-detail':
                    headerTitle = `${Localized('table_prefix')} ${AppState.detailViewData.tableId}`;
                    showBackButton = true;
                    viewContent = OrderDetailView(AppState.detailViewData);
                    break;
                case 'kitchen':
                    headerTitle = Localized('title_kitchen_board');
                    viewContent = KitchenBoardView();
                    break;
                case 'bookings':
                    headerTitle = Localized('title_bookings');
                    viewContent = `<div class="p-8 text-center text-gray-500">Bookings not implemented yet.</div>`;
                    break;
                 case 'printer':
                    headerTitle = Localized('title_printer_setup');
                    viewContent = `<div class="p-8 text-center text-gray-500">Printer Setup not implemented yet.</div>`;
                    break;
                case 'inventory':
                    headerTitle = Localized('title_inventory_alerts');
                    viewContent = `<div class="p-8 text-center text-gray-500">Inventory not implemented yet.</div>`;
                    break;
                default:
                    viewContent = `<div class="p-8">Not Found</div>`;
            }
            
            const header = `
                <header class="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
                    <div class="flex items-center gap-2">
                        ${showBackButton ? `<button id="back-btn" class="p-2 -ml-2 rounded-full hover:bg-gray-100">${Icon('arrow-left', 24)}</button>` : `<div class="w-10"></div>`}
                        <h2 class="text-xl font-bold text-gray-800">${headerTitle}</h2>
                    </div>
                     <div class="flex items-center gap-2">
                        <select id="lang-switcher" class="bg-gray-100 border-gray-300 rounded-md text-sm">
                            <option value="en" ${currentLang === 'en' ? 'selected' : ''}>EN</option>
                            <option value="ja" ${currentLang === 'ja' ? 'selected' : ''}>JA</option>
                        </select>
                    </div>
                </header>
            `;
            
            root.innerHTML = MainShell(header + `<div class="flex-1 overflow-hidden view-enter">${viewContent}</div>`);
            lucide.createIcons();
            addAppListeners();
        };

        // --- Event Listeners ---
        function addLoginListeners() {
            const form = document.getElementById('login-form');
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const subdomain = document.getElementById('subdomain').value;
                
                document.getElementById('login-btn-text').classList.add('hidden');
                document.getElementById('login-spinner').classList.remove('hidden');
                form.querySelector('button').disabled = true;

                const result = await AuthManager.signIn(email, password, subdomain);
                if (!result.success) {
                    document.getElementById('error-message').textContent = result.message;
                    document.getElementById('login-btn-text').classList.remove('hidden');
                    document.getElementById('login-spinner').classList.add('hidden');
                    form.querySelector('button').disabled = false;
                }
            });
        }
        
        function addAppListeners() {
            // Tab navigation
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => AppState.setState({ currentView: btn.dataset.view }));
            });

            // Order item navigation
            document.querySelectorAll('.order-item').forEach(item => {
                item.addEventListener('click', () => {
                    const order = AppState.activeOrders.find(o => o.id === item.dataset.orderId);
                    if(order) AppState.setState({ currentView: 'order-detail', detailViewData: order });
                });
            });

            // Back button
            const backBtn = document.getElementById('back-btn');
            if (backBtn) {
                backBtn.addEventListener('click', () => {
                    // Simple back logic, can be improved with a history stack
                    if(AppState.currentView === 'order-detail') AppState.setState({ currentView: 'orders', detailViewData: null });
                });
            }

            // Order status update
            const updateStatusBtn = document.getElementById('update-status-btn');
            if(updateStatusBtn) {
                updateStatusBtn.addEventListener('click', () => {
                    const orderId = AppState.detailViewData.id;
                    const newStatus = updateStatusBtn.dataset.newStatus;
                    OrderService.updateOrderStatus(orderId, newStatus);
                    if(newStatus === 'completed') {
                       AppState.setState({ currentView: 'orders', detailViewData: null });
                    } else {
                        let updatedOrder = {...AppState.detailViewData, status: newStatus};
                        AppState.setState({ detailViewData: updatedOrder });
                    }
                });
            }
            
            // Language switcher
            document.getElementById('lang-switcher').addEventListener('change', (e) => {
                currentLang = e.target.value;
                // Re-fetch data to get localized strings
                OrderService.fetchOrders();
                if(FeatureFlags.enableTableBooking) BookingService.fetchBookings();
                // No need to call setState, fetch calls it which triggers a re-render.
            });
        }
        
        // MARK: - ------------------ Initial Render ------------------
        
        AppState.subscribe(renderView);
        AuthManager.checkSession();
        if (!AppState.isAuthenticated) {
            AppState.setState({ currentView: 'login' });
        } else {
            renderView();
        }

    </script>
</body>
</html>

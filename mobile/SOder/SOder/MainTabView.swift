import SwiftUI
import UIKit

private enum AppTab: Int, CaseIterable, Hashable {
    case orders
    case kitchen
    case tables
    case settings

    var title: String {
        switch self {
        case .orders:
            return "tab_orders".localized
        case .kitchen:
            return "tab_kitchen".localized
        case .tables:
            return "tab_tables".localized
        case .settings:
            return "tab_settings".localized
        }
    }

    var systemImage: String {
        switch self {
        case .orders:
            return "list.bullet"
        case .kitchen:
            return "fork.knife"
        case .tables:
            return "square.grid.2x2"
        case .settings:
            return "gearshape.fill"
        }
    }

    var tint: Color {
        switch self {
        case .orders:
            return .appHighlight
        case .kitchen:
            return .appWarning
        case .tables:
            return .appInfo
        case .settings:
            return .appSuccess
        }
    }
}

struct MainTabView: View {
    @EnvironmentObject private var printerManager: PrinterManager
    @EnvironmentObject private var orderManager: OrderManager
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var selectedTab: AppTab = .orders

    var body: some View {
        Group {
            if isPadLayout {
                ipadShell
            } else {
                phoneTabView
            }
        }
        .tint(Color.appHighlight)
        .animation(.easeInOut(duration: Motion.medium), value: selectedTab)
    }

    private var isPadLayout: Bool {
        UIDevice.current.userInterfaceIdiom == .pad && horizontalSizeClass == .regular
    }

    private var phoneTabView: some View {
        TabView(selection: $selectedTab) {
            OrdersView()
                .environmentObject(printerManager)
                .tabItem {
                    Label(AppTab.orders.title, systemImage: AppTab.orders.systemImage)
                }
                .tag(AppTab.orders)

            KitchenBoardView()
                .environmentObject(printerManager)
                .tabItem {
                    Label(AppTab.kitchen.title, systemImage: AppTab.kitchen.systemImage)
                }
                .tag(AppTab.kitchen)

            TablesListView()
                .environmentObject(printerManager)
                .tabItem {
                    Label(AppTab.tables.title, systemImage: AppTab.tables.systemImage)
                }
                .tag(AppTab.tables)

            SettingsView()
                .environmentObject(printerManager)
                .tabItem {
                    Label(AppTab.settings.title, systemImage: AppTab.settings.systemImage)
                }
                .tag(AppTab.settings)
        }
    }

    private var ipadShell: some View {
        selectedContent
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .environment(\.floatingDockClearance, AppShellMetrics.ipadFloatingDockClearance)
            .safeAreaInset(edge: .bottom, spacing: 0) {
                IpadFloatingDockInset {
                    IpadFloatingTabBar(
                        selectedTab: $selectedTab,
                        badges: tabBadges
                    )
                }
            }
        .ignoresSafeArea(.keyboard, edges: .bottom)
    }

    @ViewBuilder
    private var selectedContent: some View {
        switch selectedTab {
        case .orders:
            OrdersView()
                .environmentObject(printerManager)
        case .kitchen:
            KitchenBoardView()
                .environmentObject(printerManager)
        case .tables:
            TablesListView()
                .environmentObject(printerManager)
        case .settings:
            SettingsView()
                .environmentObject(printerManager)
        }
    }

    private var tabBadges: [AppTab: String] {
        var badges: [AppTab: String] = [:]

        if !orderManager.orders.isEmpty {
            badges[.orders] = "\(orderManager.orders.count)"
        }

        let kitchenItems = orderManager.orders
            .flatMap { $0.order_items ?? [] }
            .reduce(into: 0) { count, item in
                if item.status == .new || item.status == .preparing {
                    count += 1
                }
            }
        if kitchenItems > 0 {
            badges[.kitchen] = "\(kitchenItems)"
        }

        if orderManager.autoPrintingEnabled {
            badges[.settings] = "AUTO"
        }

        return badges
    }
}

private struct IpadFloatingTabBar: View {
    @Binding var selectedTab: AppTab
    let badges: [AppTab: String]

    var body: some View {
        HStack(spacing: Spacing.sm) {
            ForEach(AppTab.allCases, id: \.self) { tab in
                Button {
                    selectedTab = tab
                } label: {
                    IpadFloatingTabButton(
                        tab: tab,
                        isSelected: selectedTab == tab,
                        badge: badges[tab]
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(Color.appBorderLight.opacity(0.7), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.12), radius: 18, y: 8)
    }
}

private struct IpadFloatingDockInset<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        ZStack(alignment: .bottom) {
            LinearGradient(
                colors: [
                    Color.appBackground.opacity(0),
                    Color.appBackground.opacity(0.92)
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: AppShellMetrics.ipadFloatingDockClearance + 28)
            .allowsHitTesting(false)

            content
                .padding(.horizontal, Spacing.lg)
                .padding(.top, Spacing.xs)
                .padding(.bottom, max(Spacing.xs, bottomInset))
        }
        .frame(maxWidth: .infinity)
    }

    private var bottomInset: CGFloat {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap(\.windows)
            .first(where: \.isKeyWindow)?
            .safeAreaInsets.bottom ?? 0
    }
}

private struct IpadFloatingTabButton: View {
    let tab: AppTab
    let isSelected: Bool
    let badge: String?

    var body: some View {
        HStack(spacing: Spacing.sm) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: tab.systemImage)
                    .font(.bodyMedium.weight(.semibold))
                    .foregroundColor(isSelected ? tab.tint : .appTextSecondary)

                if let badge {
                    Text(badge)
                        .font(.system(size: badge.count > 2 ? 9 : 10, weight: .bold, design: .monospaced))
                        .foregroundColor(isSelected ? .appOnHighlight : tab.tint)
                        .padding(.horizontal, badge == "AUTO" ? 5 : 4)
                        .padding(.vertical, 2)
                        .background(isSelected ? tab.tint : tab.tint.opacity(0.14))
                        .clipShape(Capsule())
                        .offset(x: 12, y: -10)
                }
            }

            if isSelected {
                Text(tab.title)
                    .font(.buttonMedium)
                    .foregroundColor(.appTextPrimary)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, isSelected ? Spacing.md : Spacing.sm)
        .padding(.vertical, Spacing.sm)
        .background(isSelected ? tab.tint.opacity(0.14) : Color.clear)
        .overlay(
            Capsule()
                .stroke(isSelected ? tab.tint.opacity(0.22) : Color.clear, lineWidth: 1)
        )
        .clipShape(Capsule())
    }
}

#Preview {
    MainTabView()
        .environmentObject(LocalizationManager.shared)
        .environmentObject(SupabaseManager.shared)
        .environmentObject(PrinterManager.shared)
        .environmentObject(OrderManager.shared)
}

import Foundation
import Supabase

class SupabaseManager: ObservableObject {
    static let shared = SupabaseManager()
    static let activeRestaurantHeaderName = "x-soder-active-restaurant-id"

    struct BranchSelectionState {
        let selectedBranch: Restaurant?
        let needsBranchSelection: Bool
    }
    
    private(set) var client: SupabaseClient
    private let supabaseURL: URL
    private let supabaseKey: String
    private let authStorageKey: String
    
    @Published var currentUser: User?
    @Published var currentRestaurant: Restaurant? {
        didSet {
            persistCurrentRestaurant()
            PrinterSettingsManager.shared.syncFromCurrentRestaurant(currentRestaurant)
        }
    }
    @Published var accessibleBranches: [Restaurant] = []
    @Published var isAuthenticated = false
    @Published var needsBranchSelection = false
    @Published var userRole: String?

    private var restaurantIdFromToken: String?
    
    // MARK: - In-Memory Cache
    private struct CacheItem<T> {
        let data: T
        let timestamp: Date
        let ttl: TimeInterval
        
        var isValid: Bool {
            Date().timeIntervalSince(timestamp) < ttl
        }
    }
    
    private var categoriesCache: CacheItem<[Category]>?
    private var menuItemsCache: CacheItem<[MenuItem]>?
    private var menuItemDetailsCache: [String: CacheItem<MenuItem>] = [:]
    private let cacheTTL: TimeInterval = 60.0 // 60 seconds TTL as specified in plan
    private let persistedCurrentRestaurantKey = "persistedCurrentRestaurant"
    
    // Search debounce
    private var searchDebounceTimer: Timer?
    private let searchDebounceDelay: TimeInterval = 0.3 // 300ms as specified in plan

    var currentRestaurantId: String? {
        currentRestaurant?.id ?? restaurantIdFromToken
    }

    var currentCurrencyCode: String {
        AppCurrencyFormatter.currentCurrencyCode(from: currentRestaurant)
    }
    
    private init() {
        // Use configuration from Info.plist instead of hardcoded values
        guard let supabaseURLString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
              let supabaseURL = URL(string: supabaseURLString) else {
            print("FATAL ERROR: SUPABASE_URL not found or invalid in Info.plist. Please check your configuration.")
            // In a real app, you might want to handle this more gracefully than a fatal error,
            // perhaps by setting a state that disables all Supabase-related functionality.
            // For this example, we'll proceed with a dummy client to avoid a hard crash.
            self.supabaseURL = URL(string: "http://localhost")!
            self.supabaseKey = "dummy"
            self.authStorageKey = "sb-localhost-auth-token"
            self.client = SupabaseClient(supabaseURL: self.supabaseURL, supabaseKey: self.supabaseKey)
            return
        }
        
        guard let supabaseKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String else {
            print("FATAL ERROR: SUPABASE_ANON_KEY not found in Info.plist. Please check your configuration.")
            self.supabaseURL = URL(string: "http://localhost")!
            self.supabaseKey = "dummy"
            self.authStorageKey = "sb-localhost-auth-token"
            self.client = SupabaseClient(supabaseURL: self.supabaseURL, supabaseKey: self.supabaseKey)
            return
        }

        self.supabaseURL = supabaseURL
        self.supabaseKey = supabaseKey
        self.authStorageKey = "sb-\(supabaseURL.host?.split(separator: ".").first ?? "default")-auth-token"
        self.client = SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseKey,
            options: Self.makeClientOptions(
                activeRestaurantId: nil,
                authStorageKey: self.authStorageKey
            )
        )

        loadPersistedCurrentRestaurant()
        
        // Check for existing session
        Task {
            await checkAuthStatus()
        }
    }
    
    // MARK: - Authentication
    @MainActor
    func signIn(branchCode: String, email: String, password: String) async throws {
        let response = try await client.auth.signIn(email: email, password: password)
        currentUser = response.user

        let token = response.accessToken
        guard !token.isEmpty else {
            await handleAuthFailure()
            throw AuthError.tokenError
        }

        await parseJWTAndSetClaims(token: token)

        guard isAuthenticated else {
            await handleAuthFailure()
            throw AuthError.tokenError
        }

        do {
            try await loadBranchesAndSelectDefault(branchCode: branchCode)
        } catch {
            await handleAuthFailure()
            throw error
        }
    }
    
    @MainActor
    func signOut() async throws {
        try await client.auth.signOut()
        applyActiveRestaurantContext(nil)
        currentUser = nil
        currentRestaurant = nil
        accessibleBranches = []
        isAuthenticated = false
        needsBranchSelection = false
        userRole = nil
        restaurantIdFromToken = nil
        clearCache()
        clearPersistedCurrentRestaurant()
        clearSavedBranchId()
    }
    
    @MainActor
    private func checkAuthStatus() async {
        do {
            let session = try await client.auth.session
            currentUser = session.user

            let token = session.accessToken
            guard !token.isEmpty else {
                await handleAuthFailure()
                return
            }

            await parseJWTAndSetClaims(token: token)

            guard isAuthenticated else {
                await handleAuthFailure()
                return
            }

            do {
                try await loadBranchesAndSelectDefault(branchCode: nil)
            } catch {
                await handleAuthFailure()
            }
        } catch {
            await handleAuthFailure()
        }
    }

    @MainActor
    private func parseJWTAndSetClaims(token: String) async {
        let segments = token.components(separatedBy: ".")
        guard segments.count == 3 else {
            print("Invalid JWT format")
            await handleAuthFailure()
            return
        }

        var base64Payload = segments[1]
        let remainder = base64Payload.count % 4
        if remainder > 0 {
            base64Payload = base64Payload.padding(toLength: base64Payload.count + (4 - remainder), withPad: "=", startingAt: 0)
        }

        guard let payloadData = Data(base64Encoded: base64Payload),
              let json = try? JSONSerialization.jsonObject(with: payloadData, options: []) as? [String: Any] else {
            print("Failed to decode or parse JWT payload")
            await handleAuthFailure()
            return
        }

        let appMetadata = json["app_metadata"] as? [String: Any]
        let restaurantIdClaim = (appMetadata?["restaurant_id"] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let roleClaim = (appMetadata?["role"] as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines)

        self.restaurantIdFromToken = restaurantIdClaim?.isEmpty == false ? restaurantIdClaim : nil
        self.userRole = roleClaim?.isEmpty == false ? roleClaim : nil
        self.isAuthenticated = currentUser != nil
    }
    
    /// Loads all branches the authenticated user can access and selects one.
    /// If branchCode is provided, selects the matching branch (login flow).
    /// If branchCode is nil, restores the last used branch or prompts for selection.
    @MainActor
    private func loadBranchesAndSelectDefault(branchCode: String?) async throws {
        guard isAuthenticated else { throw AuthError.noRestaurantAssociated }

        let branches: [Restaurant] = try await fetchAccessibleBranches()
        self.accessibleBranches = branches

        guard !branches.isEmpty else {
            self.currentRestaurant = nil
            throw AuthError.noRestaurantAssociated
        }

        let selection = Self.resolveBranchSelection(
            branches: branches,
            requestedBranchCode: branchCode,
            savedBranchId: loadSavedBranchId()
        )

        applyActiveRestaurantContext(selection.selectedBranch?.id)
        self.currentRestaurant = selection.selectedBranch
        self.needsBranchSelection = selection.needsBranchSelection

        if let selectedBranch = selection.selectedBranch {
            saveSavedBranchId(selectedBranch.id)
        } else {
            clearSavedBranchId()
        }
    }

    /// Fetches all restaurant/branch records this user's JWT grants access to.
    private func fetchAccessibleBranches() async throws -> [Restaurant] {
        do {
            let branches: [AccessibleBranchRecord] = try await client
                .rpc("get_accessible_branches_for_current_user")
                .execute()
                .value

            let mappedBranches = branches
                .map { $0.toRestaurant() }
                .sorted { lhs, rhs in
                    let lhsName = (lhs.name ?? lhs.subdomain).localizedLowercase
                    let rhsName = (rhs.name ?? rhs.subdomain).localizedLowercase
                    return lhsName < rhsName
                }

            if !mappedBranches.isEmpty {
                return mappedBranches
            }
        } catch {
            print("Failed to fetch accessible branches via RPC: \(error.localizedDescription)")
        }

        guard let restaurantIdToLoad = restaurantIdFromToken else {
            throw AuthError.noRestaurantAssociated
        }

        do {
            let branch = try await fetchBranchWithFallback(restaurantId: restaurantIdToLoad)
            return [branch]
        } catch {
            throw SupabaseManagerError.fetchError("Failed to load branch data.")
        }
    }

    private func fetchBranchWithFallback(restaurantId: String) async throws -> Restaurant {
        do {
            // Preferred query: include organization public subdomain when policy/shape allows it.
            return try await client
                .from("restaurants")
                .select("*, organization_restaurants(owner_organizations(public_subdomain))")
                .eq("id", value: restaurantId)
                .single()
                .execute()
                .value
        } catch {
            print("Falling back to base branch fetch: \(error.localizedDescription)")

            // Keep login reliable even if nested organization relations are not readable
            // for the current role or decode differently than expected.
            return try await client
                .from("restaurants")
                .select("*")
                .eq("id", value: restaurantId)
                .single()
                .execute()
                .value
        }
    }

    /// Switches the active branch without signing out.
    @MainActor
    func selectBranch(_ branch: Restaurant) {
        applyActiveRestaurantContext(branch.id)
        currentRestaurant = branch
        needsBranchSelection = false
        saveSavedBranchId(branch.id)
        clearCache()
    }

    private func saveSavedBranchId(_ id: String) {
        UserDefaults.standard.set(id, forKey: "lastUsedBranchId")
    }

    private func loadSavedBranchId() -> String? {
        UserDefaults.standard.string(forKey: "lastUsedBranchId")
    }

    private func clearSavedBranchId() {
        UserDefaults.standard.removeObject(forKey: "lastUsedBranchId")
    }

    // Helper function to consolidate auth failure cleanup
    @MainActor
    private func handleAuthFailure() {
        print("Handling authentication failure: Clearing sensitive data.")
        applyActiveRestaurantContext(nil)
        currentUser = nil
        currentRestaurant = nil
        accessibleBranches = []
        isAuthenticated = false
        needsBranchSelection = false
        userRole = nil
        restaurantIdFromToken = nil
        // Clear cache when auth fails
        clearCache()
        clearPersistedCurrentRestaurant()
        clearSavedBranchId()
    }

    private func loadPersistedCurrentRestaurant() {
        guard let data = UserDefaults.standard.data(forKey: persistedCurrentRestaurantKey),
              let restaurant = try? JSONDecoder().decode(Restaurant.self, from: data) else {
            return
        }

        currentRestaurant = restaurant
    }

    private func persistCurrentRestaurant() {
        guard let currentRestaurant else {
            clearPersistedCurrentRestaurant()
            return
        }

        guard let data = try? JSONEncoder().encode(currentRestaurant) else {
            return
        }

        UserDefaults.standard.set(data, forKey: persistedCurrentRestaurantKey)
    }

    private func clearPersistedCurrentRestaurant() {
        UserDefaults.standard.removeObject(forKey: persistedCurrentRestaurantKey)
    }

    private func applyActiveRestaurantContext(_ restaurantId: String?) {
        client = makeClient(activeRestaurantId: restaurantId)
    }

    private func makeClient(activeRestaurantId: String?) -> SupabaseClient {
        SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseKey,
            options: Self.makeClientOptions(
                activeRestaurantId: activeRestaurantId,
                authStorageKey: authStorageKey
            )
        )
    }

    static func activeRestaurantHeaders(activeRestaurantId: String?) -> [String: String] {
        guard let activeRestaurantId,
              !activeRestaurantId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return [:]
        }

        return [activeRestaurantHeaderName: activeRestaurantId]
    }

    private static func makeClientOptions(activeRestaurantId: String?, authStorageKey: String) -> SupabaseClientOptions {
        SupabaseClientOptions(
            auth: .init(storageKey: authStorageKey),
            global: .init(headers: activeRestaurantHeaders(activeRestaurantId: activeRestaurantId))
        )
    }

    static func resolveBranchSelection(
        branches: [Restaurant],
        requestedBranchCode: String?,
        savedBranchId: String?
    ) -> BranchSelectionState {
        guard !branches.isEmpty else {
            return BranchSelectionState(selectedBranch: nil, needsBranchSelection: false)
        }

        if let code = requestedBranchCode?
            .trimmingCharacters(in: .whitespacesAndNewlines),
           !code.isEmpty {
            let matchedBranch = branches.first { $0.matchesBranchCode(code) }
            if let matchedBranch {
                return BranchSelectionState(selectedBranch: matchedBranch, needsBranchSelection: false)
            }

            if branches.count == 1 {
                return BranchSelectionState(selectedBranch: branches[0], needsBranchSelection: false)
            }

            return BranchSelectionState(selectedBranch: nil, needsBranchSelection: true)
        }

        if let savedBranchId,
           let savedBranch = branches.first(where: { $0.id == savedBranchId }) {
            return BranchSelectionState(selectedBranch: savedBranch, needsBranchSelection: false)
        }

        if branches.count == 1 {
            return BranchSelectionState(selectedBranch: branches[0], needsBranchSelection: false)
        }

        return BranchSelectionState(selectedBranch: nil, needsBranchSelection: true)
    }
    
    // MARK: - Cache Management
    
    /// Clear all cached data
    func clearCache() {
        print("🧹 Clearing all cache")
        categoriesCache = nil
        menuItemsCache = nil
        menuItemDetailsCache.removeAll()
    }
    
    /// Clear specific cache entries
    func clearMenuCache() {
        print("🧹 Clearing menu cache")
        menuItemsCache = nil
        menuItemDetailsCache.removeAll()
    }
    
    func clearCategoriesCache() {
        print("🧹 Clearing categories cache")
        categoriesCache = nil
    }
    
    /// Check if cache has valid data
    func hasCachedCategories() -> Bool {
        return categoriesCache?.isValid == true
    }
    
    func hasCachedMenuItems() -> Bool {
        return menuItemsCache?.isValid == true
    }
    
    /// Get cache statistics for debugging
    func getCacheStats() -> String {
        let categoriesStatus = categoriesCache?.isValid == true ? "✅ Valid" : "❌ Invalid/Empty"
        let menuItemsStatus = menuItemsCache?.isValid == true ? "✅ Valid" : "❌ Invalid/Empty" 
        let detailsCount = menuItemDetailsCache.values.filter { $0.isValid }.count
        
        return """
        📊 Cache Status:
        Categories: \(categoriesStatus)
        Menu Items: \(menuItemsStatus)
        Item Details: \(detailsCount) cached
        TTL: \(cacheTTL)s
        """
    }
    
    // MARK: - Search Debounce (Optional Implementation)
    
    /// Debounced search function - call this instead of direct search to reduce API calls
    func debouncedSearch(query: String, completion: @escaping (String) -> Void) {
        searchDebounceTimer?.invalidate()
        searchDebounceTimer = Timer.scheduledTimer(withTimeInterval: searchDebounceDelay, repeats: false) { _ in
            completion(query)
        }
    }
    
    // MARK: - Data Fetching (New POS Flow Related)

    enum SupabaseManagerError: Error, LocalizedError {
        case missingRestaurantId
        case dataNotFound
        case fetchError(String)

        var errorDescription: String? {
            switch self {
            case .missingRestaurantId:
                return "Restaurant ID is missing. Cannot perform data fetching."
            case .dataNotFound:
                return "Requested data not found."
            case .fetchError(let message):
                return "Failed to fetch data: \(message)"
            }
        }
    }

    func fetchAllTables() async throws -> [Table] {
        guard let restaurantId = self.currentRestaurantId else {
            print("Error: Missing restaurantId in fetchAllTables")
            throw SupabaseManagerError.missingRestaurantId
        }
        do {
            let tables: [Table] = try await client
                .from("tables")
                .select()
                .eq("restaurant_id", value: restaurantId)
                .order("name", ascending: true)
                .execute()
                .value
            return tables
        } catch {
            print("Error fetching tables: \(error.localizedDescription)")
            throw SupabaseManagerError.fetchError(error.localizedDescription)
        }
    }

    func fetchAllCategories() async throws -> [Category] {
        // Check cache first
        if let cachedCategories = categoriesCache, cachedCategories.isValid {
            print("📱 Using cached categories")
            return cachedCategories.data
        }
        
        guard let restaurantId = self.currentRestaurantId else {
            print("Error: Missing restaurantId in fetchAllCategories")
            throw SupabaseManagerError.missingRestaurantId
        }
        
        do {
            print("🌐 Fetching categories from database")
            let categories: [Category] = try await client
                .from("categories")
                .select() // Assuming category model has restaurant_id or RLS is in place
                .eq("restaurant_id", value: restaurantId) // Ensure only for current restaurant
                .order("position", ascending: true) // Assuming 'position' for ordering
                .execute()
                .value
            
            // Cache the result
            categoriesCache = CacheItem(data: categories, timestamp: Date(), ttl: cacheTTL)
            print("✅ Cached \(categories.count) categories")
            
            return categories
        } catch {
            print("Error fetching categories: \(error.localizedDescription)")
            throw SupabaseManagerError.fetchError(error.localizedDescription)
        }
    }

    func fetchMenuItems(categoryId: String) async throws -> [MenuItem] {
        guard let restaurantId = self.currentRestaurantId else {
            print("Error: Missing restaurantId in fetchMenuItems")
            throw SupabaseManagerError.missingRestaurantId
        }
        do {
            let menuItems: [MenuItem] = try await client
                .from("menu_items")
                .select("*, category:categories(*)") // Example of joining category details
                .eq("restaurant_id", value: restaurantId)
                .eq("category_id", value: categoryId)
                .order("position", ascending: true) // Assuming 'position' for ordering
                .execute()
                .value
            return menuItems
        } catch {
            print("Error fetching menu items for category \(categoryId): \(error.localizedDescription)")
            throw SupabaseManagerError.fetchError(error.localizedDescription)
        }
    }

    func fetchAllMenuItems() async throws -> [MenuItem] {
        // Check cache first
        if let cachedMenuItems = menuItemsCache, cachedMenuItems.isValid {
            print("📱 Using cached menu items")
            return cachedMenuItems.data
        }
        
        guard let restaurantId = self.currentRestaurantId else {
            print("Error: Missing restaurantId in fetchAllMenuItems")
            throw SupabaseManagerError.missingRestaurantId
        }
        
        do {
            print("🌐 Fetching menu items from database")
            let menuItems: [MenuItem] = try await client
                .from("menu_items")
                .select("*, category:categories(*)") // Join category details for filtering
                .eq("restaurant_id", value: restaurantId)
                .eq("available", value: true) // Only fetch available items for POS
                .order("position", ascending: true)
                .execute()
                .value
            
            // Cache the result
            menuItemsCache = CacheItem(data: menuItems, timestamp: Date(), ttl: cacheTTL)
            print("✅ Cached \(menuItems.count) menu items")
            
            return menuItems
        } catch {
            print("Error fetching all menu items: \(error.localizedDescription)")
            throw SupabaseManagerError.fetchError(error.localizedDescription)
        }
    }

    // Fetch menu item details including available sizes and toppings
    func fetchMenuItemDetails(menuItemId: String) async throws -> MenuItem {
        // Check cache first
        if let cachedItem = menuItemDetailsCache[menuItemId], cachedItem.isValid {
            print("📱 Using cached menu item details for \(menuItemId)")
            return cachedItem.data
        }
        
        do {
            print("🌐 Fetching menu item details from database for \(menuItemId)")
            let menuItem: MenuItem = try await client
                .from("menu_items")
                .select("*, category:categories(*), availableSizes:menu_item_sizes(*), availableToppings:toppings(*)")
                .eq("id", value: menuItemId)
                .single()
                .execute()
                .value
            
            // Cache the result
            menuItemDetailsCache[menuItemId] = CacheItem(data: menuItem, timestamp: Date(), ttl: cacheTTL)
            print("✅ Cached menu item details for \(menuItemId)")
            
            return menuItem
        } catch {
            print("Error fetching menu item details for \(menuItemId): \(error.localizedDescription)")
            throw SupabaseManagerError.fetchError(error.localizedDescription)
        }
    }

    // MARK: - Tables Management

    /// Fetches all tables for the current restaurant
    /// - Returns: Array of Table objects
    /// - Throws: Error if fetch fails or user is not authenticated
    func fetchTables() async throws -> [Table] {
        guard let restaurantId = currentRestaurantId else {
            throw AuthError.noRestaurantAssociated
        }

        do {
            let response: [Table] = try await client
                .from("tables")
                .select()
                .eq("restaurant_id", value: restaurantId)
                .order("name", ascending: true)
                .execute()
                .value

            print("Fetched \(response.count) tables for restaurant \(restaurantId)")
            return response
        } catch {
            print("Error fetching tables: \(error)")
            throw error
        }
    }
}

// MARK: - Models
struct Restaurant: Codable {
    let id: String
    let name: String?
    let subdomain: String
    let branchCode: String?
    let timezone: String
    let currency: String?
    let address: String?
    let phone: String?
    let email: String?
    let website: String?
    let paymentMethods: [String]?
    let organizationLinks: [RestaurantOrganizationLink]?
    let created_at: String
    let updated_at: String
    let taxRate: Double?
    private let companyPublicSubdomainValue: String?

    init(
        id: String,
        name: String?,
        subdomain: String,
        branchCode: String?,
        timezone: String,
        currency: String?,
        address: String?,
        phone: String?,
        email: String?,
        website: String?,
        paymentMethods: [String]?,
        organizationLinks: [RestaurantOrganizationLink]?,
        created_at: String,
        updated_at: String,
        taxRate: Double?,
        companyPublicSubdomainValue: String? = nil
    ) {
        self.id = id
        self.name = name
        self.subdomain = subdomain
        self.branchCode = branchCode
        self.timezone = timezone
        self.currency = currency
        self.address = address
        self.phone = phone
        self.email = email
        self.website = website
        self.paymentMethods = paymentMethods
        self.organizationLinks = organizationLinks
        self.created_at = created_at
        self.updated_at = updated_at
        self.taxRate = taxRate
        self.companyPublicSubdomainValue = companyPublicSubdomainValue
    }

    var companyPublicSubdomain: String? {
        if let companyPublicSubdomainValue,
           !companyPublicSubdomainValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return companyPublicSubdomainValue
        }

        return organizationLinks?
            .compactMap { $0.ownerOrganizations?.first?.publicSubdomain }
            .first(where: { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty })
    }

    enum CodingKeys: String, CodingKey {
        case id, name, subdomain, timezone, currency, address, phone, email, website, created_at, updated_at
        case branchCode = "branch_code"
        case paymentMethods = "payment_methods"
        case organizationLinks = "organization_restaurants"
        case taxRate = "tax_rate"
        case companyPublicSubdomainValue = "company_public_subdomain"
    }

    func matchesBranchCode(_ code: String) -> Bool {
        let normalizedCode = code.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        return branchCode?.lowercased() == normalizedCode || subdomain.lowercased() == normalizedCode
    }
}

struct RestaurantOrganizationLink: Codable {
    let ownerOrganizations: [RestaurantOwnerOrganization]?

    enum CodingKeys: String, CodingKey {
        case ownerOrganizations = "owner_organizations"
    }
}

struct RestaurantOwnerOrganization: Codable {
    let publicSubdomain: String?

    enum CodingKeys: String, CodingKey {
        case publicSubdomain = "public_subdomain"
    }
}

private struct AccessibleBranchRecord: Codable {
    let id: String
    let name: String?
    let subdomain: String
    let branchCode: String?
    let timezone: String
    let currency: String?
    let address: String?
    let phone: String?
    let email: String?
    let website: String?
    let paymentMethods: [String]?
    let created_at: String
    let updated_at: String
    let taxRate: Double?
    let companyPublicSubdomain: String?

    enum CodingKeys: String, CodingKey {
        case id, name, subdomain, timezone, currency, address, phone, email, website, created_at, updated_at
        case branchCode = "branch_code"
        case paymentMethods = "payment_methods"
        case taxRate = "tax_rate"
        case companyPublicSubdomain = "company_public_subdomain"
    }

    func toRestaurant() -> Restaurant {
        Restaurant(
            id: id,
            name: name,
            subdomain: subdomain,
            branchCode: branchCode,
            timezone: timezone,
            currency: currency,
            address: address,
            phone: phone,
            email: email,
            website: website,
            paymentMethods: paymentMethods,
            organizationLinks: nil,
            created_at: created_at,
            updated_at: updated_at,
            taxRate: taxRate,
            companyPublicSubdomainValue: companyPublicSubdomain
        )
    }
}

enum AuthError: LocalizedError {
    case noRestaurantAssociated
    case tokenError
    case missingRestaurantClaim
    case invalidCredentials
    case networkError
    case unknownError

    var errorDescription: String? {
        switch self {
        case .noRestaurantAssociated:
            return "No branch associated with this user."
        case .tokenError:
            return "Invalid or missing authentication token."
        case .missingRestaurantClaim:
            return "Token is missing required branch information."
        case .invalidCredentials:
            return "Invalid email or password."
        case .networkError:
            return "A network error occurred. Please check your connection and try again."
        case .unknownError:
            return "An unknown authentication error occurred."
        }
    }
}

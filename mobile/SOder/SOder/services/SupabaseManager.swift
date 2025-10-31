import Foundation
import Supabase

class SupabaseManager: ObservableObject {
    static let shared = SupabaseManager()
    
    let client: SupabaseClient
    
    @Published var currentUser: User?
    @Published var currentRestaurant: Restaurant?
    @Published var isAuthenticated = false
    @Published var userRole: String? // Added for JWT role claim
    
    // Internal property to store restaurant ID from JWT
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
    
    // Search debounce
    private var searchDebounceTimer: Timer?
    private let searchDebounceDelay: TimeInterval = 0.3 // 300ms as specified in plan

    var currentRestaurantId: String? {
        // Prioritize ID from token if available, otherwise from loaded restaurant
        return restaurantIdFromToken ?? currentRestaurant?.id
    }
    
    private init() {
        // Use configuration from Info.plist instead of hardcoded values
        guard let supabaseURL = URL(string: Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String ?? "") else {
            fatalError("SUPABASE_URL not found in Info.plist")
        }
        
        guard let supabaseKey = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String else {
            fatalError("SUPABASE_ANON_KEY not found in Info.plist")
        }
        
        self.client = SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseKey
        )
        
        // Check for existing session
        Task {
            await checkAuthStatus()
        }
    }
    
    // MARK: - Authentication
    @MainActor
    func signIn(subdomain: String, email: String, password: String) async throws {
        let response = try await client.auth.signIn(email: email, password: password)
        currentUser = response.user
        
        // Parse JWT and set claims
        let token = response.accessToken // Correctly access accessToken from Session
        if !token.isEmpty { // Check if the non-optional token string is empty
            await parseJWTAndSetClaims(token: token)
        } else {
            // Handle missing or empty token case
            print("Error: Access token not found or is empty after sign in.")
            await handleAuthFailure()
            throw AuthError.tokenError
        }

        // Load restaurant data only if JWT parsing was successful and restaurantIdFromToken is set
        if isAuthenticated && restaurantIdFromToken != nil {
            await loadRestaurantData()
        } else {
            // If JWT parsing failed or restaurantId is missing, ensure user is not treated as authenticated for restaurant data
            if restaurantIdFromToken == nil { print("Error: restaurant_id missing from token.") }
            await handleAuthFailure() // Clears sensitive data and sets isAuthenticated to false
            throw AuthError.missingRestaurantClaim // Define this error
        }
    }
    
    @MainActor
    func signOut() async throws {
        try await client.auth.signOut()
        currentUser = nil
        currentRestaurant = nil
        isAuthenticated = false
        userRole = nil // Clear role
        restaurantIdFromToken = nil // Clear token-derived restaurant ID
        // Clear cache on sign out
        clearCache()
    }
    
    @MainActor
    private func checkAuthStatus() async {
        do {
            let session = try await client.auth.session // Get current session
            currentUser = session.user
            
            let token = session.accessToken // Correctly access accessToken from Session
            if !token.isEmpty { // Check if the non-optional token string is empty
                await parseJWTAndSetClaims(token: token)
            } else {
                // No active session token or token is empty
                print("Error: Access token not found or is empty in existing session.")
                await handleAuthFailure()
                return
            }

            if isAuthenticated && restaurantIdFromToken != nil {
                await loadRestaurantData()
            } else {
                // If token parsing failed or no restaurantId, ensure clean state
                await handleAuthFailure()
            }
            
        } catch {
            print("Error checking auth status or no active session: \(error)")
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

        guard let appMetadata = json["app_metadata"] as? [String: Any],
              let restaurantIdClaim = appMetadata["restaurant_id"] as? String,
              let roleClaim = appMetadata["role"] as? String,
              !restaurantIdClaim.isEmpty else { // Role claim can be optional depending on needs
            print("Essential claims (restaurant_id) missing or invalid in JWT app_metadata.")
            await handleAuthFailure()
            return
        }

        self.restaurantIdFromToken = restaurantIdClaim
        self.userRole = roleClaim // Store the role
        self.isAuthenticated = true // Set authenticated only after successful parsing
    }
    
    @MainActor
    private func loadRestaurantData() async { // Removed subdomain parameter
        guard let user = currentUser, isAuthenticated, let restaurantIdToLoad = self.restaurantIdFromToken else {
            if self.restaurantIdFromToken == nil {
                 print("Debug: restaurantIdFromToken is nil during loadRestaurantData call.")
            }
            // Optionally clear currentRestaurant if auth state is inconsistent
            // self.currentRestaurant = nil
            return
        }
        
        do {
            let restaurant: Restaurant = try await client
                .from("restaurants")
                .select("*")
                .eq("id", value: restaurantIdToLoad) // Use restaurantIdFromToken
                .single()
                .execute()
                .value
            
            currentRestaurant = restaurant
            print("Loaded restaurant: \(restaurant.name ?? "Unknown"), ID: \(restaurant.id)")
        } catch {
            print("Error loading restaurant data for ID \(restaurantIdToLoad): \(error)")
            // Fallback or error handling:
            // currentRestaurant = nil // Or a mock if absolutely necessary for some flows
            // For testing, create a mock restaurant with the test ID
            currentRestaurant = Restaurant(
                id: restaurantIdToLoad, // Use the ID from token for mock consistency
                name: "Fallback Restaurant (Error)",
                subdomain: "error", // Indicate error state
                timezone: "UTC",
                created_at: "",
                updated_at: "",
                taxRate: 0.1
            )
            print("Using fallback restaurant due to loading error.")
        }
    }

    // Helper function to consolidate auth failure cleanup
    @MainActor
    private func handleAuthFailure() {
        print("Handling authentication failure: Clearing sensitive data.")
        currentUser = nil
        currentRestaurant = nil
        isAuthenticated = false
        userRole = nil
        restaurantIdFromToken = nil
        // Clear cache when auth fails
        clearCache()
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

    // MARK: - Debug Functions
    @MainActor
    func debugDatabaseConnection() async {
        print("=== DEBUG: Database Connection ===")
        print("Auth status: \(isAuthenticated)")
        print("Current user: \(currentUser?.email ?? "None")")
        print("Current restaurant: \(currentRestaurant?.name ?? "None")")
        print("Restaurant ID: \(currentRestaurantId ?? "None")")
        
        // Test basic connection
        do {
            let result: [Restaurant] = try await client
                .from("restaurants")
                .select("id, name")
                .limit(5)
                .execute()
                .value
            
            print("Found \(result.count) restaurants in database:")
            for restaurant in result {
                print("- \(restaurant.name ?? "Unnamed") (ID: \(restaurant.id))")
            }
        } catch {
            print("Error testing database connection: \(error)")
        }
        
        // Test orders table specifically
        do {
            let orders: [BasicDebugOrder] = try await client
                .from("orders")
                .select("id, restaurant_id, status, created_at")
                .limit(10)
                .execute()
                .value
            
            print("Found \(orders.count) total orders in database:")
            for order in orders {
                print("- Order \(order.id): Restaurant \(order.restaurant_id), Status: \(order.status ?? "unknown")")
            }
            
            // Check orders for our specific restaurant
            if let restaurantId = currentRestaurantId {
                let restaurantOrders: [BasicDebugOrder] = try await client
                    .from("orders")
                    .select("id, restaurant_id, status, created_at")
                    .eq("restaurant_id", value: restaurantId)
                    .execute()
                    .value
                
                print("Found \(restaurantOrders.count) orders for restaurant \(restaurantId):")
                for order in restaurantOrders {
                    print("- Order \(order.id): Status \(order.status ?? "unknown"), Created: \(order.created_at ?? "unknown")")
                }
            }
            
        } catch {
            print("Error checking orders: \(error)")
        }
    }
    
    // For testing - bypass authentication
    @MainActor
    func setTestRestaurant() {
        currentRestaurant = Restaurant(
            id: "9d5a32cd-9eb9-4b4c-ad73-8fe98d17a95e",
            name: "Test Vietnamese Restaurant",
            subdomain: "test",
            timezone: "Asia/Tokyo",
            created_at: "",
            updated_at: "",
            taxRate: 0.1
        )
        isAuthenticated = true
        print("Set test restaurant: \(currentRestaurant?.name ?? "Unknown")")
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

// Debug model for orders
private struct BasicDebugOrder: Codable {
    let id: String
    let restaurant_id: String
    let status: String?
    let created_at: String?
}

// MARK: - Models
struct UserInfo: Codable {
    let restaurant_id: String
}

struct Restaurant: Codable {
    let id: String
    let name: String?
    let subdomain: String
    let timezone: String
    let created_at: String
    let updated_at: String
    let taxRate: Double?
    
    enum CodingKeys: String, CodingKey {
        case id, name, subdomain, timezone, created_at, updated_at
        case taxRate = "tax_rate"
    }
}

enum AuthError: LocalizedError {
    case noRestaurantAssociated
    case subdomainMismatch
    case tokenError // Added for JWT issues
    case missingRestaurantClaim // Added for missing restaurant_id in JWT
    case invalidCredentials
    case networkError
    // case subdomainNotFound // Removed as it's more of an authorization/data validation issue post-auth
    case unknownError
    
    var errorDescription: String? {
        switch self {
        case .noRestaurantAssociated:
            return "No restaurant associated with this user."
        case .subdomainMismatch:
            return "User does not belong to the specified restaurant."
        case .tokenError:
            return "Invalid or missing authentication token."
        case .missingRestaurantClaim:
            return "Token is missing required restaurant information."
        case .invalidCredentials:
            return "Invalid email or password."
        case .networkError:
            return "A network error occurred. Please check your connection and try again."
        // case .subdomainNotFound:
        //     return "The specified subdomain was not found."
        case .unknownError:
            return "An unknown authentication error occurred."
        }
    }
}

import XCTest
@testable import SOder

final class SupabaseBranchContextTests: XCTestCase {

    func testResolveBranchSelectionPrefersRequestedBranchCode() throws {
        let branches = try [
            makeRestaurant(id: "11111111-1111-1111-1111-111111111111", name: "Tokyo", subdomain: "tokyo", branchCode: "TKY"),
            makeRestaurant(id: "22222222-2222-2222-2222-222222222222", name: "Osaka", subdomain: "osaka", branchCode: "OSA")
        ]

        let selection = SupabaseManager.resolveBranchSelection(
            branches: branches,
            requestedBranchCode: "OSA",
            savedBranchId: nil
        )

        XCTAssertEqual(selection.selectedBranch?.id, "22222222-2222-2222-2222-222222222222")
        XCTAssertFalse(selection.needsBranchSelection)
    }

    func testResolveBranchSelectionPromptsWhenRequestedCodeDoesNotMatchMultipleBranches() throws {
        let branches = try [
            makeRestaurant(id: "11111111-1111-1111-1111-111111111111", name: "Tokyo", subdomain: "tokyo", branchCode: "TKY"),
            makeRestaurant(id: "22222222-2222-2222-2222-222222222222", name: "Osaka", subdomain: "osaka", branchCode: "OSA")
        ]

        let selection = SupabaseManager.resolveBranchSelection(
            branches: branches,
            requestedBranchCode: "FUK",
            savedBranchId: nil
        )

        XCTAssertNil(selection.selectedBranch)
        XCTAssertTrue(selection.needsBranchSelection)
    }

    func testResolveBranchSelectionRestoresSavedBranchWhenAvailable() throws {
        let branches = try [
            makeRestaurant(id: "11111111-1111-1111-1111-111111111111", name: "Tokyo", subdomain: "tokyo", branchCode: "TKY"),
            makeRestaurant(id: "22222222-2222-2222-2222-222222222222", name: "Osaka", subdomain: "osaka", branchCode: "OSA")
        ]

        let selection = SupabaseManager.resolveBranchSelection(
            branches: branches,
            requestedBranchCode: nil,
            savedBranchId: "11111111-1111-1111-1111-111111111111"
        )

        XCTAssertEqual(selection.selectedBranch?.subdomain, "tokyo")
        XCTAssertFalse(selection.needsBranchSelection)
    }

    func testActiveRestaurantHeadersIncludeSelectedBranchContext() {
        let headers = SupabaseManager.activeRestaurantHeaders(
            activeRestaurantId: "11111111-1111-1111-1111-111111111111"
        )

        XCTAssertEqual(
            headers[SupabaseManager.activeRestaurantHeaderName],
            "11111111-1111-1111-1111-111111111111"
        )
    }

    func testRestaurantDecodesCompanyPublicSubdomainFromTopLevelField() throws {
        let restaurant = try makeRestaurant(
            id: "11111111-1111-1111-1111-111111111111",
            name: "Tokyo",
            subdomain: "tokyo",
            branchCode: "TKY",
            companyPublicSubdomain: "pho-group"
        )

        XCTAssertEqual(restaurant.companyPublicSubdomain, "pho-group")
    }

    private func makeRestaurant(
        id: String,
        name: String,
        subdomain: String,
        branchCode: String,
        companyPublicSubdomain: String? = nil
    ) throws -> Restaurant {
        var payload: [String: Any] = [
            "id": id,
            "name": name,
            "subdomain": subdomain,
            "branch_code": branchCode,
            "timezone": "Asia/Tokyo",
            "currency": "JPY",
            "address": "1-2-3 Tokyo",
            "phone": "090-0000-0000",
            "email": "branch@example.com",
            "website": "https://example.com",
            "payment_methods": ["cash", "card"],
            "tax_rate": 0.1,
            "created_at": "2026-04-22T00:00:00Z",
            "updated_at": "2026-04-22T00:00:00Z"
        ]

        if let companyPublicSubdomain {
            payload["company_public_subdomain"] = companyPublicSubdomain
        }

        let data = try JSONSerialization.data(withJSONObject: payload)
        return try JSONDecoder().decode(Restaurant.self, from: data)
    }
}

import XCTest
@testable import SOder

/// Tests for the money calculation logic used in CheckoutView.
/// The CheckoutCalculator struct mirrors the exact computed properties
/// from CheckoutView so we can test them in isolation.
final class CheckoutCalculationTests: XCTestCase {

    // MARK: - Calculator

    private struct CheckoutCalculator {
        let subtotal: Double
        let discountPercentage: Double
        let customDiscountAmount: Double
        let usePercentageDiscount: Bool
        let taxRate: Double
        let receivedAmount: Double
        let isCashPayment: Bool

        var discountAmount: Double {
            if usePercentageDiscount {
                return subtotal * (discountPercentage / 100)
            } else {
                return min(customDiscountAmount, subtotal)
            }
        }

        var afterDiscountAmount: Double {
            max(0, subtotal - discountAmount)
        }

        var taxAmount: Double {
            afterDiscountAmount * taxRate
        }

        var totalAmount: Double {
            afterDiscountAmount + taxAmount
        }

        var changeAmount: Double {
            guard isCashPayment && receivedAmount > totalAmount else { return 0 }
            return receivedAmount - totalAmount
        }

        var quickAmounts: [Double] {
            let roundedTotal = ceil(totalAmount / 1000) * 1000
            return [
                roundedTotal,
                roundedTotal + 1000,
                roundedTotal + 2000,
                roundedTotal + 5000,
                10000,
                20000
            ].filter { $0 >= totalAmount }
        }
    }

    /// Replicates CheckoutView.subtotal: sum active (non-canceled) item totals.
    private func makeSubtotal(
        items: [(quantity: Int, priceAtOrder: Double, canceled: Bool)]
    ) -> Double {
        items
            .filter { !$0.canceled }
            .reduce(0) { $0 + Double($1.quantity) * $1.priceAtOrder }
    }

    // MARK: - Subtotal

    func testSubtotal_singleItem() {
        let subtotal = makeSubtotal(items: [(quantity: 2, priceAtOrder: 500, canceled: false)])
        XCTAssertEqual(subtotal, 1000)
    }

    func testSubtotal_multipleItems() {
        let subtotal = makeSubtotal(items: [
            (quantity: 1, priceAtOrder: 1200, canceled: false),
            (quantity: 3, priceAtOrder: 300, canceled: false)
        ])
        XCTAssertEqual(subtotal, 2100)
    }

    func testSubtotal_canceledItemsExcluded() {
        let subtotal = makeSubtotal(items: [
            (quantity: 2, priceAtOrder: 500, canceled: false),
            (quantity: 1, priceAtOrder: 800, canceled: true)
        ])
        XCTAssertEqual(subtotal, 1000)
    }

    func testSubtotal_allCanceled() {
        let subtotal = makeSubtotal(items: [
            (quantity: 2, priceAtOrder: 500, canceled: true)
        ])
        XCTAssertEqual(subtotal, 0)
    }

    func testSubtotal_emptyCart() {
        let subtotal = makeSubtotal(items: [])
        XCTAssertEqual(subtotal, 0)
    }

    // MARK: - Discount (Percentage)

    func testDiscount_tenPercent() {
        let calc = make(subtotal: 2000, discountPercentage: 10, usePercentage: true)
        XCTAssertEqual(calc.discountAmount, 200, accuracy: 0.001)
    }

    func testDiscount_zeroPercent() {
        let calc = make(subtotal: 2000, discountPercentage: 0, usePercentage: true)
        XCTAssertEqual(calc.discountAmount, 0)
    }

    func testDiscount_fiftyPercent() {
        let calc = make(subtotal: 2000, discountPercentage: 50, usePercentage: true)
        XCTAssertEqual(calc.discountAmount, 1000, accuracy: 0.001)
    }

    // MARK: - Discount (Fixed)

    func testDiscount_fixedAmount() {
        let calc = make(subtotal: 2000, customDiscountAmount: 500, usePercentage: false)
        XCTAssertEqual(calc.discountAmount, 500, accuracy: 0.001)
    }

    func testDiscount_fixedAmount_cappedAtSubtotal() {
        let calc = make(subtotal: 2000, customDiscountAmount: 3000, usePercentage: false)
        XCTAssertEqual(calc.discountAmount, 2000, accuracy: 0.001)
    }

    func testDiscount_fixedZero() {
        let calc = make(subtotal: 2000, customDiscountAmount: 0, usePercentage: false)
        XCTAssertEqual(calc.discountAmount, 0)
    }

    // MARK: - After-Discount Amount

    func testAfterDiscount_withPercentageDiscount() {
        // 1000 - 20% = 800
        let calc = make(subtotal: 1000, discountPercentage: 20, usePercentage: true)
        XCTAssertEqual(calc.afterDiscountAmount, 800, accuracy: 0.001)
    }

    func testAfterDiscount_flooredAtZero() {
        // fixed discount bigger than subtotal → capped, afterDiscount = 0
        let calc = make(subtotal: 500, customDiscountAmount: 800, usePercentage: false)
        XCTAssertEqual(calc.afterDiscountAmount, 0)
    }

    func testAfterDiscount_noDiscount() {
        let calc = make(subtotal: 1500, discountPercentage: 0, usePercentage: true)
        XCTAssertEqual(calc.afterDiscountAmount, 1500)
    }

    // MARK: - Tax Amount

    func testTax_tenPercent() {
        let calc = make(subtotal: 1000, taxRate: 0.10)
        XCTAssertEqual(calc.taxAmount, 100, accuracy: 0.001)
    }

    func testTax_zeroRate() {
        let calc = make(subtotal: 1000, taxRate: 0.0)
        XCTAssertEqual(calc.taxAmount, 0)
    }

    func testTax_eightPercent() {
        let calc = make(subtotal: 1000, taxRate: 0.08)
        XCTAssertEqual(calc.taxAmount, 80, accuracy: 0.001)
    }

    func testTax_appliedAfterDiscount() {
        // subtotal=2000, 10% discount → afterDiscount=1800, 10% tax = 180
        let calc = make(subtotal: 2000, discountPercentage: 10, usePercentage: true, taxRate: 0.10)
        XCTAssertEqual(calc.taxAmount, 180, accuracy: 0.001)
    }

    func testTax_zeroSubtotal() {
        let calc = make(subtotal: 0, taxRate: 0.10)
        XCTAssertEqual(calc.taxAmount, 0)
    }

    // MARK: - Total Amount

    func testTotal_noDiscount() {
        // 1000 + 10% = 1100
        let calc = make(subtotal: 1000, taxRate: 0.10)
        XCTAssertEqual(calc.totalAmount, 1100, accuracy: 0.001)
    }

    func testTotal_withPercentageDiscount() {
        // subtotal=2000, 10% off → 1800, 10% tax → 1980
        let calc = make(subtotal: 2000, discountPercentage: 10, usePercentage: true, taxRate: 0.10)
        XCTAssertEqual(calc.totalAmount, 1980, accuracy: 0.001)
    }

    func testTotal_withFixedDiscount() {
        // subtotal=1500, -500 → 1000, 10% tax → 1100
        let calc = make(subtotal: 1500, customDiscountAmount: 500, usePercentage: false, taxRate: 0.10)
        XCTAssertEqual(calc.totalAmount, 1100, accuracy: 0.001)
    }

    func testTotal_zeroSubtotal() {
        let calc = make(subtotal: 0, taxRate: 0.10)
        XCTAssertEqual(calc.totalAmount, 0)
    }

    func testTotal_fullDiscount() {
        // entire amount discounted → total = 0
        let calc = make(subtotal: 1000, customDiscountAmount: 1000, usePercentage: false, taxRate: 0.10)
        XCTAssertEqual(calc.totalAmount, 0)
    }

    // MARK: - Change Amount

    func testChange_exactPayment_returnsZero() {
        let calc = make(subtotal: 1000, taxRate: 0.10, receivedAmount: 1100, isCash: true)
        XCTAssertEqual(calc.changeAmount, 0, accuracy: 0.001)
    }

    func testChange_overpayment() {
        // total=1100, received=2000, change=900
        let calc = make(subtotal: 1000, taxRate: 0.10, receivedAmount: 2000, isCash: true)
        XCTAssertEqual(calc.changeAmount, 900, accuracy: 0.001)
    }

    func testChange_insufficientPayment_returnsZero() {
        let calc = make(subtotal: 1000, taxRate: 0.10, receivedAmount: 500, isCash: true)
        XCTAssertEqual(calc.changeAmount, 0)
    }

    func testChange_nonCashPayment_alwaysZero() {
        let calc = make(subtotal: 1000, taxRate: 0.10, receivedAmount: 5000, isCash: false)
        XCTAssertEqual(calc.changeAmount, 0)
    }

    func testChange_zeroReceived_returnsZero() {
        let calc = make(subtotal: 1000, taxRate: 0.10, receivedAmount: 0, isCash: true)
        XCTAssertEqual(calc.changeAmount, 0)
    }

    // MARK: - Quick Amounts

    func testQuickAmounts_allAboveOrEqualTotal() {
        // total=1100 → all suggestions must be ≥ 1100
        let calc = make(subtotal: 1000, taxRate: 0.10)
        XCTAssertTrue(calc.quickAmounts.allSatisfy { $0 >= calc.totalAmount })
    }

    func testQuickAmounts_containsRoundedThousand() {
        // total=1100 → ceil(1100/1000)*1000 = 2000
        let calc = make(subtotal: 1000, taxRate: 0.10)
        XCTAssertTrue(calc.quickAmounts.contains(2000))
    }

    func testQuickAmounts_exactThousand() {
        // total=3000, no tax → roundedTotal=3000, first suggestion = 3000
        let calc = make(subtotal: 3000, taxRate: 0.0)
        XCTAssertEqual(calc.quickAmounts.first, 3000)
    }

    func testQuickAmounts_highTotal_filtersSmallValues() {
        // total=15000, no tax → suggestions with roundedTotal=15000; 10000 filtered out
        let calc = make(subtotal: 15000, taxRate: 0.0)
        XCTAssertTrue(calc.quickAmounts.allSatisfy { $0 >= 15000 })
        XCTAssertFalse(calc.quickAmounts.contains(10000))
    }

    func testQuickAmounts_neverEmpty_whenTotalPositive() {
        let calc = make(subtotal: 500, taxRate: 0.10)
        XCTAssertFalse(calc.quickAmounts.isEmpty)
    }

    // MARK: - Factory helper

    private func make(
        subtotal: Double,
        discountPercentage: Double = 0,
        customDiscountAmount: Double = 0,
        usePercentage: Bool = true,
        taxRate: Double = 0.10,
        receivedAmount: Double = 0,
        isCash: Bool = false
    ) -> CheckoutCalculator {
        CheckoutCalculator(
            subtotal: subtotal,
            discountPercentage: discountPercentage,
            customDiscountAmount: customDiscountAmount,
            usePercentageDiscount: usePercentage,
            taxRate: taxRate,
            receivedAmount: receivedAmount,
            isCashPayment: isCash
        )
    }
}

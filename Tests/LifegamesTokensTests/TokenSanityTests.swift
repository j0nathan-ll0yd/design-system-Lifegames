import CoreGraphics
import Testing
@testable import LifegamesTokens

@Suite("Token Sanity Tests — Generated Swift token values are correct")
struct TokenSanityTests {
    @Test func spacingScaleIsMonotonicallyIncreasing() {
        let values: [CGFloat] = [
            Spacing.s50, Spacing.s100, Spacing.s150, Spacing.s200,
            Spacing.s250, Spacing.s300, Spacing.s350, Spacing.s400,
            Spacing.s450, Spacing.s500, Spacing.s600, Spacing.s700,
            Spacing.s800, Spacing.s900, Spacing.s1000, Spacing.s1200,
            Spacing.s1600,
        ]
        for i in 1..<values.count {
            #expect(values[i] > values[i - 1], "Spacing scale not monotonically increasing at index \(i)")
        }
    }

    @Test func spacingBaselineValues() {
        #expect(Spacing.s100 == 4)
        #expect(Spacing.s200 == 8)
        #expect(Spacing.s400 == 16)
        #expect(Spacing.s800 == 32)
    }

    @Test func spacingAllPositive() {
        let values: [CGFloat] = [
            Spacing.s50, Spacing.s100, Spacing.s150, Spacing.s200,
            Spacing.s250, Spacing.s300, Spacing.s350, Spacing.s400,
            Spacing.s450, Spacing.s500, Spacing.s600, Spacing.s700,
            Spacing.s800, Spacing.s900, Spacing.s1000, Spacing.s1200,
            Spacing.s1600,
        ]
        for value in values {
            #expect(value > 0, "Spacing value should be positive")
        }
    }
}

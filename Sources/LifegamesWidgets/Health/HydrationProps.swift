import Foundation

public struct HydrationProps: Hashable, Codable, Sendable {
    public let waterOz: Int
    public let caffeineMg: Int
    public let waterMax: Int
    public let caffeineMax: Int
    public let waterRangeLo: Int
    public let waterRangeHi: Int
    public let caffeineRangeLo: Int
    public let caffeineRangeHi: Int

    public init(
        waterOz: Int, caffeineMg: Int, waterMax: Int, caffeineMax: Int,
        waterRangeLo: Int, waterRangeHi: Int, caffeineRangeLo: Int, caffeineRangeHi: Int
    ) {
        self.waterOz = waterOz
        self.caffeineMg = caffeineMg
        self.waterMax = waterMax
        self.caffeineMax = caffeineMax
        self.waterRangeLo = waterRangeLo
        self.waterRangeHi = waterRangeHi
        self.caffeineRangeLo = caffeineRangeLo
        self.caffeineRangeHi = caffeineRangeHi
    }

    public var waterPercent: Double {
        guard waterMax > 0 else { return 0 }
        return min(Double(waterOz) / Double(waterMax), 1.0)
    }

    public var caffeinePercent: Double {
        guard caffeineMax > 0 else { return 0 }
        return min(Double(caffeineMg) / Double(caffeineMax), 1.0)
    }
}

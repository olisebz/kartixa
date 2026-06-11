import Foundation

enum PointsSystem {
    static let table: [Int: Int] = [
        1: 25, 2: 18, 3: 15, 4: 12, 5: 10,
        6: 8, 7: 6, 8: 4, 9: 2, 10: 1
    ]
    static let fastestLapBonus = 1
    static let fastestLapMaxPosition = 10

    static func points(for position: Int, fastestLap: Bool) -> Int {
        let base = table[position] ?? 0
        let bonus = (fastestLap && position <= fastestLapMaxPosition) ? fastestLapBonus : 0
        return base + bonus
    }
}

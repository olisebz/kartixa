import Foundation

enum PointsCalculator {
    static func calculate(
        position: Int,
        fastestLap: Bool,
        isUnknownDriver: Bool,
        dnf: Bool,
        penalties: [RaceResultPenalty]
    ) -> Int {
        guard !isUnknownDriver, !dnf else { return 0 }
        let base = PointsSystem.points(for: position, fastestLap: fastestLap)
        let pointsPenalty = penalties
            .filter { $0.type == .points }
            .reduce(0) { $0 + $1.value }
        return base - pointsPenalty
    }
}

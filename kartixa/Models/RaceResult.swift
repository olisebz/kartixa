import Foundation

struct RaceResult: Codable, Identifiable, Hashable {
    let id: UUID
    var driverId: UUID
    var teamId: UUID?
    var position: Int
    var points: Int
    var lapTime: String?
    var fastestLap: Bool
    var dnf: Bool
    var penalties: [RaceResultPenalty]

    init(
        id: UUID = UUID(),
        driverId: UUID,
        teamId: UUID? = nil,
        position: Int,
        points: Int = 0,
        lapTime: String? = nil,
        fastestLap: Bool = false,
        dnf: Bool = false,
        penalties: [RaceResultPenalty] = []
    ) {
        self.id = id
        self.driverId = driverId
        self.teamId = teamId
        self.position = position
        self.points = points
        self.lapTime = lapTime
        self.fastestLap = fastestLap
        self.dnf = dnf
        self.penalties = penalties
    }
}

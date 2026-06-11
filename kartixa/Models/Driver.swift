import Foundation

struct Driver: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var number: Int
    var currentTeamId: UUID?

    init(
        id: UUID = UUID(),
        name: String,
        number: Int = 0,
        currentTeamId: UUID? = nil
    ) {
        self.id = id
        self.name = name
        self.number = number
        self.currentTeamId = currentTeamId
    }
}

extension Driver {
    /// Sentinel-UUID für den "Unknown Driver"-Platzhalter pro Season.
    /// Mehrere Race-Results können dieselbe ID referenzieren — sie zeigen alle auf den einen
    /// pro Season existierenden Unknown-Driver-Datensatz.
    static let unknownDriverSentinelID: UUID = UUID(uuidString: "00000000-0000-0000-0000-000000000001")!

    static let unknownDriverName = "Unknown Driver"

    static func unknownDriverSentinel() -> Driver {
        Driver(id: unknownDriverSentinelID, name: unknownDriverName, number: 0)
    }

    var isUnknownDriver: Bool {
        id == Driver.unknownDriverSentinelID
    }
}

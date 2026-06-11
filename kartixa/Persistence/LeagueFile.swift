import Foundation

struct LeagueFile: Codable {
    static let currentSchemaVersion = 1

    let schemaVersion: Int
    var league: League

    init(schemaVersion: Int = LeagueFile.currentSchemaVersion, league: League) {
        self.schemaVersion = schemaVersion
        self.league = league
    }
}

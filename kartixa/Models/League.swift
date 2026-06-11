import Foundation

struct League: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var description: String
    var tracks: [String]
    var teams: [Team]
    var seasons: [Season]
    let createdAt: Date
    var updatedAt: Date

    init(
        id: UUID = UUID(),
        name: String,
        description: String = "",
        tracks: [String] = [],
        teams: [Team] = [],
        seasons: [Season] = [],
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.tracks = tracks
        self.teams = teams
        self.seasons = seasons
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

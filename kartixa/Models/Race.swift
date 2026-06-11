import Foundation

struct Race: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var track: String
    var date: Date
    var results: [RaceResult]

    init(
        id: UUID = UUID(),
        name: String,
        track: String,
        date: Date,
        results: [RaceResult] = []
    ) {
        self.id = id
        self.name = name
        self.track = track
        self.date = date
        self.results = results
    }
}

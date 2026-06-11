import Foundation

enum PenaltyType: String, Codable, CaseIterable, Hashable {
    case seconds
    case grid
    case points
}

struct RaceResultPenalty: Codable, Identifiable, Hashable {
    let id: UUID
    var type: PenaltyType
    var value: Int
    var note: String?

    init(
        id: UUID = UUID(),
        type: PenaltyType,
        value: Int,
        note: String? = nil
    ) {
        self.id = id
        self.type = type
        self.value = value
        self.note = note
    }
}

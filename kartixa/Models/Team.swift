import Foundation

struct Team: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var isActive: Bool

    init(id: UUID = UUID(), name: String, isActive: Bool = true) {
        self.id = id
        self.name = name
        self.isActive = isActive
    }
}

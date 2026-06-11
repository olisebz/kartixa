import Foundation

struct Season: Codable, Identifiable, Hashable {
    let id: UUID
    var name: String
    var startDate: Date
    var endDate: Date?
    var isActive: Bool
    var drivers: [Driver]
    var races: [Race]

    init(
        id: UUID = UUID(),
        name: String,
        startDate: Date,
        endDate: Date? = nil,
        isActive: Bool = true,
        drivers: [Driver] = [],
        races: [Race] = []
    ) {
        self.id = id
        self.name = name
        self.startDate = startDate
        self.endDate = endDate
        self.isActive = isActive
        self.drivers = drivers
        self.races = races
    }
}

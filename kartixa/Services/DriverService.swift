import Foundation

enum DriverService {
    enum DriverError: Error, Equatable {
        case nameEmpty
        case nameAlreadyExists
        case invalidNumber
        case seasonNotFound
        case driverNotFound
        case driverHasRaceResults
    }

    static let validNumberRange: ClosedRange<Int> = 1...999

    static func addDriver(
        to league: League,
        in seasonID: UUID,
        name: String,
        number: Int,
        teamId: UUID?,
        now: Date = Date()
    ) throws -> League {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw DriverError.nameEmpty }
        guard validNumberRange.contains(number) else { throw DriverError.invalidNumber }

        var updated = league
        guard let seasonIndex = updated.seasons.firstIndex(where: { $0.id == seasonID }) else {
            throw DriverError.seasonNotFound
        }

        let lowered = trimmed.lowercased()
        if updated.seasons[seasonIndex].drivers.contains(where: { $0.name.lowercased() == lowered }) {
            throw DriverError.nameAlreadyExists
        }

        updated.seasons[seasonIndex].drivers.append(
            Driver(name: trimmed, number: number, currentTeamId: teamId)
        )
        updated.updatedAt = now
        return updated
    }

    static func updateDriver(
        _ driverID: UUID,
        in league: League,
        season seasonID: UUID,
        name: String,
        number: Int,
        teamId: UUID?,
        now: Date = Date()
    ) throws -> League {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw DriverError.nameEmpty }
        guard validNumberRange.contains(number) else { throw DriverError.invalidNumber }

        var updated = league
        guard let seasonIndex = updated.seasons.firstIndex(where: { $0.id == seasonID }) else {
            throw DriverError.seasonNotFound
        }
        guard let driverIndex = updated.seasons[seasonIndex].drivers.firstIndex(where: { $0.id == driverID }) else {
            throw DriverError.driverNotFound
        }

        let lowered = trimmed.lowercased()
        let hasDuplicate = updated.seasons[seasonIndex].drivers
            .contains { $0.id != driverID && $0.name.lowercased() == lowered }
        if hasDuplicate { throw DriverError.nameAlreadyExists }

        updated.seasons[seasonIndex].drivers[driverIndex].name = trimmed
        updated.seasons[seasonIndex].drivers[driverIndex].number = number
        updated.seasons[seasonIndex].drivers[driverIndex].currentTeamId = teamId
        updated.updatedAt = now
        return updated
    }

    static func deleteDriver(
        _ driverID: UUID,
        in league: League,
        season seasonID: UUID,
        now: Date = Date()
    ) throws -> League {
        var updated = league
        guard let seasonIndex = updated.seasons.firstIndex(where: { $0.id == seasonID }) else {
            throw DriverError.seasonNotFound
        }
        guard updated.seasons[seasonIndex].drivers.contains(where: { $0.id == driverID }) else {
            throw DriverError.driverNotFound
        }

        let hasResults = updated.seasons[seasonIndex].races
            .contains { race in race.results.contains { $0.driverId == driverID } }
        if hasResults { throw DriverError.driverHasRaceResults }

        updated.seasons[seasonIndex].drivers.removeAll { $0.id == driverID }
        updated.updatedAt = now
        return updated
    }
}

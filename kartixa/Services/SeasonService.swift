import Foundation

enum SeasonService {
    enum SeasonError: Error, Equatable {
        case lastSeasonCannotBeDeleted
        case seasonNotFound
    }

    static func addSeason(
        to league: League,
        name: String,
        startDate: Date,
        copyDriversFrom sourceSeasonID: UUID?,
        now: Date = Date()
    ) -> League {
        var updated = league

        var drivers: [Driver] = []
        if let id = sourceSeasonID,
           let source = updated.seasons.first(where: { $0.id == id }) {
            drivers = source.drivers.map {
                Driver(name: $0.name, number: $0.number, currentTeamId: $0.currentTeamId)
            }
        }

        for index in updated.seasons.indices {
            updated.seasons[index].isActive = false
        }

        let newSeason = Season(
            name: name,
            startDate: startDate,
            isActive: true,
            drivers: drivers
        )
        updated.seasons.append(newSeason)
        updated.updatedAt = now
        return updated
    }

    static func setActiveSeason(
        _ seasonID: UUID,
        in league: League,
        now: Date = Date()
    ) throws -> League {
        guard league.seasons.contains(where: { $0.id == seasonID }) else {
            throw SeasonError.seasonNotFound
        }
        var updated = league
        for index in updated.seasons.indices {
            updated.seasons[index].isActive = updated.seasons[index].id == seasonID
        }
        updated.updatedAt = now
        return updated
    }

    static func deleteSeason(
        _ seasonID: UUID,
        from league: League,
        now: Date = Date()
    ) throws -> League {
        guard league.seasons.count > 1 else {
            throw SeasonError.lastSeasonCannotBeDeleted
        }
        guard league.seasons.contains(where: { $0.id == seasonID }) else {
            throw SeasonError.seasonNotFound
        }

        var updated = league
        let wasActive = updated.seasons.first(where: { $0.id == seasonID })?.isActive ?? false
        updated.seasons.removeAll { $0.id == seasonID }
        if wasActive, let lastIndex = updated.seasons.indices.last {
            updated.seasons[lastIndex].isActive = true
        }
        updated.updatedAt = now
        return updated
    }
}

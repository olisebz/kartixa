import Foundation

struct DraftRaceResult: Identifiable, Equatable {
    let id: UUID
    var driverId: UUID?
    var teamId: UUID?
    var lapTime: String
    var fastestLap: Bool
    var dnf: Bool
    var penalties: [RaceResultPenalty]

    init(
        id: UUID = UUID(),
        driverId: UUID? = nil,
        teamId: UUID? = nil,
        lapTime: String = "",
        fastestLap: Bool = false,
        dnf: Bool = false,
        penalties: [RaceResultPenalty] = []
    ) {
        self.id = id
        self.driverId = driverId
        self.teamId = teamId
        self.lapTime = lapTime
        self.fastestLap = fastestLap
        self.dnf = dnf
        self.penalties = penalties
    }

    init(from result: RaceResult) {
        self.id = result.id
        self.driverId = result.driverId
        self.teamId = result.teamId
        self.lapTime = result.lapTime ?? ""
        self.fastestLap = result.fastestLap
        self.dnf = result.dnf
        self.penalties = result.penalties
    }
}

enum RaceService {
    enum RaceError: Error, Equatable {
        case nameEmpty
        case trackEmpty
        case noResults
        case unselectedDriver(rowIndex: Int)
        case multipleFastestLaps
        case duplicateDriver
        case seasonNotFound
        case raceNotFound
    }

    /// Validiert alle Form-Eingaben — wirft beim ersten Problem.
    static func validate(name: String, track: String, drafts: [DraftRaceResult]) throws {
        guard !name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw RaceError.nameEmpty
        }
        guard !track.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw RaceError.trackEmpty
        }
        guard !drafts.isEmpty else { throw RaceError.noResults }
        for (index, draft) in drafts.enumerated() {
            if draft.driverId == nil {
                throw RaceError.unselectedDriver(rowIndex: index)
            }
        }
        let fastestLapCount = drafts.filter { $0.fastestLap && !$0.dnf }.count
        if fastestLapCount > 1 { throw RaceError.multipleFastestLaps }

        // Real drivers (nicht Unknown-Sentinel) dürfen nur einmal pro Rennen erscheinen.
        let realDriverIDs = drafts
            .compactMap { $0.driverId }
            .filter { $0 != Driver.unknownDriverSentinelID }
        if Set(realDriverIDs).count != realDriverIDs.count {
            throw RaceError.duplicateDriver
        }
    }

    /// DNF-Einträge ans Ende sortieren, Reihenfolge innerhalb der Gruppen erhalten.
    static func normalize(_ drafts: [DraftRaceResult]) -> [DraftRaceResult] {
        let nonDNF = drafts.filter { !$0.dnf }
        let dnf = drafts.filter { $0.dnf }
        return nonDNF + dnf
    }

    /// Erzeugt ein vollständiges `Race` mit normalisierten Positionen und berechneten Punkten.
    static func buildRace(
        id: UUID? = nil,
        name: String,
        track: String,
        date: Date,
        drafts: [DraftRaceResult]
    ) throws -> Race {
        try validate(name: name, track: track, drafts: drafts)
        let normalized = normalize(drafts)

        var results: [RaceResult] = []
        for (index, draft) in normalized.enumerated() {
            let position = index + 1
            let isUnknown = draft.driverId == Driver.unknownDriverSentinelID
            let effectiveFastestLap = draft.fastestLap && !draft.dnf
            let points = PointsCalculator.calculate(
                position: position,
                fastestLap: effectiveFastestLap,
                isUnknownDriver: isUnknown,
                dnf: draft.dnf,
                penalties: draft.penalties
            )
            let trimmedLapTime = draft.lapTime.trimmingCharacters(in: .whitespacesAndNewlines)
            let result = RaceResult(
                id: draft.id,
                driverId: draft.driverId!,
                teamId: draft.teamId,
                position: position,
                points: points,
                lapTime: effectiveFastestLap && !trimmedLapTime.isEmpty ? trimmedLapTime : nil,
                fastestLap: effectiveFastestLap,
                dnf: draft.dnf,
                penalties: draft.penalties
            )
            results.append(result)
        }

        return Race(
            id: id ?? UUID(),
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            track: track.trimmingCharacters(in: .whitespacesAndNewlines),
            date: date,
            results: results
        )
    }

    static func addRace(
        to league: League,
        in seasonID: UUID,
        race: Race,
        now: Date = Date()
    ) throws -> League {
        var updated = league
        guard let seasonIndex = updated.seasons.firstIndex(where: { $0.id == seasonID }) else {
            throw RaceError.seasonNotFound
        }
        ensureUnknownDriverIfNeeded(in: &updated.seasons[seasonIndex], for: race.results)
        updated.seasons[seasonIndex].races.append(race)
        updated.updatedAt = now
        return updated
    }

    static func updateRace(
        _ race: Race,
        in league: League,
        season seasonID: UUID,
        now: Date = Date()
    ) throws -> League {
        var updated = league
        guard let seasonIndex = updated.seasons.firstIndex(where: { $0.id == seasonID }) else {
            throw RaceError.seasonNotFound
        }
        guard let raceIndex = updated.seasons[seasonIndex].races
            .firstIndex(where: { $0.id == race.id }) else {
            throw RaceError.raceNotFound
        }
        ensureUnknownDriverIfNeeded(in: &updated.seasons[seasonIndex], for: race.results)
        updated.seasons[seasonIndex].races[raceIndex] = race
        updated.updatedAt = now
        return updated
    }

    static func deleteRace(
        _ raceID: UUID,
        in league: League,
        season seasonID: UUID,
        now: Date = Date()
    ) throws -> League {
        var updated = league
        guard let seasonIndex = updated.seasons.firstIndex(where: { $0.id == seasonID }) else {
            throw RaceError.seasonNotFound
        }
        guard updated.seasons[seasonIndex].races.contains(where: { $0.id == raceID }) else {
            throw RaceError.raceNotFound
        }
        updated.seasons[seasonIndex].races.removeAll { $0.id == raceID }
        updated.updatedAt = now
        return updated
    }

    private static func ensureUnknownDriverIfNeeded(
        in season: inout Season,
        for results: [RaceResult]
    ) {
        let needsSentinel = results.contains { $0.driverId == Driver.unknownDriverSentinelID }
        if needsSentinel,
           !season.drivers.contains(where: { $0.id == Driver.unknownDriverSentinelID }) {
            season.drivers.append(Driver.unknownDriverSentinel())
        }
    }
}

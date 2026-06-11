import Foundation
import Testing
@testable import kartixa

struct RaceServiceTests {

    private func draft(
        driver: UUID? = UUID(),
        fastestLap: Bool = false,
        dnf: Bool = false,
        penalties: [RaceResultPenalty] = []
    ) -> DraftRaceResult {
        DraftRaceResult(
            driverId: driver,
            fastestLap: fastestLap,
            dnf: dnf,
            penalties: penalties
        )
    }

    private func makeLeague(
        tracks: [String] = ["Track A"],
        drivers: [Driver] = [],
        races: [Race] = []
    ) -> (League, UUID) {
        let season = Season(
            name: "Saison 2026",
            startDate: Date(),
            isActive: true,
            drivers: drivers,
            races: races
        )
        let league = League(name: "Test", tracks: tracks, seasons: [season])
        return (league, season.id)
    }

    // MARK: - validate

    @Test func validateThrowsOnEmptyName() {
        #expect(throws: RaceService.RaceError.nameEmpty) {
            try RaceService.validate(name: "  ", track: "Track A", drafts: [draft()])
        }
    }

    @Test func validateThrowsOnEmptyTrack() {
        #expect(throws: RaceService.RaceError.trackEmpty) {
            try RaceService.validate(name: "GP", track: "", drafts: [draft()])
        }
    }

    @Test func validateThrowsOnNoResults() {
        #expect(throws: RaceService.RaceError.noResults) {
            try RaceService.validate(name: "GP", track: "Track A", drafts: [])
        }
    }

    @Test func validateThrowsOnUnselectedDriver() {
        let drafts = [draft(driver: UUID()), draft(driver: nil)]
        #expect(throws: RaceService.RaceError.unselectedDriver(rowIndex: 1)) {
            try RaceService.validate(name: "GP", track: "Track A", drafts: drafts)
        }
    }

    @Test func validateThrowsOnMultipleFastestLaps() {
        let drafts = [
            draft(fastestLap: true),
            draft(fastestLap: true)
        ]
        #expect(throws: RaceService.RaceError.multipleFastestLaps) {
            try RaceService.validate(name: "GP", track: "Track A", drafts: drafts)
        }
    }

    @Test func validateThrowsOnDuplicateRealDriver() {
        let id = UUID()
        let drafts = [draft(driver: id), draft(driver: id)]
        #expect(throws: RaceService.RaceError.duplicateDriver) {
            try RaceService.validate(name: "GP", track: "Track A", drafts: drafts)
        }
    }

    @Test func validateAllowsDuplicateUnknownDriver() throws {
        let drafts = [
            draft(driver: Driver.unknownDriverSentinelID),
            draft(driver: Driver.unknownDriverSentinelID)
        ]
        try RaceService.validate(name: "GP", track: "Track A", drafts: drafts)
    }

    // MARK: - normalize

    @Test func normalizeMovesDNFsToEnd() {
        let d1 = draft(driver: UUID(), dnf: false)
        let d2 = draft(driver: UUID(), dnf: true)
        let d3 = draft(driver: UUID(), dnf: false)
        let normalized = RaceService.normalize([d1, d2, d3])

        #expect(normalized.map(\.id) == [d1.id, d3.id, d2.id])
    }

    @Test func normalizePreservesOrderWithinGroups() {
        let d1 = draft(driver: UUID())
        let d2 = draft(driver: UUID())
        let d3 = draft(driver: UUID(), dnf: true)
        let d4 = draft(driver: UUID(), dnf: true)
        let normalized = RaceService.normalize([d4, d1, d3, d2])

        // non-DNF: d1, d2; DNF: d4, d3
        #expect(normalized.map(\.id) == [d1.id, d2.id, d4.id, d3.id])
    }

    // MARK: - buildRace

    @Test func buildRaceAssignsPointsAndPositions() throws {
        let driverA = UUID()
        let driverB = UUID()
        let driverC = UUID()
        let drafts = [
            draft(driver: driverA),
            draft(driver: driverB),
            draft(driver: driverC, fastestLap: true)
        ]
        let race = try RaceService.buildRace(
            name: "GP",
            track: "Track A",
            date: Date(),
            drafts: drafts
        )

        #expect(race.results.count == 3)
        #expect(race.results[0].position == 1)
        #expect(race.results[0].points == 25)
        #expect(race.results[1].position == 2)
        #expect(race.results[1].points == 18)
        #expect(race.results[2].position == 3)
        #expect(race.results[2].points == 15 + 1) // FL bonus in top 10
        #expect(race.results[2].fastestLap == true)
    }

    @Test func buildRacePushesDNFsToEnd() throws {
        let driverA = UUID()
        let driverB = UUID()
        let drafts = [
            draft(driver: driverA, dnf: true),
            draft(driver: driverB)
        ]
        let race = try RaceService.buildRace(
            name: "GP",
            track: "Track A",
            date: Date(),
            drafts: drafts
        )

        #expect(race.results.map(\.driverId) == [driverB, driverA])
        #expect(race.results[0].position == 1)
        #expect(race.results[1].position == 2)
        #expect(race.results[1].dnf == true)
        #expect(race.results[1].points == 0)
    }

    @Test func buildRaceUnknownDriverScoresZero() throws {
        let drafts = [
            draft(driver: Driver.unknownDriverSentinelID),
            draft(driver: UUID())
        ]
        let race = try RaceService.buildRace(
            name: "GP",
            track: "Track A",
            date: Date(),
            drafts: drafts
        )

        #expect(race.results[0].points == 0)
        #expect(race.results[1].position == 2)
        #expect(race.results[1].points == 18)
    }

    @Test func buildRaceDropsLapTimeWhenNotFastestLap() throws {
        let drafts = [
            DraftRaceResult(driverId: UUID(), lapTime: "01:23.456", fastestLap: false)
        ]
        let race = try RaceService.buildRace(
            name: "GP", track: "Track A", date: Date(), drafts: drafts
        )

        #expect(race.results[0].lapTime == nil)
    }

    @Test func buildRaceKeepsLapTimeWhenFastestLap() throws {
        let drafts = [
            DraftRaceResult(driverId: UUID(), lapTime: "01:23.456", fastestLap: true)
        ]
        let race = try RaceService.buildRace(
            name: "GP", track: "Track A", date: Date(), drafts: drafts
        )

        #expect(race.results[0].lapTime == "01:23.456")
    }

    @Test func buildRacePropagatesValidationErrors() {
        #expect(throws: RaceService.RaceError.noResults) {
            try RaceService.buildRace(name: "GP", track: "Track A", date: Date(), drafts: [])
        }
    }

    @Test func buildRaceUsesProvidedID() throws {
        let id = UUID()
        let race = try RaceService.buildRace(
            id: id,
            name: "GP", track: "Track A", date: Date(),
            drafts: [draft(driver: UUID())]
        )
        #expect(race.id == id)
    }

    // MARK: - addRace

    @Test func addRaceAppendsToSeason() throws {
        let driver = Driver(name: "Alice", number: 7)
        let (league, seasonID) = makeLeague(drivers: [driver])
        let race = try RaceService.buildRace(
            name: "GP", track: "Track A", date: Date(),
            drafts: [draft(driver: driver.id)]
        )

        let updated = try RaceService.addRace(to: league, in: seasonID, race: race)

        #expect(updated.seasons[0].races.count == 1)
        #expect(updated.seasons[0].races[0].id == race.id)
    }

    @Test func addRaceAddsUnknownDriverWhenReferenced() throws {
        let driver = Driver(name: "Alice", number: 7)
        let (league, seasonID) = makeLeague(drivers: [driver])
        let race = try RaceService.buildRace(
            name: "GP", track: "Track A", date: Date(),
            drafts: [
                draft(driver: driver.id),
                draft(driver: Driver.unknownDriverSentinelID)
            ]
        )

        let updated = try RaceService.addRace(to: league, in: seasonID, race: race)

        #expect(updated.seasons[0].drivers.contains(where: { $0.isUnknownDriver }))
    }

    @Test func addRaceDoesNotAddUnknownDriverIfNotReferenced() throws {
        let driver = Driver(name: "Alice", number: 7)
        let (league, seasonID) = makeLeague(drivers: [driver])
        let race = try RaceService.buildRace(
            name: "GP", track: "Track A", date: Date(),
            drafts: [draft(driver: driver.id)]
        )

        let updated = try RaceService.addRace(to: league, in: seasonID, race: race)

        #expect(updated.seasons[0].drivers.contains(where: { $0.isUnknownDriver }) == false)
    }

    @Test func addRaceThrowsOnMissingSeason() throws {
        let driver = Driver(name: "Alice", number: 7)
        let (league, _) = makeLeague(drivers: [driver])
        let race = try RaceService.buildRace(
            name: "GP", track: "Track A", date: Date(),
            drafts: [draft(driver: driver.id)]
        )

        #expect(throws: RaceService.RaceError.seasonNotFound) {
            try RaceService.addRace(to: league, in: UUID(), race: race)
        }
    }

    // MARK: - updateRace

    @Test func updateRaceReplacesExisting() throws {
        let driver = Driver(name: "Alice", number: 7)
        let (league, seasonID) = makeLeague(drivers: [driver])
        var race = try RaceService.buildRace(
            name: "GP", track: "Track A", date: Date(),
            drafts: [draft(driver: driver.id)]
        )
        let leagueWithRace = try RaceService.addRace(to: league, in: seasonID, race: race)

        race.name = "Renamed GP"
        let updated = try RaceService.updateRace(race, in: leagueWithRace, season: seasonID)

        #expect(updated.seasons[0].races[0].name == "Renamed GP")
    }

    @Test func updateRaceThrowsOnMissingRace() throws {
        let driver = Driver(name: "Alice", number: 7)
        let (league, seasonID) = makeLeague(drivers: [driver])
        let race = try RaceService.buildRace(
            name: "Phantom", track: "Track A", date: Date(),
            drafts: [draft(driver: driver.id)]
        )

        #expect(throws: RaceService.RaceError.raceNotFound) {
            try RaceService.updateRace(race, in: league, season: seasonID)
        }
    }

    // MARK: - deleteRace

    @Test func deleteRaceRemovesIt() throws {
        let driver = Driver(name: "Alice", number: 7)
        let (league, seasonID) = makeLeague(drivers: [driver])
        let race = try RaceService.buildRace(
            name: "GP", track: "Track A", date: Date(),
            drafts: [draft(driver: driver.id)]
        )
        let withRace = try RaceService.addRace(to: league, in: seasonID, race: race)

        let updated = try RaceService.deleteRace(race.id, in: withRace, season: seasonID)

        #expect(updated.seasons[0].races.isEmpty)
    }

    @Test func deleteRaceThrowsOnMissingRace() {
        let (league, seasonID) = makeLeague()

        #expect(throws: RaceService.RaceError.raceNotFound) {
            try RaceService.deleteRace(UUID(), in: league, season: seasonID)
        }
    }
}

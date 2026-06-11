import Foundation
import Testing
@testable import kartixa

struct DriverServiceTests {

    private func makeLeague(drivers: [Driver] = [], races: [Race] = []) -> (League, UUID) {
        let season = Season(
            name: "Saison 2026",
            startDate: Date(),
            isActive: true,
            drivers: drivers,
            races: races
        )
        let league = League(
            name: "Test",
            tracks: ["Track A"],
            seasons: [season]
        )
        return (league, season.id)
    }

    // MARK: - addDriver

    @Test func addDriverAppendsToSeason() throws {
        let (league, seasonID) = makeLeague()

        let updated = try DriverService.addDriver(
            to: league, in: seasonID,
            name: "Alice", number: 7, teamId: nil
        )

        #expect(updated.seasons[0].drivers.count == 1)
        #expect(updated.seasons[0].drivers[0].name == "Alice")
        #expect(updated.seasons[0].drivers[0].number == 7)
    }

    @Test func addDriverTrimsName() throws {
        let (league, seasonID) = makeLeague()

        let updated = try DriverService.addDriver(
            to: league, in: seasonID,
            name: "  Alice  ", number: 7, teamId: nil
        )

        #expect(updated.seasons[0].drivers[0].name == "Alice")
    }

    @Test func addDriverThrowsOnEmptyName() {
        let (league, seasonID) = makeLeague()

        #expect(throws: DriverService.DriverError.nameEmpty) {
            try DriverService.addDriver(to: league, in: seasonID, name: "   ", number: 7, teamId: nil)
        }
    }

    @Test func addDriverThrowsOnDuplicateName() throws {
        let (league, seasonID) = makeLeague(drivers: [Driver(name: "Alice", number: 7)])

        #expect(throws: DriverService.DriverError.nameAlreadyExists) {
            try DriverService.addDriver(to: league, in: seasonID, name: "alice", number: 8, teamId: nil)
        }
    }

    @Test func addDriverThrowsOnInvalidNumber() {
        let (league, seasonID) = makeLeague()

        #expect(throws: DriverService.DriverError.invalidNumber) {
            try DriverService.addDriver(to: league, in: seasonID, name: "Alice", number: 0, teamId: nil)
        }
        #expect(throws: DriverService.DriverError.invalidNumber) {
            try DriverService.addDriver(to: league, in: seasonID, name: "Alice", number: 1000, teamId: nil)
        }
    }

    @Test func addDriverThrowsOnMissingSeason() {
        let (league, _) = makeLeague()

        #expect(throws: DriverService.DriverError.seasonNotFound) {
            try DriverService.addDriver(to: league, in: UUID(), name: "Alice", number: 7, teamId: nil)
        }
    }

    // MARK: - updateDriver

    @Test func updateDriverChangesFields() throws {
        let driver = Driver(name: "Alice", number: 7)
        let (league, seasonID) = makeLeague(drivers: [driver])
        let teamID = UUID()

        let updated = try DriverService.updateDriver(
            driver.id, in: league, season: seasonID,
            name: "Alicia", number: 8, teamId: teamID
        )

        let result = updated.seasons[0].drivers[0]
        #expect(result.name == "Alicia")
        #expect(result.number == 8)
        #expect(result.currentTeamId == teamID)
    }

    @Test func updateDriverAllowsKeepingSameName() throws {
        let driver = Driver(name: "Alice", number: 7)
        let (league, seasonID) = makeLeague(drivers: [driver, Driver(name: "Bob", number: 22)])

        // Renaming Alice → Alice should NOT trigger nameAlreadyExists
        let updated = try DriverService.updateDriver(
            driver.id, in: league, season: seasonID,
            name: "Alice", number: 8, teamId: nil
        )

        #expect(updated.seasons[0].drivers.first(where: { $0.id == driver.id })?.number == 8)
    }

    @Test func updateDriverThrowsOnDuplicateNameWithOther() {
        let alice = Driver(name: "Alice", number: 7)
        let bob = Driver(name: "Bob", number: 22)
        let (league, seasonID) = makeLeague(drivers: [alice, bob])

        #expect(throws: DriverService.DriverError.nameAlreadyExists) {
            try DriverService.updateDriver(
                bob.id, in: league, season: seasonID,
                name: "alice", number: 22, teamId: nil
            )
        }
    }

    @Test func updateDriverThrowsOnMissingDriver() {
        let (league, seasonID) = makeLeague()

        #expect(throws: DriverService.DriverError.driverNotFound) {
            try DriverService.updateDriver(
                UUID(), in: league, season: seasonID,
                name: "X", number: 1, teamId: nil
            )
        }
    }

    // MARK: - deleteDriver

    @Test func deleteDriverRemovesFromSeason() throws {
        let driver = Driver(name: "Alice", number: 7)
        let (league, seasonID) = makeLeague(drivers: [driver])

        let updated = try DriverService.deleteDriver(driver.id, in: league, season: seasonID)

        #expect(updated.seasons[0].drivers.isEmpty)
    }

    @Test func deleteDriverThrowsWhenDriverHasRaceResults() {
        let driver = Driver(name: "Alice", number: 7)
        let race = Race(
            name: "Race 1",
            track: "Track A",
            date: Date(),
            results: [RaceResult(driverId: driver.id, position: 1, points: 25)]
        )
        let (league, seasonID) = makeLeague(drivers: [driver], races: [race])

        #expect(throws: DriverService.DriverError.driverHasRaceResults) {
            try DriverService.deleteDriver(driver.id, in: league, season: seasonID)
        }
    }

    @Test func deleteDriverThrowsOnMissingDriver() {
        let (league, seasonID) = makeLeague()

        #expect(throws: DriverService.DriverError.driverNotFound) {
            try DriverService.deleteDriver(UUID(), in: league, season: seasonID)
        }
    }
}

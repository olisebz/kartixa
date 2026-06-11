import Foundation
import Testing
@testable import kartixa

struct DriverAggregateServiceTests {

    private func makeLeague(
        name: String,
        drivers: [Driver],
        races: [Race]
    ) -> League {
        League(
            name: name,
            tracks: ["Track A"],
            seasons: [
                Season(
                    name: "Saison 2026",
                    startDate: Date(timeIntervalSince1970: 1000),
                    isActive: true,
                    drivers: drivers,
                    races: races
                )
            ]
        )
    }

    @Test func aggregateEmptyWhenNoLeagues() {
        let result = DriverAggregateService.aggregate(across: [])
        #expect(result.isEmpty)
    }

    @Test func aggregateGroupsByNameCaseInsensitive() {
        let alice1 = Driver(name: "Alice")
        let alice2 = Driver(name: "ALICE")
        let race1 = Race(name: "R1", track: "T", date: Date(), results: [
            RaceResult(driverId: alice1.id, position: 1, points: 25)
        ])
        let race2 = Race(name: "R2", track: "T", date: Date(), results: [
            RaceResult(driverId: alice2.id, position: 1, points: 25)
        ])
        let league1 = makeLeague(name: "Liga A", drivers: [alice1], races: [race1])
        let league2 = makeLeague(name: "Liga B", drivers: [alice2], races: [race2])

        let result = DriverAggregateService.aggregate(across: [league1, league2])

        #expect(result.count == 1)
        #expect(result[0].totalPoints == 50)
        #expect(result[0].wins == 2)
        #expect(result[0].leagueNames == ["Liga A", "Liga B"])
    }

    @Test func aggregateSortedByPointsDescending() {
        let alice = Driver(name: "Alice")
        let bob = Driver(name: "Bob")
        let race = Race(name: "R1", track: "T", date: Date(), results: [
            RaceResult(driverId: alice.id, position: 2, points: 18),
            RaceResult(driverId: bob.id, position: 1, points: 25)
        ])
        let league = makeLeague(name: "Liga", drivers: [alice, bob], races: [race])

        let result = DriverAggregateService.aggregate(across: [league])

        #expect(result.map(\.displayName) == ["Bob", "Alice"])
    }

    @Test func aggregateExcludesUnknownDriverSentinel() {
        let alice = Driver(name: "Alice")
        let unknown = Driver.unknownDriverSentinel()
        let race = Race(name: "R1", track: "T", date: Date(), results: [
            RaceResult(driverId: unknown.id, position: 1, points: 0),
            RaceResult(driverId: alice.id, position: 2, points: 18)
        ])
        let league = makeLeague(name: "Liga", drivers: [alice, unknown], races: [race])

        let result = DriverAggregateService.aggregate(across: [league])

        #expect(result.count == 1)
        #expect(result[0].displayName == "Alice")
    }

    @Test func aggregateSumsFastestLapsAcrossLeagues() {
        let alice1 = Driver(name: "Alice")
        let alice2 = Driver(name: "Alice")
        let r1 = Race(name: "R1", track: "T", date: Date(timeIntervalSince1970: 1), results: [
            RaceResult(driverId: alice1.id, position: 1, points: 26, fastestLap: true)
        ])
        let r2 = Race(name: "R2", track: "T", date: Date(timeIntervalSince1970: 2), results: [
            RaceResult(driverId: alice2.id, position: 3, points: 16, fastestLap: true)
        ])
        let league1 = makeLeague(name: "A", drivers: [alice1], races: [r1])
        let league2 = makeLeague(name: "B", drivers: [alice2], races: [r2])

        let result = DriverAggregateService.aggregate(across: [league1, league2])

        #expect(result.first?.fastestLaps == 2)
    }

    @Test func aggregateCarriesNumberFromFirstSighting() {
        let alice = Driver(name: "Alice", number: 7)
        let race = Race(name: "R1", track: "T", date: Date(), results: [
            RaceResult(driverId: alice.id, position: 1, points: 25)
        ])
        let league = makeLeague(name: "Liga", drivers: [alice], races: [race])

        let result = DriverAggregateService.aggregate(across: [league])

        #expect(result.first?.representativeNumber == 7)
    }

    @Test func aggregateIgnoresWhitespaceOnlyNames() {
        let alice = Driver(name: "Alice")
        let blank = Driver(name: "   ")
        let race = Race(name: "R1", track: "T", date: Date(), results: [
            RaceResult(driverId: alice.id, position: 1, points: 25),
            RaceResult(driverId: blank.id, position: 2, points: 18)
        ])
        let league = makeLeague(name: "Liga", drivers: [alice, blank], races: [race])

        let result = DriverAggregateService.aggregate(across: [league])

        // blank-name driver should be skipped
        #expect(result.allSatisfy { !$0.id.isEmpty })
    }
}

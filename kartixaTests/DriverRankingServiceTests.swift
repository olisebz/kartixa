import Foundation
import Testing
@testable import kartixa

struct DriverRankingServiceTests {

    private func makeSeason(
        drivers: [Driver],
        races: [Race] = []
    ) -> Season {
        Season(
            name: "Saison 2026",
            startDate: Date(timeIntervalSince1970: 1000),
            isActive: true,
            drivers: drivers,
            races: races
        )
    }

    private func makeRace(
        name: String = "Race",
        date: Date = Date(timeIntervalSince1970: 1000),
        results: [RaceResult]
    ) -> Race {
        Race(name: name, track: "Track A", date: date, results: results)
    }

    // MARK: - stats

    @Test func statsForDriverWithNoRacesAreZero() {
        let driver = Driver(name: "Alice", number: 7)
        let season = makeSeason(drivers: [driver])

        let stats = DriverRankingService.stats(for: driver.id, in: season)

        #expect(stats == DriverStats(totalPoints: 0, wins: 0, racesStarted: 0, fastestLaps: 0))
    }

    @Test func statsAggregatesPointsAcrossRaces() {
        let driver = Driver(name: "Alice", number: 7)
        let race1 = makeRace(results: [RaceResult(driverId: driver.id, position: 1, points: 25)])
        let race2 = makeRace(results: [RaceResult(driverId: driver.id, position: 3, points: 15)])
        let season = makeSeason(drivers: [driver], races: [race1, race2])

        let stats = DriverRankingService.stats(for: driver.id, in: season)

        #expect(stats.totalPoints == 40)
        #expect(stats.racesStarted == 2)
    }

    @Test func statsCountsWinsOnlyForPositionOneNotDNF() {
        let driver = Driver(name: "Alice", number: 7)
        let win = makeRace(results: [RaceResult(driverId: driver.id, position: 1, points: 25)])
        let dnfFirst = makeRace(results: [RaceResult(driverId: driver.id, position: 1, points: 0, dnf: true)])
        let second = makeRace(results: [RaceResult(driverId: driver.id, position: 2, points: 18)])
        let season = makeSeason(drivers: [driver], races: [win, dnfFirst, second])

        let stats = DriverRankingService.stats(for: driver.id, in: season)

        #expect(stats.wins == 1)
        #expect(stats.racesStarted == 3)
    }

    @Test func statsCountsFastestLaps() {
        let driver = Driver(name: "Alice", number: 7)
        let r1 = makeRace(results: [RaceResult(driverId: driver.id, position: 1, points: 26, fastestLap: true)])
        let r2 = makeRace(results: [RaceResult(driverId: driver.id, position: 5, points: 11, fastestLap: true)])
        let r3 = makeRace(results: [RaceResult(driverId: driver.id, position: 2, points: 18)])
        let season = makeSeason(drivers: [driver], races: [r1, r2, r3])

        let stats = DriverRankingService.stats(for: driver.id, in: season)

        #expect(stats.fastestLaps == 2)
    }

    @Test func statsAvgAndWinRate() {
        let driver = Driver(name: "Alice", number: 7)
        let r1 = makeRace(results: [RaceResult(driverId: driver.id, position: 1, points: 25)])
        let r2 = makeRace(results: [RaceResult(driverId: driver.id, position: 1, points: 25)])
        let r3 = makeRace(results: [RaceResult(driverId: driver.id, position: 10, points: 1)])
        let r4 = makeRace(results: [RaceResult(driverId: driver.id, position: 10, points: 1)])
        let season = makeSeason(drivers: [driver], races: [r1, r2, r3, r4])

        let stats = DriverRankingService.stats(for: driver.id, in: season)

        #expect(stats.totalPoints == 52)
        #expect(stats.wins == 2)
        #expect(stats.racesStarted == 4)
        #expect(stats.winRate == 0.5)
        #expect(stats.avgPointsPerRace == 13.0)
    }

    // MARK: - rankings

    @Test func rankingsSortedByPointsDescending() {
        let alice = Driver(name: "Alice", number: 7)
        let bob = Driver(name: "Bob", number: 22)
        let carl = Driver(name: "Carl", number: 3)
        let race = makeRace(results: [
            RaceResult(driverId: alice.id, position: 2, points: 18),
            RaceResult(driverId: bob.id, position: 1, points: 25),
            RaceResult(driverId: carl.id, position: 3, points: 15)
        ])
        let season = makeSeason(drivers: [alice, bob, carl], races: [race])

        let rankings = DriverRankingService.rankings(in: season)

        #expect(rankings.map(\.driver.name) == ["Bob", "Alice", "Carl"])
        #expect(rankings.map(\.rank) == [1, 2, 3])
    }

    @Test func rankingsTiebreakWinsThenName() {
        let alice = Driver(name: "Alice")
        let bob = Driver(name: "Bob")
        let carl = Driver(name: "Carl")
        // All three have same points, Bob has 1 win, Alice has 0, Carl has 0 → Bob first.
        // Alice vs Carl: alphabetical → Alice second.
        let race1 = makeRace(results: [
            RaceResult(driverId: alice.id, position: 5, points: 10),
            RaceResult(driverId: bob.id, position: 1, points: 10),
            RaceResult(driverId: carl.id, position: 5, points: 10)
        ])
        let season = makeSeason(drivers: [alice, bob, carl], races: [race1])

        let rankings = DriverRankingService.rankings(in: season)

        #expect(rankings.map(\.driver.name) == ["Bob", "Alice", "Carl"])
    }

    // MARK: - penaltyHistory

    @Test func penaltyHistoryReturnsAllForDriverSortedNewestFirst() {
        let driver = Driver(name: "Alice")
        let oldPenalty = RaceResultPenalty(type: .seconds, value: 5, note: "Track limits")
        let newPenalty = RaceResultPenalty(type: .points, value: 3)

        let oldRace = makeRace(
            name: "Old",
            date: Date(timeIntervalSince1970: 1_000_000),
            results: [RaceResult(driverId: driver.id, position: 5, points: 10, penalties: [oldPenalty])]
        )
        let newRace = makeRace(
            name: "New",
            date: Date(timeIntervalSince1970: 2_000_000),
            results: [RaceResult(driverId: driver.id, position: 4, points: 9, penalties: [newPenalty])]
        )
        let season = makeSeason(drivers: [driver], races: [oldRace, newRace])

        let history = DriverRankingService.penaltyHistory(for: driver.id, in: season)

        #expect(history.count == 2)
        #expect(history[0].raceName == "New")
        #expect(history[1].raceName == "Old")
    }

    @Test func penaltyHistoryEmptyWhenNoPenalties() {
        let driver = Driver(name: "Alice")
        let race = makeRace(results: [RaceResult(driverId: driver.id, position: 1, points: 25)])
        let season = makeSeason(drivers: [driver], races: [race])

        let history = DriverRankingService.penaltyHistory(for: driver.id, in: season)

        #expect(history.isEmpty)
    }
}

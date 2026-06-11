import Foundation
import Testing
@testable import kartixa

struct StatisticsServiceTests {

    private func makeSeason(drivers: [Driver], races: [Race]) -> Season {
        Season(
            name: "Saison 2026",
            startDate: Date(timeIntervalSince1970: 1000),
            isActive: true,
            drivers: drivers,
            races: races
        )
    }

    private func makeRace(
        name: String,
        date: Date,
        results: [RaceResult]
    ) -> Race {
        Race(name: name, track: "Track A", date: date, results: results)
    }

    @Test func cumulativePointsTrendStartsAtZero() {
        let alice = Driver(name: "Alice")
        let race = makeRace(
            name: "R1",
            date: Date(timeIntervalSince1970: 2000),
            results: [RaceResult(driverId: alice.id, position: 1, points: 25)]
        )
        let season = makeSeason(drivers: [alice], races: [race])

        let trend = StatisticsService.cumulativePointsTrend(in: season)
        let aliceTrend = trend.filter { $0.driverID == alice.id }.sorted(by: { $0.raceIndex < $1.raceIndex })

        #expect(aliceTrend.first?.raceIndex == 0)
        #expect(aliceTrend.first?.cumulativePoints == 0)
        #expect(aliceTrend.last?.cumulativePoints == 25)
    }

    @Test func cumulativePointsTrendAccumulatesAcrossRaces() {
        let alice = Driver(name: "Alice")
        let r1 = makeRace(
            name: "R1",
            date: Date(timeIntervalSince1970: 2000),
            results: [RaceResult(driverId: alice.id, position: 1, points: 25)]
        )
        let r2 = makeRace(
            name: "R2",
            date: Date(timeIntervalSince1970: 3000),
            results: [RaceResult(driverId: alice.id, position: 3, points: 15)]
        )
        let season = makeSeason(drivers: [alice], races: [r1, r2])

        let trend = StatisticsService.cumulativePointsTrend(in: season)
        let aliceTrend = trend.filter { $0.driverID == alice.id }
            .sorted(by: { $0.raceIndex < $1.raceIndex })

        #expect(aliceTrend.map(\.cumulativePoints) == [0, 25, 40])
    }

    @Test func cumulativePointsTrendIsChronological() {
        let alice = Driver(name: "Alice")
        let early = makeRace(
            name: "Early",
            date: Date(timeIntervalSince1970: 1000),
            results: [RaceResult(driverId: alice.id, position: 1, points: 25)]
        )
        let late = makeRace(
            name: "Late",
            date: Date(timeIntervalSince1970: 5000),
            results: [RaceResult(driverId: alice.id, position: 5, points: 10)]
        )
        // Inserted out of chronological order in season
        let season = makeSeason(drivers: [alice], races: [late, early])

        let trend = StatisticsService.cumulativePointsTrend(in: season)
        let aliceTrend = trend.filter { $0.driverID == alice.id }
            .sorted(by: { $0.raceIndex < $1.raceIndex })

        // Race 1 = Early (25), Race 2 = Late (35)
        #expect(aliceTrend.map(\.raceName) == ["Start", "Early", "Late"])
        #expect(aliceTrend.map(\.cumulativePoints) == [0, 25, 35])
    }

    @Test func cumulativePointsTrendLimitsToTopN() {
        let drivers = (1...10).map { Driver(name: "D\($0)", number: $0) }
        let race = makeRace(
            name: "R1",
            date: Date(timeIntervalSince1970: 2000),
            results: drivers.enumerated().map { idx, driver in
                RaceResult(driverId: driver.id, position: idx + 1, points: 25 - idx * 2)
            }
        )
        let season = makeSeason(drivers: drivers, races: [race])

        let trend = StatisticsService.cumulativePointsTrend(in: season, topN: 3)
        let uniqueDrivers = Set(trend.map(\.driverID))

        #expect(uniqueDrivers.count == 3)
    }

    @Test func cumulativePointsTrendEmptyForNoRaces() {
        let alice = Driver(name: "Alice")
        let season = makeSeason(drivers: [alice], races: [])

        let trend = StatisticsService.cumulativePointsTrend(in: season)
        #expect(trend.isEmpty)
    }

    @Test func winsDistributionExcludesNonWinners() {
        let alice = Driver(name: "Alice")
        let bob = Driver(name: "Bob")
        let race = makeRace(
            name: "R1",
            date: Date(),
            results: [
                RaceResult(driverId: alice.id, position: 1, points: 25),
                RaceResult(driverId: bob.id, position: 2, points: 18)
            ]
        )
        let season = makeSeason(drivers: [alice, bob], races: [race])

        let wins = StatisticsService.winsDistribution(in: season)
        #expect(wins.count == 1)
        #expect(wins.first?.driverName == "Alice")
        #expect(wins.first?.wins == 1)
    }

    @Test func fastestLapsCountSortedDescending() {
        let alice = Driver(name: "Alice")
        let bob = Driver(name: "Bob")
        let r1 = makeRace(name: "R1", date: Date(timeIntervalSince1970: 1000), results: [
            RaceResult(driverId: alice.id, position: 1, points: 26, fastestLap: true)
        ])
        let r2 = makeRace(name: "R2", date: Date(timeIntervalSince1970: 2000), results: [
            RaceResult(driverId: bob.id, position: 1, points: 26, fastestLap: true)
        ])
        let r3 = makeRace(name: "R3", date: Date(timeIntervalSince1970: 3000), results: [
            RaceResult(driverId: bob.id, position: 1, points: 26, fastestLap: true)
        ])
        let season = makeSeason(drivers: [alice, bob], races: [r1, r2, r3])

        let laps = StatisticsService.fastestLapsCount(in: season)

        #expect(laps.first?.driverName == "Bob")
        #expect(laps.first?.count == 2)
        #expect(laps.last?.driverName == "Alice")
    }

    @Test func overviewSumsAcrossRaces() {
        let alice = Driver(name: "Alice")
        let bob = Driver(name: "Bob")
        let r1 = makeRace(name: "R1", date: Date(), results: [
            RaceResult(driverId: alice.id, position: 1, points: 25),
            RaceResult(driverId: bob.id, position: 2, points: 18)
        ])
        let r2 = makeRace(name: "R2", date: Date(), results: [
            RaceResult(driverId: alice.id, position: 3, points: 15)
        ])
        let season = makeSeason(drivers: [alice, bob], races: [r1, r2])

        let overview = StatisticsService.overview(of: season)

        #expect(overview.totalRaces == 2)
        #expect(overview.totalDrivers == 2)
        #expect(overview.totalEntries == 3)
        #expect(overview.totalPoints == 25 + 18 + 15)
    }

    @Test func overviewExcludesUnknownDriverFromDriverCount() {
        let alice = Driver(name: "Alice")
        let unknown = Driver.unknownDriverSentinel()
        let season = makeSeason(drivers: [alice, unknown], races: [])

        let overview = StatisticsService.overview(of: season)
        #expect(overview.totalDrivers == 1)
    }
}

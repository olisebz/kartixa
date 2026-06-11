import Foundation
import Testing
@testable import kartixa

struct TeamRankingServiceTests {

    private func makeSeason(races: [Race] = []) -> Season {
        Season(
            name: "Saison 2026",
            startDate: Date(timeIntervalSince1970: 1000),
            isActive: true,
            drivers: [],
            races: races
        )
    }

    private func makeRace(
        results: [RaceResult],
        date: Date = Date(timeIntervalSince1970: 1000)
    ) -> Race {
        Race(name: "Race", track: "Track A", date: date, results: results)
    }

    @Test func standingsEmptyForNoTeams() {
        let season = makeSeason()
        let standings = TeamRankingService.standings(in: season, teams: [])

        #expect(standings.isEmpty)
    }

    @Test func standingsZeroForTeamsWithoutRaces() {
        let team = Team(name: "Red")
        let season = makeSeason()

        let standings = TeamRankingService.standings(in: season, teams: [team])

        #expect(standings.count == 1)
        #expect(standings[0].totalPoints == 0)
        #expect(standings[0].wins == 0)
        #expect(standings[0].raceEntries == 0)
    }

    @Test func standingsAggregatesPointsAcrossRaces() {
        let red = Team(name: "Red")
        let blue = Team(name: "Blue")
        let race1 = makeRace(results: [
            RaceResult(driverId: UUID(), teamId: red.id, position: 1, points: 25),
            RaceResult(driverId: UUID(), teamId: blue.id, position: 2, points: 18)
        ])
        let race2 = makeRace(results: [
            RaceResult(driverId: UUID(), teamId: red.id, position: 3, points: 15),
            RaceResult(driverId: UUID(), teamId: blue.id, position: 4, points: 12)
        ])
        let season = makeSeason(races: [race1, race2])

        let standings = TeamRankingService.standings(in: season, teams: [red, blue])

        let redStanding = standings.first(where: { $0.team.id == red.id })
        let blueStanding = standings.first(where: { $0.team.id == blue.id })
        #expect(redStanding?.totalPoints == 40)
        #expect(blueStanding?.totalPoints == 30)
    }

    @Test func standingsCountsWinsOnlyForPositionOneNonDNF() {
        let team = Team(name: "Red")
        let race1 = makeRace(results: [
            RaceResult(driverId: UUID(), teamId: team.id, position: 1, points: 25)
        ])
        let race2 = makeRace(results: [
            RaceResult(driverId: UUID(), teamId: team.id, position: 1, points: 0, dnf: true)
        ])
        let race3 = makeRace(results: [
            RaceResult(driverId: UUID(), teamId: team.id, position: 2, points: 18)
        ])
        let season = makeSeason(races: [race1, race2, race3])

        let standings = TeamRankingService.standings(in: season, teams: [team])

        #expect(standings[0].wins == 1)
        #expect(standings[0].raceEntries == 3)
    }

    @Test func standingsSortedByPointsDescending() {
        let red = Team(name: "Red")
        let blue = Team(name: "Blue")
        let green = Team(name: "Green")
        let race = makeRace(results: [
            RaceResult(driverId: UUID(), teamId: blue.id, position: 1, points: 25),
            RaceResult(driverId: UUID(), teamId: red.id, position: 2, points: 18),
            RaceResult(driverId: UUID(), teamId: green.id, position: 3, points: 15)
        ])
        let season = makeSeason(races: [race])

        let standings = TeamRankingService.standings(in: season, teams: [red, blue, green])

        #expect(standings.map(\.team.name) == ["Blue", "Red", "Green"])
        #expect(standings.map(\.rank) == [1, 2, 3])
    }

    @Test func standingsTiebreakWinsThenName() {
        let red = Team(name: "Red")
        let blue = Team(name: "Blue")
        let green = Team(name: "Green")
        // Same points, Blue has 1 win, Red has 0, Green has 0 → Blue first.
        // Red vs Green: alphabetical → Green wins? No, "Green" > "Red"? No, "G" < "R" → Green second.
        // Wait: localized compare, "Green" vs "Red" → Green first.
        let race = makeRace(results: [
            RaceResult(driverId: UUID(), teamId: red.id, position: 5, points: 10),
            RaceResult(driverId: UUID(), teamId: blue.id, position: 1, points: 10),
            RaceResult(driverId: UUID(), teamId: green.id, position: 5, points: 10)
        ])
        let season = makeSeason(races: [race])

        let standings = TeamRankingService.standings(in: season, teams: [red, blue, green])

        #expect(standings.map(\.team.name) == ["Blue", "Green", "Red"])
    }

    @Test func standingsIgnoresResultsWithoutTeam() {
        let team = Team(name: "Red")
        let race = makeRace(results: [
            RaceResult(driverId: UUID(), teamId: nil, position: 1, points: 25),
            RaceResult(driverId: UUID(), teamId: team.id, position: 2, points: 18)
        ])
        let season = makeSeason(races: [race])

        let standings = TeamRankingService.standings(in: season, teams: [team])

        #expect(standings[0].totalPoints == 18)
        #expect(standings[0].raceEntries == 1)
    }

    @Test func standingsCountsRaceEntriesIncludingDNF() {
        let team = Team(name: "Red")
        let race = makeRace(results: [
            RaceResult(driverId: UUID(), teamId: team.id, position: 1, points: 25),
            RaceResult(driverId: UUID(), teamId: team.id, position: 2, points: 0, dnf: true)
        ])
        let season = makeSeason(races: [race])

        let standings = TeamRankingService.standings(in: season, teams: [team])

        #expect(standings[0].raceEntries == 2)
    }
}

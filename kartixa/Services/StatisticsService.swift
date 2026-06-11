import Foundation

struct CumulativePointsPoint: Identifiable, Hashable {
    let id: UUID
    let driverID: UUID
    let driverName: String
    let raceIndex: Int
    let raceName: String
    let cumulativePoints: Int

    init(driverID: UUID, driverName: String, raceIndex: Int, raceName: String, cumulativePoints: Int) {
        self.id = UUID()
        self.driverID = driverID
        self.driverName = driverName
        self.raceIndex = raceIndex
        self.raceName = raceName
        self.cumulativePoints = cumulativePoints
    }
}

struct WinsSlice: Identifiable, Hashable {
    let id: UUID
    let driverName: String
    let wins: Int

    init(driverName: String, wins: Int) {
        self.id = UUID()
        self.driverName = driverName
        self.wins = wins
    }
}

struct FastestLapsRow: Identifiable, Hashable {
    let id: UUID
    let driverName: String
    let count: Int

    init(driverName: String, count: Int) {
        self.id = UUID()
        self.driverName = driverName
        self.count = count
    }
}

struct TeamPointsRow: Identifiable, Hashable {
    let id: UUID
    let teamName: String
    let totalPoints: Int
    let wins: Int

    init(teamName: String, totalPoints: Int, wins: Int) {
        self.id = UUID()
        self.teamName = teamName
        self.totalPoints = totalPoints
        self.wins = wins
    }
}

struct SeasonOverview: Equatable {
    let totalRaces: Int
    let totalDrivers: Int
    let totalPoints: Int
    let totalEntries: Int
}

enum StatisticsService {

    static func chronologicalRaces(in season: Season) -> [Race] {
        season.races.sorted(by: { $0.date < $1.date })
    }

    /// Kumulative Punkte je Fahrer über alle Rennen der Saison (chronologisch).
    /// Liefert Datenpunkte für ein Linien-Chart, eingeschränkt auf die `topN` Fahrer der
    /// aktuellen Rangliste. Drivers ohne Rennen bekommen keine Punkte.
    static func cumulativePointsTrend(in season: Season, topN: Int = 5) -> [CumulativePointsPoint] {
        let races = chronologicalRaces(in: season)
        guard !races.isEmpty else { return [] }

        let rankings = DriverRankingService.rankings(in: season)
            .filter { !$0.driver.isUnknownDriver }
        let topDrivers = Array(rankings.prefix(topN))

        var points: [CumulativePointsPoint] = []

        // Startpunkt (Race 0 mit 0 Punkten) für sauberen Linien-Start
        for ranking in topDrivers {
            points.append(CumulativePointsPoint(
                driverID: ranking.driver.id,
                driverName: ranking.driver.name,
                raceIndex: 0,
                raceName: "Start",
                cumulativePoints: 0
            ))
        }

        for ranking in topDrivers {
            var cumulative = 0
            for (idx, race) in races.enumerated() {
                let raceResult = race.results.first(where: { $0.driverId == ranking.driver.id })
                cumulative += raceResult?.points ?? 0
                points.append(CumulativePointsPoint(
                    driverID: ranking.driver.id,
                    driverName: ranking.driver.name,
                    raceIndex: idx + 1,
                    raceName: race.name,
                    cumulativePoints: cumulative
                ))
            }
        }
        return points
    }

    static func winsDistribution(in season: Season) -> [WinsSlice] {
        let rankings = DriverRankingService.rankings(in: season)
        return rankings
            .filter { $0.stats.wins > 0 && !$0.driver.isUnknownDriver }
            .map { WinsSlice(driverName: $0.driver.name, wins: $0.stats.wins) }
    }

    static func fastestLapsCount(in season: Season) -> [FastestLapsRow] {
        let rankings = DriverRankingService.rankings(in: season)
        return rankings
            .filter { $0.stats.fastestLaps > 0 && !$0.driver.isUnknownDriver }
            .map { FastestLapsRow(driverName: $0.driver.name, count: $0.stats.fastestLaps) }
            .sorted(by: { $0.count > $1.count })
    }

    static func teamPoints(in season: Season, teams: [Team]) -> [TeamPointsRow] {
        let standings = TeamRankingService.standings(in: season, teams: teams)
        return standings
            .filter { $0.totalPoints > 0 || $0.raceEntries > 0 }
            .map { TeamPointsRow(teamName: $0.team.name, totalPoints: $0.totalPoints, wins: $0.wins) }
    }

    static func overview(of season: Season) -> SeasonOverview {
        let realDrivers = season.drivers.filter { !$0.isUnknownDriver }.count
        let totalEntries = season.races.reduce(0) { $0 + $1.results.count }
        let totalPoints = season.races.reduce(0) { acc, race in
            acc + race.results.reduce(0) { $0 + $1.points }
        }
        return SeasonOverview(
            totalRaces: season.races.count,
            totalDrivers: realDrivers,
            totalPoints: totalPoints,
            totalEntries: totalEntries
        )
    }
}

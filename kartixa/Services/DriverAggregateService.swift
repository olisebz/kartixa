import Foundation

struct CrossLeagueDriverStats: Identifiable, Equatable {
    let id: String           // normalisierter Name (case-insensitive Key)
    let displayName: String  // erstbekannte Variante des Namens
    let totalPoints: Int
    let wins: Int
    let racesStarted: Int
    let fastestLaps: Int
    let leagueNames: [String]
    let representativeNumber: Int?
}

enum DriverAggregateService {
    /// Aggregiert Fahrer-Statistiken über alle Saisons aller Ligen.
    /// Group-Key ist der case-insensitive Driver-Name (gleicher Name = gleiche Person über Ligen hinweg).
    static func aggregate(across leagues: [League]) -> [CrossLeagueDriverStats] {
        struct Acc {
            var displayName: String
            var points: Int = 0
            var wins: Int = 0
            var races: Int = 0
            var fastestLaps: Int = 0
            var leagues: Set<String> = []
            var number: Int?
        }
        var byKey: [String: Acc] = [:]

        for league in leagues {
            for season in league.seasons {
                let rankings = DriverRankingService.rankings(in: season)
                for ranking in rankings where !ranking.driver.isUnknownDriver {
                    let key = ranking.driver.name
                        .trimmingCharacters(in: .whitespacesAndNewlines)
                        .lowercased()
                    guard !key.isEmpty else { continue }
                    var entry = byKey[key] ?? Acc(displayName: ranking.driver.name)
                    entry.points += ranking.stats.totalPoints
                    entry.wins += ranking.stats.wins
                    entry.races += ranking.stats.racesStarted
                    entry.fastestLaps += ranking.stats.fastestLaps
                    entry.leagues.insert(league.name)
                    if entry.number == nil, ranking.driver.number > 0 {
                        entry.number = ranking.driver.number
                    }
                    byKey[key] = entry
                }
            }
        }

        let aggregated = byKey.map { key, entry in
            CrossLeagueDriverStats(
                id: key,
                displayName: entry.displayName,
                totalPoints: entry.points,
                wins: entry.wins,
                racesStarted: entry.races,
                fastestLaps: entry.fastestLaps,
                leagueNames: Array(entry.leagues).sorted(),
                representativeNumber: entry.number
            )
        }
        return aggregated.sorted { lhs, rhs in
            if lhs.totalPoints != rhs.totalPoints { return lhs.totalPoints > rhs.totalPoints }
            if lhs.wins != rhs.wins { return lhs.wins > rhs.wins }
            return lhs.displayName.localizedCaseInsensitiveCompare(rhs.displayName) == .orderedAscending
        }
    }
}

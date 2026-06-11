import Foundation

struct TeamStanding: Identifiable, Equatable {
    var id: UUID { team.id }
    let rank: Int
    let team: Team
    let totalPoints: Int
    let wins: Int
    let raceEntries: Int
}

enum TeamRankingService {
    static func standings(in season: Season, teams: [Team]) -> [TeamStanding] {
        var aggregates: [UUID: (points: Int, wins: Int, entries: Int)] = [:]

        for race in season.races {
            for result in race.results {
                guard let teamID = result.teamId else { continue }
                var agg = aggregates[teamID] ?? (points: 0, wins: 0, entries: 0)
                agg.points += result.points
                agg.entries += 1
                if result.position == 1 && !result.dnf {
                    agg.wins += 1
                }
                aggregates[teamID] = agg
            }
        }

        let pairs = teams.map { team in
            (team, aggregates[team.id] ?? (points: 0, wins: 0, entries: 0))
        }

        let sorted = pairs.sorted { lhs, rhs in
            if lhs.1.points != rhs.1.points {
                return lhs.1.points > rhs.1.points
            }
            if lhs.1.wins != rhs.1.wins {
                return lhs.1.wins > rhs.1.wins
            }
            return lhs.0.name.localizedCaseInsensitiveCompare(rhs.0.name) == .orderedAscending
        }

        return sorted.enumerated().map { index, pair in
            TeamStanding(
                rank: index + 1,
                team: pair.0,
                totalPoints: pair.1.points,
                wins: pair.1.wins,
                raceEntries: pair.1.entries
            )
        }
    }
}

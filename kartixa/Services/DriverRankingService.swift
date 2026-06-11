import Foundation

struct DriverStats: Equatable {
    let totalPoints: Int
    let wins: Int
    let racesStarted: Int
    let fastestLaps: Int

    var avgPointsPerRace: Double {
        guard racesStarted > 0 else { return 0 }
        return Double(totalPoints) / Double(racesStarted)
    }

    var winRate: Double {
        guard racesStarted > 0 else { return 0 }
        return Double(wins) / Double(racesStarted)
    }
}

struct DriverPenaltyEntry: Identifiable, Equatable {
    let id: UUID
    let raceName: String
    let raceDate: Date
    let penalty: RaceResultPenalty
}

struct DriverRanking: Identifiable, Equatable {
    var id: UUID { driver.id }
    let rank: Int
    let driver: Driver
    let stats: DriverStats
}

enum DriverRankingService {
    static func stats(for driverID: UUID, in season: Season) -> DriverStats {
        var points = 0
        var wins = 0
        var races = 0
        var fastestLaps = 0

        for race in season.races {
            for result in race.results where result.driverId == driverID {
                points += result.points
                races += 1
                if result.position == 1 && !result.dnf { wins += 1 }
                if result.fastestLap { fastestLaps += 1 }
            }
        }

        return DriverStats(
            totalPoints: points,
            wins: wins,
            racesStarted: races,
            fastestLaps: fastestLaps
        )
    }

    static func rankings(in season: Season) -> [DriverRanking] {
        let pairs = season.drivers.map { driver in
            (driver, stats(for: driver.id, in: season))
        }

        let sorted = pairs.sorted { lhs, rhs in
            if lhs.1.totalPoints != rhs.1.totalPoints {
                return lhs.1.totalPoints > rhs.1.totalPoints
            }
            if lhs.1.wins != rhs.1.wins {
                return lhs.1.wins > rhs.1.wins
            }
            return lhs.0.name.localizedCaseInsensitiveCompare(rhs.0.name) == .orderedAscending
        }

        return sorted.enumerated().map { index, pair in
            DriverRanking(rank: index + 1, driver: pair.0, stats: pair.1)
        }
    }

    static func penaltyHistory(for driverID: UUID, in season: Season) -> [DriverPenaltyEntry] {
        var entries: [DriverPenaltyEntry] = []
        for race in season.races {
            for result in race.results where result.driverId == driverID {
                for penalty in result.penalties {
                    entries.append(
                        DriverPenaltyEntry(
                            id: penalty.id,
                            raceName: race.name,
                            raceDate: race.date,
                            penalty: penalty
                        )
                    )
                }
            }
        }
        return entries.sorted(by: { $0.raceDate > $1.raceDate })
    }
}

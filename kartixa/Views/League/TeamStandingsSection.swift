import SwiftUI

struct TeamStandingsSection: View {
    let season: Season
    let teams: [Team]

    var body: some View {
        let standings = TeamRankingService.standings(in: season, teams: teams)
        if !teams.isEmpty {
            Section("Team-Standings") {
                if standings.isEmpty {
                    Text("Keine Teams in dieser Liga.")
                        .foregroundStyle(.secondary)
                        .font(.subheadline)
                } else {
                    ForEach(standings) { standing in
                        TeamStandingRow(standing: standing)
                    }
                }
            }
        }
    }
}

private struct TeamStandingRow: View {
    let standing: TeamStanding

    var body: some View {
        HStack(spacing: 12) {
            Text("\(standing.rank)")
                .font(.subheadline.bold())
                .monospacedDigit()
                .frame(width: 28)
                .foregroundStyle(standing.rank <= 3 ? .primary : .secondary)
            VStack(alignment: .leading, spacing: 2) {
                Text(standing.team.name).font(.subheadline.weight(.medium))
                Text("\(standing.raceEntries) Einsätze · \(standing.wins) Siege")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
            Spacer()
            Text("\(standing.totalPoints) Pkt.")
                .font(.subheadline.weight(.medium))
                .monospacedDigit()
        }
        .padding(.vertical, 2)
    }
}

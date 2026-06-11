import SwiftUI

struct DriverRankingsSection: View {
    let season: Season
    let teams: [Team]
    let onSelect: (Driver) -> Void

    var body: some View {
        Section("Fahrer-Rankings") {
            let rankings = DriverRankingService.rankings(in: season)
            if rankings.isEmpty {
                Text("Keine Fahrer in dieser Saison.")
                    .foregroundStyle(.secondary)
                    .font(.subheadline)
            } else {
                ForEach(rankings) { ranking in
                    Button {
                        onSelect(ranking.driver)
                    } label: {
                        DriverRankingRow(
                            ranking: ranking,
                            teamName: teamName(for: ranking.driver.currentTeamId)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func teamName(for id: UUID?) -> String? {
        guard let id else { return nil }
        return teams.first(where: { $0.id == id })?.name
    }
}

private struct DriverRankingRow: View {
    let ranking: DriverRanking
    let teamName: String?

    var body: some View {
        HStack(spacing: 12) {
            rankBadge
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Text(ranking.driver.name).font(.subheadline.weight(.medium))
                    if ranking.driver.number > 0 {
                        Text("#\(ranking.driver.number)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                if let teamName {
                    Text(teamName).font(.caption2).foregroundStyle(.secondary)
                }
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text("\(ranking.stats.totalPoints) Pkt.")
                    .font(.subheadline.weight(.medium))
                    .monospacedDigit()
                Text("\(ranking.stats.wins) Siege · \(ranking.stats.racesStarted) Rennen")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
        }
        .padding(.vertical, 2)
    }

    @ViewBuilder
    private var rankBadge: some View {
        switch ranking.rank {
        case 1: Text("🥇").font(.title3)
        case 2: Text("🥈").font(.title3)
        case 3: Text("🥉").font(.title3)
        default:
            Text("\(ranking.rank)")
                .font(.subheadline)
                .monospacedDigit()
                .frame(width: 28)
                .foregroundStyle(.secondary)
        }
    }
}

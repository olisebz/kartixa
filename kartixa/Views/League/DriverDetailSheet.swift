import SwiftUI

struct DriverDetailSheet: View {
    let driver: Driver
    let season: Season
    let teams: [Team]

    @Environment(\.dismiss) private var dismiss

    private var stats: DriverStats {
        DriverRankingService.stats(for: driver.id, in: season)
    }

    private var penalties: [DriverPenaltyEntry] {
        DriverRankingService.penaltyHistory(for: driver.id, in: season)
    }

    private var teamName: String? {
        guard let id = driver.currentTeamId else { return nil }
        return teams.first(where: { $0.id == id })?.name
    }

    private let teamPalette: [Color] = [
        KX.Color.green, KX.Color.purple, KX.Color.blue,
        KX.Color.orange, KX.Color.red, KX.Color.gold
    ]

    private var teamColor: Color {
        guard let id = driver.currentTeamId,
              let idx = teams.firstIndex(where: { $0.id == id }) else {
            return KX.Color.faint
        }
        return teamPalette[idx % teamPalette.count]
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0) {
                    hero
                        .padding(.horizontal, 18)
                        .padding(.top, 20)
                        .padding(.bottom, 18)

                    statsSection
                        .padding(.bottom, 22)

                    if !penalties.isEmpty {
                        penaltiesSection
                    }

                    Color.clear.frame(height: 28)
                }
            }
            .scrollIndicators(.hidden)
            .kxBackground()
            .navigationTitle(driver.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fertig") { dismiss() }
                        .foregroundStyle(KX.Color.green)
                }
            }
        }
    }

    private var hero: some View {
        HStack(alignment: .center, spacing: 12) {
            RoundedRectangle(cornerRadius: 3)
                .fill(teamColor)
                .frame(width: 4, height: 56)
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(driver.name.uppercased())
                        .font(KX.Font.display(28, weight: .heavy))
                        .foregroundStyle(KX.Color.text)
                        .lineLimit(1)
                    if driver.number > 0 {
                        Text("#\(driver.number)")
                            .font(KX.Font.mono(13))
                            .foregroundStyle(KX.Color.dim)
                    }
                }
                if let teamName {
                    Text(teamName.uppercased())
                        .font(KX.Font.ui(12, weight: .semibold))
                        .tracking(0.5)
                        .foregroundStyle(KX.Color.dim)
                }
            }
            Spacer()
        }
    }

    private var statsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            KXSecLabel("Statistik")
            KXCard {
                VStack(spacing: 0) {
                    statRow(label: "Gesamtpunkte", value: "\(stats.totalPoints)")
                    divider
                    statRow(label: "Siege", value: "\(stats.wins)", accent: KX.Color.gold)
                    divider
                    statRow(label: "Rennen", value: "\(stats.racesStarted)")
                    divider
                    statRow(label: "Schnellste Runden", value: "\(stats.fastestLaps)", accent: KX.Color.purple)
                    divider
                    statRow(
                        label: "Ø Punkte/Rennen",
                        value: stats.racesStarted > 0
                            ? String(format: "%.1f", stats.avgPointsPerRace)
                            : "—"
                    )
                    divider
                    statRow(
                        label: "Siegquote",
                        value: stats.racesStarted > 0
                            ? String(format: "%.0f %%", stats.winRate * 100)
                            : "—"
                    )
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private func statRow(label: LocalizedStringKey, value: String, accent: Color? = nil) -> some View {
        HStack {
            Text(label)
                .font(KX.Font.ui(13, weight: .medium))
                .foregroundStyle(KX.Color.dim)
            Spacer()
            Text(value)
                .font(KX.Font.mono(15, weight: .bold))
                .foregroundStyle(accent ?? KX.Color.text)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private var divider: some View {
        Rectangle().fill(KX.Color.line).frame(height: 1)
    }

    private var penaltiesSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            KXSecLabel("Strafen-Historie")
            KXCard {
                VStack(spacing: 0) {
                    ForEach(Array(penalties.enumerated()), id: \.element.id) { idx, entry in
                        penaltyRow(entry)
                        if idx < penalties.count - 1 {
                            divider
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private func penaltyRow(_ entry: DriverPenaltyEntry) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(entry.raceName.uppercased())
                    .font(KX.Font.display(14, weight: .bold))
                    .foregroundStyle(KX.Color.text)
                Spacer()
                Text(entry.raceDate.formatted(.dateTime.day().month(.abbreviated)).uppercased())
                    .font(KX.Font.mono(10, weight: .semibold))
                    .foregroundStyle(KX.Color.faint)
            }
            HStack(spacing: 6) {
                Image(systemName: penaltyIcon(entry.penalty))
                    .font(.system(size: 12))
                    .foregroundStyle(KX.Color.orange)
                Text(penaltyDescription(entry.penalty))
                    .font(KX.Font.ui(12, weight: .semibold))
                    .foregroundStyle(KX.Color.orange)
            }
            if let note = entry.penalty.note, !note.isEmpty {
                Text(note)
                    .font(KX.Font.ui(11))
                    .foregroundStyle(KX.Color.dim)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func penaltyDescription(_ penalty: RaceResultPenalty) -> String {
        switch penalty.type {
        case .seconds: "\(penalty.value) Sek."
        case .grid: "\(penalty.value) Startplätze"
        case .points: "\(penalty.value) Punkte"
        }
    }

    private func penaltyIcon(_ penalty: RaceResultPenalty) -> String {
        switch penalty.type {
        case .seconds: "clock"
        case .grid: "arrow.down.to.line"
        case .points: "minus.circle"
        }
    }
}

#Preview {
    DriverDetailSheet(
        driver: Driver(name: "L. Brandt", number: 7),
        season: Season(name: "Saison 2026", startDate: Date()),
        teams: []
    )
    .preferredColorScheme(.dark)
}

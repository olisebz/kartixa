import SwiftUI

struct DriversPageView: View {
    @State private var viewModel = LeagueListViewModel()
    @State private var selectedLeagueID: UUID?
    @Environment(\.scenePhase) private var scenePhase

    private var filteredLeagues: [League] {
        if let id = selectedLeagueID {
            return viewModel.leagues.filter { $0.id == id }
        }
        return viewModel.leagues
    }

    private var aggregatedStats: [CrossLeagueDriverStats] {
        DriverAggregateService.aggregate(across: filteredLeagues)
    }

    private var totalDrivers: Int { aggregatedStats.count }
    private var totalWins: Int { aggregatedStats.reduce(0) { $0 + $1.wins } }
    private var totalRaces: Int { aggregatedStats.reduce(0) { $0 + $1.racesStarted } }

    private let palette: [Color] = [
        KX.Color.green, KX.Color.purple, KX.Color.blue,
        KX.Color.gold, KX.Color.orange, KX.Color.red
    ]

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                KXBrandBar { EmptyView() }

                hero
                    .padding(.horizontal, 18)
                    .padding(.bottom, 14)

                if viewModel.leagues.isEmpty {
                    emptyState
                        .padding(.top, 60)
                } else {
                    filterPill
                        .padding(.horizontal, 18)
                        .padding(.bottom, 18)

                    overviewStrip
                        .padding(.horizontal, 16)
                        .padding(.bottom, 22)

                    if aggregatedStats.isEmpty {
                        Text("Noch keine Fahrer in dieser Auswahl.")
                            .font(KX.Font.ui(13))
                            .foregroundStyle(KX.Color.faint)
                            .padding(.horizontal, 18)
                    } else {
                        if let leader = aggregatedStats.first {
                            leaderSpotlight(leader: leader)
                                .padding(.horizontal, 16)
                                .padding(.bottom, 22)
                        }
                        ranklistSection
                    }
                }

                Color.clear.frame(height: 60)
            }
        }
        .scrollIndicators(.hidden)
        .kxBackground()
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active { viewModel.load() }
        }
        .onAppear {
            viewModel.load()
        }
    }

    // MARK: - Hero

    private var hero: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 0) {
                Text("FAH")
                    .foregroundStyle(KX.Color.text)
                Text("RER")
                    .foregroundStyle(KX.Color.green)
            }
            .font(KX.Font.display(44, weight: .heavy))
            .tracking(-0.5)

            if !viewModel.leagues.isEmpty {
                Text("\(totalDrivers) FAHRER · \(totalWins) SIEGE · \(totalRaces) RENNEN")
                    .font(KX.Font.mono(11.5, weight: .semibold))
                    .tracking(0.5)
                    .foregroundStyle(KX.Color.dim)
            } else {
                Text("Auswertung über alle Serien")
                    .font(KX.Font.mono(11.5, weight: .semibold))
                    .tracking(0.5)
                    .foregroundStyle(KX.Color.dim)
                    .textCase(.uppercase)
            }
        }
    }

    // MARK: - Filter

    private var filterPill: some View {
        Menu {
            Button {
                selectedLeagueID = nil
            } label: {
                Label("Alle Serien", systemImage: "globe")
            }
            Divider()
            ForEach(viewModel.leagues) { league in
                Button {
                    selectedLeagueID = league.id
                } label: {
                    Text(league.name)
                }
            }
        } label: {
            HStack(spacing: 7) {
                Image(systemName: selectedLeagueID == nil ? "globe" : "flag.checkered")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(KX.Color.green)
                Text(filterPillLabel.uppercased())
                    .font(KX.Font.display(13, weight: .bold))
                    .tracking(0.5)
                    .foregroundStyle(KX.Color.text)
                    .lineLimit(1)
                Image(systemName: "chevron.down")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(KX.Color.dim)
            }
            .padding(.horizontal, 11)
            .padding(.vertical, 7)
            .background(KX.Color.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 9)
                    .stroke(KX.Color.lineHi, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 9))
        }
    }

    private var filterPillLabel: String {
        if let id = selectedLeagueID,
           let league = viewModel.leagues.first(where: { $0.id == id }) {
            return league.name
        }
        return "Alle Serien"
    }

    // MARK: - Overview Strip

    private var overviewStrip: some View {
        KXCard(accent: KX.Color.green) {
            HStack(spacing: 0) {
                cell(label: "Fahrer", value: "\(totalDrivers)")
                vDivider
                cell(label: "Siege", value: "\(totalWins)")
                vDivider
                cell(label: "Rennen", value: "\(totalRaces)")
                vDivider
                cell(label: "Schn. Rd.", value: "\(aggregatedStats.reduce(0) { $0 + $1.fastestLaps })")
            }
            .padding(.vertical, 14)
        }
    }

    private var vDivider: some View {
        Rectangle().fill(KX.Color.line).frame(width: 1).padding(.vertical, 6)
    }

    private func cell(label: LocalizedStringKey, value: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(KX.Font.mono(22, weight: .bold))
                .foregroundStyle(KX.Color.text)
            Text(label)
                .font(KX.Font.ui(9, weight: .semibold))
                .tracking(1.2)
                .textCase(.uppercase)
                .foregroundStyle(KX.Color.faint)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Leader Spotlight

    private func leaderSpotlight(leader: CrossLeagueDriverStats) -> some View {
        KXCard(accent: KX.Color.gold) {
            VStack(spacing: 0) {
                HStack(alignment: .center, spacing: 10) {
                    KXPosChip(position: 1, size: 42, fontSize: 24)
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Text(leader.displayName.uppercased())
                                .font(KX.Font.display(25, weight: .heavy))
                                .foregroundStyle(KX.Color.text)
                                .lineLimit(1)
                            if let num = leader.representativeNumber {
                                Text("#\(num)")
                                    .font(KX.Font.mono(12))
                                    .foregroundStyle(KX.Color.dim)
                            }
                        }
                        HStack(spacing: 6) {
                            Image(systemName: "trophy.fill")
                                .font(.system(size: 9))
                                .foregroundStyle(KX.Color.gold)
                            Text("AKTIVE LEGENDE · \(leader.leagueNames.count) SERIE\(leader.leagueNames.count == 1 ? "" : "N")")
                                .font(KX.Font.display(10.5, weight: .bold))
                                .tracking(1.0)
                                .foregroundStyle(KX.Color.gold)
                        }
                    }
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("\(leader.totalPoints)")
                            .font(KX.Font.mono(30, weight: .bold))
                            .foregroundStyle(KX.Color.text)
                        Text("PUNKTE")
                            .font(KX.Font.ui(9, weight: .semibold))
                            .tracking(1.5)
                            .foregroundStyle(KX.Color.faint)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.top, 14)

                Rectangle().fill(KX.Color.line).frame(height: 1).padding(.top, 14)

                HStack(spacing: 0) {
                    spotlightStat(label: "Siege", value: "\(leader.wins)", accent: KX.Color.gold)
                    spotlightStat(label: "Rennen", value: "\(leader.racesStarted)")
                    spotlightStat(label: "Schn. Rd.", value: "\(leader.fastestLaps)", accent: KX.Color.purple)
                    spotlightStat(
                        label: "Ø Pkt.",
                        value: leader.racesStarted > 0
                            ? String(format: "%.1f", Double(leader.totalPoints) / Double(leader.racesStarted))
                            : "—"
                    )
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 12)
            }
        }
    }

    private func spotlightStat(label: LocalizedStringKey, value: String, accent: Color? = nil) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(KX.Font.mono(17, weight: .bold))
                .foregroundStyle(accent ?? KX.Color.text)
            Text(label)
                .font(KX.Font.ui(9, weight: .semibold))
                .tracking(1.0)
                .textCase(.uppercase)
                .foregroundStyle(KX.Color.faint)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Rank List

    private var ranklistSection: some View {
        let leaderPoints = aggregatedStats.first?.totalPoints
        let chasers = Array(aggregatedStats.dropFirst())
        return VStack(alignment: .leading, spacing: 0) {
            KXSecLabel("Verfolger")
            if chasers.isEmpty {
                Text("Noch keine weiteren Fahrer.")
                    .font(KX.Font.ui(12))
                    .foregroundStyle(KX.Color.faint)
                    .padding(.horizontal, 18)
                    .padding(.bottom, 4)
            } else {
                KXCard {
                    VStack(spacing: 0) {
                        ForEach(Array(chasers.enumerated()), id: \.element.id) { idx, stats in
                            DriverAggregateRow(
                                rank: idx + 2,
                                stats: stats,
                                leaderPoints: leaderPoints,
                                accentColor: palette[(idx + 1) % palette.count],
                                showsDivider: idx < chasers.count - 1
                            )
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(.bottom, 22)
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "person.3")
                .font(.system(size: 48, weight: .regular))
                .foregroundStyle(KX.Color.faint)
            Text("Keine Fahrer")
                .font(KX.Font.display(22, weight: .heavy))
                .foregroundStyle(KX.Color.text)
            Text("Lege eine Serie an und füge Fahrer hinzu — sie erscheinen hier serienübergreifend.")
                .font(KX.Font.ui(13))
                .foregroundStyle(KX.Color.dim)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct DriverAggregateRow: View {
    let rank: Int
    let stats: CrossLeagueDriverStats
    let leaderPoints: Int?
    let accentColor: Color
    let showsDivider: Bool

    private var gap: Int {
        guard let leaderPoints else { return 0 }
        return leaderPoints - stats.totalPoints
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                KXPosChip(position: rank)
                RoundedRectangle(cornerRadius: 2)
                    .fill(accentColor)
                    .frame(width: 3, height: 34)
                VStack(alignment: .leading, spacing: 2) {
                    Text(stats.displayName.uppercased())
                        .font(KX.Font.display(18.5, weight: .bold))
                        .tracking(0.2)
                        .foregroundStyle(KX.Color.text)
                        .lineLimit(1)
                    HStack(spacing: 7) {
                        if let num = stats.representativeNumber {
                            Text("#\(num)")
                                .font(KX.Font.mono(11))
                                .foregroundStyle(KX.Color.dim)
                        }
                        Text(stats.leagueNames.joined(separator: " · "))
                            .font(KX.Font.ui(11, weight: .medium))
                            .foregroundStyle(KX.Color.faint)
                            .lineLimit(1)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    HStack(alignment: .lastTextBaseline, spacing: 3) {
                        Text("\(stats.totalPoints)")
                            .font(KX.Font.mono(19, weight: .bold))
                            .foregroundStyle(KX.Color.text)
                        Text("PKT")
                            .font(KX.Font.ui(9, weight: .semibold))
                            .tracking(0.5)
                            .foregroundStyle(KX.Color.faint)
                    }
                    HStack(spacing: 8) {
                        if stats.wins > 0 {
                            Text("\(stats.wins)★")
                                .font(KX.Font.mono(10, weight: .bold))
                                .foregroundStyle(KX.Color.gold)
                        }
                        Text(gap == 0 ? "—" : "+\(gap)")
                            .font(KX.Font.mono(10.5))
                            .foregroundStyle(KX.Color.faint)
                    }
                }
            }
            .padding(.horizontal, 14)
            .frame(height: 60)
            if showsDivider {
                Rectangle().fill(KX.Color.line).frame(height: 1)
            }
        }
    }
}

#Preview {
    DriversPageView()
        .preferredColorScheme(.dark)
}

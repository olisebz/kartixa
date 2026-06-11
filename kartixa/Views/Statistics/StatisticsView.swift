import SwiftUI
import Charts

struct StatisticsView: View {
    @State private var viewModel = LeagueListViewModel()
    @State private var selectedLeagueID: UUID?
    @State private var selectedSeasonID: UUID?
    @Environment(\.scenePhase) private var scenePhase

    private var selectedLeague: League? {
        guard let id = selectedLeagueID else { return viewModel.leagues.first }
        return viewModel.leagues.first(where: { $0.id == id })
    }

    private var selectedSeason: Season? {
        guard let league = selectedLeague else { return nil }
        if let id = selectedSeasonID {
            return league.seasons.first(where: { $0.id == id })
        }
        return league.seasons.first(where: \.isActive) ?? league.seasons.first
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                KXBrandBar { EmptyView() }

                hero
                    .padding(.horizontal, 18)
                    .padding(.bottom, 14)

                if viewModel.leagues.isEmpty {
                    emptyLeagues
                        .padding(.top, 60)
                } else if let season = selectedSeason {
                    pickersRow
                        .padding(.horizontal, 18)
                        .padding(.bottom, 18)

                    overviewCard(for: season)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 22)

                    if season.races.isEmpty {
                        emptyRaces
                            .padding(.top, 30)
                    } else {
                        trendChartSection(season: season)
                        winsDonutSection(season: season)
                        fastestLapsBarSection(season: season)
                        if let league = selectedLeague, !league.teams.isEmpty {
                            teamBarSection(season: season, teams: league.teams)
                        }
                    }
                } else {
                    emptyLeagues
                        .padding(.top, 60)
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
            if selectedLeagueID == nil {
                selectedLeagueID = viewModel.leagues.first(where: { $0.seasons.contains(where: \.isActive) })?.id
                    ?? viewModel.leagues.first?.id
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 0) {
                Text("STATIS")
                    .foregroundStyle(KX.Color.text)
                Text("TIK")
                    .foregroundStyle(KX.Color.green)
            }
            .font(KX.Font.display(44, weight: .heavy))
            .tracking(-0.5)

            Text(subtitle)
                .font(KX.Font.mono(11.5, weight: .semibold))
                .tracking(0.5)
                .foregroundStyle(KX.Color.dim)
                .textCase(.uppercase)
        }
    }

    private var subtitle: String {
        guard let season = selectedSeason else { return "Auswertung" }
        let raceCount = season.races.count
        return raceCount > 0
            ? "Auswertung · nach \(raceCount) rennen"
            : "Auswertung · keine rennen"
    }

    private var pickersRow: some View {
        HStack(spacing: 10) {
            leaguePickerPill
            if let league = selectedLeague, league.seasons.count > 1 {
                seasonPickerPill(league: league)
            }
        }
    }

    private var leaguePickerPill: some View {
        Menu {
            ForEach(viewModel.leagues) { league in
                Button {
                    selectedLeagueID = league.id
                    selectedSeasonID = nil
                } label: {
                    Text(league.name)
                }
            }
        } label: {
            pickerLabel(
                title: selectedLeague?.name.uppercased() ?? "—",
                icon: "flag.checkered"
            )
        }
    }

    private func seasonPickerPill(league: League) -> some View {
        Menu {
            ForEach(league.seasons) { season in
                Button {
                    selectedSeasonID = season.id
                } label: {
                    if season.isActive {
                        Label(season.name, systemImage: "checkmark.circle.fill")
                    } else {
                        Text(season.name)
                    }
                }
            }
        } label: {
            pickerLabel(
                title: (selectedSeason?.name ?? "—").uppercased(),
                icon: "calendar"
            )
        }
    }

    private func pickerLabel(title: String, icon: String) -> some View {
        HStack(spacing: 7) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(KX.Color.green)
            Text(title)
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

    // MARK: - Overview Card

    private func overviewCard(for season: Season) -> some View {
        let overview = StatisticsService.overview(of: season)
        return KXCard(accent: KX.Color.green) {
            HStack(spacing: 0) {
                overviewCell(label: "Rennen", value: "\(overview.totalRaces)")
                divider
                overviewCell(label: "Fahrer", value: "\(overview.totalDrivers)")
                divider
                overviewCell(label: "Punkte", value: "\(overview.totalPoints)")
                divider
                overviewCell(label: "Einsätze", value: "\(overview.totalEntries)")
            }
            .padding(.vertical, 14)
        }
    }

    private var divider: some View {
        Rectangle().fill(KX.Color.line).frame(width: 1).padding(.vertical, 6)
    }

    private func overviewCell(label: LocalizedStringKey, value: String) -> some View {
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

    // MARK: - Trend Chart

    private func trendChartSection(season: Season) -> some View {
        let trend = StatisticsService.cumulativePointsTrend(in: season, topN: 5)
        let driverNames = Array(Set(trend.map(\.driverName)))
        return VStack(alignment: .leading, spacing: 0) {
            KXSecLabel("Punkte-Verlauf") {
                Text("TOP 5")
                    .font(KX.Font.display(12, weight: .bold))
                    .tracking(0.8)
                    .foregroundStyle(KX.Color.green)
            }
            KXCard {
                Group {
                    if trend.isEmpty {
                        chartEmptyState("Keine Daten")
                    } else {
                        Chart(trend) { point in
                            LineMark(
                                x: .value("Rennen", point.raceIndex),
                                y: .value("Punkte", point.cumulativePoints)
                            )
                            .foregroundStyle(by: .value("Fahrer", point.driverName))
                            .interpolationMethod(.monotone)
                            .lineStyle(StrokeStyle(lineWidth: 2.2, lineCap: .round, lineJoin: .round))

                            PointMark(
                                x: .value("Rennen", point.raceIndex),
                                y: .value("Punkte", point.cumulativePoints)
                            )
                            .foregroundStyle(by: .value("Fahrer", point.driverName))
                            .symbolSize(28)
                        }
                        .chartForegroundStyleScale(domain: driverNames, range: chartPalette(count: driverNames.count))
                        .chartXAxis {
                            AxisMarks(values: .stride(by: 1)) { value in
                                AxisGridLine().foregroundStyle(KX.Color.line)
                                AxisTick().foregroundStyle(KX.Color.line)
                                AxisValueLabel {
                                    if let raw = value.as(Int.self) {
                                        Text(raw == 0 ? "•" : "R\(raw)")
                                            .font(KX.Font.mono(9, weight: .semibold))
                                            .foregroundStyle(KX.Color.faint)
                                    }
                                }
                            }
                        }
                        .chartYAxis {
                            AxisMarks(position: .leading) { value in
                                AxisGridLine().foregroundStyle(KX.Color.line)
                                AxisValueLabel {
                                    if let raw = value.as(Int.self) {
                                        Text("\(raw)")
                                            .font(KX.Font.mono(9, weight: .semibold))
                                            .foregroundStyle(KX.Color.faint)
                                    }
                                }
                            }
                        }
                        .chartLegend(position: .bottom, alignment: .leading, spacing: 8) {
                            HStack(spacing: 12) {
                                ForEach(Array(driverNames.enumerated()), id: \.element) { idx, name in
                                    HStack(spacing: 5) {
                                        Circle()
                                            .fill(chartPalette(count: driverNames.count)[idx])
                                            .frame(width: 8, height: 8)
                                        Text(name)
                                            .font(KX.Font.ui(10, weight: .semibold))
                                            .foregroundStyle(KX.Color.dim)
                                            .lineLimit(1)
                                    }
                                }
                            }
                        }
                        .frame(height: 200)
                        .padding(14)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 22)
    }

    // MARK: - Wins Donut

    private func winsDonutSection(season: Season) -> some View {
        let wins = StatisticsService.winsDistribution(in: season)
        let totalWins = wins.reduce(0) { $0 + $1.wins }
        return VStack(alignment: .leading, spacing: 0) {
            KXSecLabel("Sieger-Verteilung")
            KXCard {
                Group {
                    if wins.isEmpty {
                        chartEmptyState("Noch keine Sieger")
                    } else {
                        HStack(alignment: .center, spacing: 18) {
                            ZStack {
                                Chart(wins) { slice in
                                    SectorMark(
                                        angle: .value("Siege", slice.wins),
                                        innerRadius: .ratio(0.62),
                                        angularInset: 2.0
                                    )
                                    .foregroundStyle(by: .value("Fahrer", slice.driverName))
                                    .cornerRadius(3)
                                }
                                .chartForegroundStyleScale(
                                    domain: wins.map(\.driverName),
                                    range: chartPalette(count: wins.count)
                                )
                                .chartLegend(.hidden)
                                .frame(width: 130, height: 130)

                                VStack(spacing: 0) {
                                    Text("\(totalWins)")
                                        .font(KX.Font.mono(28, weight: .bold))
                                        .foregroundStyle(KX.Color.text)
                                    Text("SIEGE")
                                        .font(KX.Font.display(9, weight: .bold))
                                        .tracking(1.2)
                                        .foregroundStyle(KX.Color.faint)
                                }
                            }

                            VStack(alignment: .leading, spacing: 8) {
                                ForEach(Array(wins.enumerated()), id: \.element.id) { idx, slice in
                                    HStack(spacing: 8) {
                                        Circle()
                                            .fill(chartPalette(count: wins.count)[idx])
                                            .frame(width: 9, height: 9)
                                        Text(slice.driverName.uppercased())
                                            .font(KX.Font.display(13, weight: .bold))
                                            .foregroundStyle(KX.Color.text)
                                            .lineLimit(1)
                                        Spacer()
                                        Text("\(slice.wins)")
                                            .font(KX.Font.mono(13, weight: .bold))
                                            .foregroundStyle(KX.Color.dim)
                                    }
                                }
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 16)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 22)
    }

    // MARK: - Fastest Laps Bar

    private func fastestLapsBarSection(season: Season) -> some View {
        let rows = StatisticsService.fastestLapsCount(in: season)
        let maxValue = rows.map(\.count).max() ?? 0
        return VStack(alignment: .leading, spacing: 0) {
            KXSecLabel("Schnellste Runden")
            KXCard {
                Group {
                    if rows.isEmpty {
                        chartEmptyState("Noch keine schnellsten Runden")
                    } else {
                        VStack(spacing: 12) {
                            ForEach(rows) { row in
                                HStack(spacing: 12) {
                                    Text(row.driverName.uppercased())
                                        .font(KX.Font.display(13, weight: .bold))
                                        .foregroundStyle(KX.Color.text)
                                        .frame(width: 90, alignment: .leading)
                                        .lineLimit(1)
                                    GeometryReader { proxy in
                                        let ratio = max(0.04, Double(row.count) / Double(maxValue))
                                        RoundedRectangle(cornerRadius: 4)
                                            .fill(LinearGradient(
                                                colors: [KX.Color.purple, KX.Color.purple.opacity(0.4)],
                                                startPoint: .leading,
                                                endPoint: .trailing
                                            ))
                                            .frame(width: proxy.size.width * ratio, height: 14)
                                    }
                                    .frame(height: 14)
                                    Text("\(row.count)")
                                        .font(KX.Font.mono(14, weight: .bold))
                                        .foregroundStyle(KX.Color.text)
                                        .frame(width: 30, alignment: .trailing)
                                }
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 22)
    }

    // MARK: - Team Bar

    private func teamBarSection(season: Season, teams: [Team]) -> some View {
        let teamRows = StatisticsService.teamPoints(in: season, teams: teams)
        return VStack(alignment: .leading, spacing: 0) {
            KXSecLabel("Teams")
            KXCard {
                Group {
                    if teamRows.isEmpty {
                        chartEmptyState("Keine Team-Daten")
                    } else {
                        Chart(teamRows) { row in
                            BarMark(
                                x: .value("Punkte", row.totalPoints),
                                y: .value("Team", row.teamName)
                            )
                            .foregroundStyle(by: .value("Team", row.teamName))
                            .cornerRadius(4)
                            .annotation(position: .trailing) {
                                Text("\(row.totalPoints)")
                                    .font(KX.Font.mono(11, weight: .bold))
                                    .foregroundStyle(KX.Color.dim)
                            }
                        }
                        .chartForegroundStyleScale(
                            domain: teamRows.map(\.teamName),
                            range: chartPalette(count: teamRows.count)
                        )
                        .chartXAxis {
                            AxisMarks { value in
                                AxisGridLine().foregroundStyle(KX.Color.line)
                                AxisValueLabel {
                                    if let raw = value.as(Int.self) {
                                        Text("\(raw)")
                                            .font(KX.Font.mono(9, weight: .semibold))
                                            .foregroundStyle(KX.Color.faint)
                                    }
                                }
                            }
                        }
                        .chartYAxis {
                            AxisMarks(position: .leading) { value in
                                AxisValueLabel {
                                    if let raw = value.as(String.self) {
                                        Text(raw.uppercased())
                                            .font(KX.Font.display(11, weight: .bold))
                                            .foregroundStyle(KX.Color.text)
                                            .lineLimit(1)
                                    }
                                }
                            }
                        }
                        .chartLegend(.hidden)
                        .frame(height: CGFloat(teamRows.count) * 38 + 50)
                        .padding(14)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 22)
    }

    // MARK: - Empty States

    private var emptyLeagues: some View {
        VStack(spacing: 14) {
            Image(systemName: "chart.bar.xaxis")
                .font(.system(size: 48, weight: .regular))
                .foregroundStyle(KX.Color.faint)
            Text("Keine Daten")
                .font(KX.Font.display(22, weight: .heavy))
                .foregroundStyle(KX.Color.text)
            Text("Lege eine Serie an und trage Rennen ein, damit hier Auswertungen erscheinen.")
                .font(KX.Font.ui(13))
                .foregroundStyle(KX.Color.dim)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 20)
        }
        .frame(maxWidth: .infinity)
    }

    private var emptyRaces: some View {
        VStack(spacing: 12) {
            Image(systemName: "flag.checkered.circle")
                .font(.system(size: 36, weight: .regular))
                .foregroundStyle(KX.Color.faint)
            Text("Noch keine Rennen in dieser Saison")
                .font(KX.Font.ui(13))
                .foregroundStyle(KX.Color.dim)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 30)
    }

    private func chartEmptyState(_ text: LocalizedStringKey) -> some View {
        Text(text)
            .font(KX.Font.ui(12))
            .foregroundStyle(KX.Color.faint)
            .frame(maxWidth: .infinity, minHeight: 120)
    }

    // MARK: - Color Palette

    private let palette: [Color] = [
        KX.Color.green,
        KX.Color.purple,
        KX.Color.blue,
        KX.Color.gold,
        KX.Color.orange,
        KX.Color.red
    ]

    private func chartPalette(count: Int) -> [Color] {
        guard count > 0 else { return [] }
        return (0..<count).map { palette[$0 % palette.count] }
    }
}

#Preview {
    StatisticsView()
        .preferredColorScheme(.dark)
}

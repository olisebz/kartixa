import SwiftUI

struct LeagueDetailView: View {
    let league: League
    var onUpdate: (League) -> Void
    var onDelete: (League) -> Void
    var onBack: () -> Void

    @State private var showingDeleteLeagueAlert = false
    @State private var showingDeleteSeasonAlert = false
    @State private var showingNewSeasonSheet = false
    @State private var showingNewRaceSheet = false
    @State private var selectedSeasonID: UUID?
    @State private var raceErrorMessage: String?
    @State private var selectedDriverForDetail: Driver?
    @State private var showingSeasonMenu = false

    private var activeSeason: Season? {
        league.seasons.first(where: \.isActive) ?? league.seasons.first
    }

    private var resolvedSeasonID: UUID? {
        selectedSeasonID ?? activeSeason?.id
    }

    private var selectedSeason: Season? {
        guard let id = resolvedSeasonID else { return activeSeason }
        return league.seasons.first(where: { $0.id == id }) ?? activeSeason
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                KXDetailHeader(title: "Serie", onBack: onBack) {
                    HStack(spacing: 8) {
                        ShareLink(item: league, preview: SharePreview(league.name, image: Image(systemName: "trophy.fill"))) {
                            KXIconBtnContent {
                                Image(systemName: "square.and.arrow.up")
                                    .font(.system(size: 15, weight: .semibold))
                            }
                        }
                        Menu {
                            NavigationLink {
                                EditLeagueView(league: league, onSave: onUpdate)
                            } label: {
                                Label("Bearbeiten", systemImage: "pencil")
                            }
                            if let seasonID = resolvedSeasonID {
                                NavigationLink {
                                    DriversListView(league: league, seasonID: seasonID, onUpdate: onUpdate)
                                } label: {
                                    Label("Fahrer verwalten", systemImage: "person.2")
                                }
                            }
                            Button {
                                showingNewSeasonSheet = true
                            } label: {
                                Label("Neue Saison anlegen", systemImage: "plus")
                            }
                            if let season = selectedSeason, !season.isActive {
                                Button {
                                    setSelectedSeasonActive()
                                } label: {
                                    Label("Als aktive Saison setzen", systemImage: "checkmark.circle")
                                }
                            }
                            if league.seasons.count > 1, selectedSeason != nil {
                                Button(role: .destructive) {
                                    showingDeleteSeasonAlert = true
                                } label: {
                                    Label("Saison löschen", systemImage: "trash")
                                }
                            }
                            Divider()
                            Button(role: .destructive) {
                                showingDeleteLeagueAlert = true
                            } label: {
                                Label("Liga löschen", systemImage: "trash")
                            }
                        } label: {
                            KXIconBtnContent {
                                Image(systemName: "ellipsis")
                                    .font(.system(size: 16, weight: .bold))
                            }
                        }
                    }
                }

                hero
                    .padding(.horizontal, 18)
                    .padding(.bottom, 14)

                rankingsSection
                racesSection

                if !league.teams.isEmpty {
                    teamStandingsSection
                }

                Color.clear.frame(height: 28)
            }
        }
        .scrollIndicators(.hidden)
        .kxBackground()
        .toolbar(.hidden, for: .navigationBar)
        .sheet(isPresented: $showingNewSeasonSheet) {
            NewSeasonSheet(
                existingSeasonNames: league.seasons.map(\.name),
                canCopyDrivers: !(selectedSeason?.drivers.isEmpty ?? true)
            ) { name, startDate, copyDrivers in
                let updated = SeasonService.addSeason(
                    to: league,
                    name: name,
                    startDate: startDate,
                    copyDriversFrom: copyDrivers ? selectedSeasonID : nil
                )
                onUpdate(updated)
                selectedSeasonID = updated.seasons.last?.id
            }
            .preferredColorScheme(.dark)
        }
        .sheet(isPresented: $showingNewRaceSheet) {
            if let season = selectedSeason {
                NewRaceView(
                    availableTracks: league.tracks,
                    availableDrivers: season.drivers
                ) { race in
                    handleAddRace(race)
                }
                .preferredColorScheme(.dark)
            }
        }
        .sheet(item: $selectedDriverForDetail) { driver in
            if let season = selectedSeason {
                DriverDetailSheet(driver: driver, season: season, teams: league.teams)
                    .preferredColorScheme(.dark)
            }
        }
        .alert("Liga löschen?", isPresented: $showingDeleteLeagueAlert) {
            Button("Löschen", role: .destructive) { onDelete(league) }
            Button("Abbrechen", role: .cancel) {}
        } message: {
            Text("„\(league.name)“ wird unwiderruflich gelöscht.")
        }
        .alert("Saison löschen?", isPresented: $showingDeleteSeasonAlert) {
            Button("Löschen", role: .destructive) { deleteSelectedSeason() }
            Button("Abbrechen", role: .cancel) {}
        } message: {
            if let season = selectedSeason {
                Text("„\(season.name)“ und alle ihre Fahrer und Rennen werden gelöscht.")
            }
        }
        .alert("Fehler", isPresented: raceErrorBinding, presenting: raceErrorMessage) { _ in
            Button("OK") { raceErrorMessage = nil }
        } message: { msg in
            Text(msg)
        }
        .onAppear {
            if selectedSeasonID == nil {
                selectedSeasonID = activeSeason?.id
            }
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(league.name.uppercased())
                .font(KX.Font.display(38, weight: .heavy))
                .tracking(-0.3)
                .foregroundStyle(KX.Color.text)
                .lineLimit(3)
                .multilineTextAlignment(.leading)

            HStack(spacing: 12) {
                seasonPill
                if let season = selectedSeason {
                    HStack(spacing: 18) {
                        KXStat(label: "Fahrer", value: String(format: "%02d", season.drivers.filter { !$0.isUnknownDriver }.count))
                        KXStat(label: "Rennen", value: String(format: "%02d", season.races.count))
                    }
                }
            }
        }
    }

    private var seasonPill: some View {
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
            HStack(spacing: 7) {
                Text((selectedSeason?.name ?? "—").uppercased())
                    .font(KX.Font.display(13, weight: .bold))
                    .tracking(0.5)
                    .foregroundStyle(KX.Color.text)
                if selectedSeason?.isActive == true {
                    KXPill(text: "AKTIV", color: KX.Color.green)
                }
                Image(systemName: "chevron.down")
                    .font(.system(size: 9, weight: .bold))
                    .foregroundStyle(KX.Color.dim)
            }
            .padding(.horizontal, 11)
            .padding(.vertical, 6)
            .background(KX.Color.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 9)
                    .stroke(KX.Color.lineHi, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 9))
        }
    }

    @ViewBuilder
    private var rankingsSection: some View {
        if let season = selectedSeason {
            let rankings = DriverRankingService.rankings(in: season).filter { !$0.driver.isUnknownDriver }
            VStack(alignment: .leading, spacing: 0) {
                KXSecLabel("Fahrerwertung") {
                    if let seasonID = resolvedSeasonID, !rankings.isEmpty {
                        NavigationLink {
                            DriversListView(league: league, seasonID: seasonID, onUpdate: onUpdate)
                        } label: {
                            Text("Alle \(rankings.count) ›")
                                .font(KX.Font.display(12, weight: .bold))
                                .tracking(0.8)
                                .textCase(.uppercase)
                                .foregroundStyle(KX.Color.green)
                        }
                        .buttonStyle(.plain)
                    }
                }
                if rankings.isEmpty {
                    emptyHint(text: "Noch keine Fahrer in dieser Saison.")
                } else {
                    KXCard {
                        VStack(spacing: 0) {
                            ForEach(Array(rankings.prefix(3).enumerated()), id: \.element.id) { index, ranking in
                                KXTowerRow(
                                    ranking: ranking,
                                    teamName: teamName(for: ranking.driver.currentTeamId),
                                    teamColor: teamColor(for: ranking.driver.currentTeamId, fallback: index),
                                    leaderPoints: rankings.first?.stats.totalPoints,
                                    showsDivider: index < min(rankings.count, 3) - 1
                                )
                                .onTapGesture {
                                    selectedDriverForDetail = ranking.driver
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding(.bottom, 22)
        }
    }

    @ViewBuilder
    private var racesSection: some View {
        if let season = selectedSeason {
            let races = season.races.sorted(by: { $0.date > $1.date })
            VStack(alignment: .leading, spacing: 0) {
                KXSecLabel("Rennkalender") {
                    Button {
                        showingNewRaceSheet = true
                    } label: {
                        Text("+ Rennen")
                            .font(KX.Font.display(12, weight: .bold))
                            .tracking(0.8)
                            .textCase(.uppercase)
                            .foregroundStyle(KX.Color.green)
                    }
                    .buttonStyle(.plain)
                }
                if races.isEmpty {
                    emptyHint(text: "Noch keine Rennen in dieser Saison.")
                } else {
                    VStack(spacing: 10) {
                        ForEach(Array(races.enumerated()), id: \.element.id) { idx, race in
                            NavigationLink {
                                RaceDetailView(
                                    race: race,
                                    availableTracks: league.tracks,
                                    availableDrivers: season.drivers,
                                    teams: league.teams,
                                    onUpdate: { handleUpdateRace($0) },
                                    onDelete: { handleDeleteRace(race.id) }
                                )
                            } label: {
                                RaceCard(
                                    race: race,
                                    roundNumber: races.count - idx,
                                    winnerName: winnerName(in: race, drivers: season.drivers),
                                    winnerTeamColor: winnerTeamColor(in: race, drivers: season.drivers)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, 16)
                }
            }
            .padding(.bottom, 22)
        }
    }

    @ViewBuilder
    private var teamStandingsSection: some View {
        if let season = selectedSeason {
            let standings = TeamRankingService.standings(in: season, teams: league.teams)
            VStack(alignment: .leading, spacing: 0) {
                KXSecLabel("Team-Standings")
                KXCard {
                    VStack(spacing: 0) {
                        ForEach(Array(standings.enumerated()), id: \.element.id) { idx, standing in
                            TeamStandingRow(
                                standing: standing,
                                color: teamColor(for: standing.team.id, fallback: idx),
                                showsDivider: idx < standings.count - 1
                            )
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
            .padding(.bottom, 22)
        }
    }

    private func emptyHint(text: String) -> some View {
        Text(text)
            .font(KX.Font.ui(12))
            .foregroundStyle(KX.Color.faint)
            .padding(.horizontal, 18)
            .padding(.bottom, 4)
    }

    // MARK: - Helpers

    private func teamName(for id: UUID?) -> String? {
        guard let id else { return nil }
        return league.teams.first(where: { $0.id == id })?.name
    }

    private let teamPalette: [Color] = [
        KX.Color.green, KX.Color.purple, KX.Color.blue,
        KX.Color.orange, KX.Color.red, KX.Color.gold
    ]

    private func teamColor(for id: UUID?, fallback index: Int) -> Color {
        guard let id, let teamIdx = league.teams.firstIndex(where: { $0.id == id }) else {
            return teamPalette[index % teamPalette.count]
        }
        return teamPalette[teamIdx % teamPalette.count]
    }

    private func winnerName(in race: Race, drivers: [Driver]) -> String? {
        guard let winner = race.results.filter({ !$0.dnf }).sorted(by: { $0.position < $1.position }).first else { return nil }
        if winner.driverId == Driver.unknownDriverSentinelID { return Driver.unknownDriverName }
        return drivers.first(where: { $0.id == winner.driverId })?.name
    }

    private func winnerTeamColor(in race: Race, drivers: [Driver]) -> Color {
        guard let winner = race.results.filter({ !$0.dnf }).sorted(by: { $0.position < $1.position }).first else {
            return KX.Color.faint
        }
        return teamColor(for: winner.teamId, fallback: 0)
    }

    // MARK: - Actions

    private func setSelectedSeasonActive() {
        guard let id = resolvedSeasonID else { return }
        if let updated = try? SeasonService.setActiveSeason(id, in: league) {
            onUpdate(updated)
        }
    }

    private func deleteSelectedSeason() {
        guard let id = resolvedSeasonID else { return }
        if let updated = try? SeasonService.deleteSeason(id, from: league) {
            onUpdate(updated)
            selectedSeasonID = updated.seasons.first(where: \.isActive)?.id ?? updated.seasons.first?.id
        }
    }

    private func handleAddRace(_ race: Race) {
        guard let seasonID = resolvedSeasonID else { return }
        do {
            let updated = try RaceService.addRace(to: league, in: seasonID, race: race)
            onUpdate(updated)
        } catch let error as RaceService.RaceError {
            raceErrorMessage = RaceErrorFormatter.message(for: error)
        } catch {
            raceErrorMessage = "Fehler: \(error)"
        }
    }

    private func handleUpdateRace(_ race: Race) {
        guard let seasonID = resolvedSeasonID else { return }
        do {
            let updated = try RaceService.updateRace(race, in: league, season: seasonID)
            onUpdate(updated)
        } catch let error as RaceService.RaceError {
            raceErrorMessage = RaceErrorFormatter.message(for: error)
        } catch {
            raceErrorMessage = "Fehler: \(error)"
        }
    }

    private func handleDeleteRace(_ raceID: UUID) {
        guard let seasonID = resolvedSeasonID else { return }
        do {
            let updated = try RaceService.deleteRace(raceID, in: league, season: seasonID)
            onUpdate(updated)
        } catch let error as RaceService.RaceError {
            raceErrorMessage = RaceErrorFormatter.message(for: error)
        } catch {
            raceErrorMessage = "Fehler: \(error)"
        }
    }

    private var raceErrorBinding: Binding<Bool> {
        Binding(
            get: { raceErrorMessage != nil },
            set: { if !$0 { raceErrorMessage = nil } }
        )
    }
}

// MARK: - KXTowerRow (F1 Timing-Tower Stil)

struct KXTowerRow: View {
    let ranking: DriverRanking
    let teamName: String?
    let teamColor: Color
    let leaderPoints: Int?
    let showsDivider: Bool

    private var gap: Int {
        guard let leaderPoints else { return 0 }
        return leaderPoints - ranking.stats.totalPoints
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                KXPosChip(position: ranking.rank)
                RoundedRectangle(cornerRadius: 2)
                    .fill(teamColor)
                    .frame(width: 3, height: 34)
                VStack(alignment: .leading, spacing: 2) {
                    Text(ranking.driver.name.uppercased())
                        .font(KX.Font.display(18.5, weight: .bold))
                        .tracking(0.2)
                        .foregroundStyle(KX.Color.text)
                        .lineLimit(1)
                    HStack(spacing: 7) {
                        if ranking.driver.number > 0 {
                            Text("#\(ranking.driver.number)")
                                .font(KX.Font.mono(11))
                                .foregroundStyle(KX.Color.dim)
                        }
                        Circle()
                            .fill(teamColor)
                            .frame(width: 4, height: 4)
                        if let teamName {
                            Text(teamName)
                                .font(KX.Font.ui(11.5, weight: .medium))
                                .tracking(0.2)
                                .foregroundStyle(KX.Color.faint)
                                .lineLimit(1)
                        }
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 3) {
                    HStack(alignment: .lastTextBaseline, spacing: 3) {
                        Text("\(ranking.stats.totalPoints)")
                            .font(KX.Font.mono(19, weight: .bold))
                            .foregroundStyle(KX.Color.text)
                        Text("PKT")
                            .font(KX.Font.ui(9, weight: .semibold))
                            .tracking(0.5)
                            .foregroundStyle(KX.Color.faint)
                    }
                    HStack(spacing: 8) {
                        if ranking.stats.wins > 0 {
                            Text("\(ranking.stats.wins)★")
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

// MARK: - RaceCard

private struct RaceCard: View {
    let race: Race
    let roundNumber: Int
    let winnerName: String?
    let winnerTeamColor: Color

    var body: some View {
        KXCard {
            HStack(spacing: 13) {
                VStack(spacing: 0) {
                    Text("RD")
                        .font(KX.Font.ui(8, weight: .semibold))
                        .tracking(1.0)
                        .foregroundStyle(KX.Color.faint)
                    Text(String(format: "%02d", roundNumber))
                        .font(KX.Font.display(24, weight: .heavy, italic: true))
                        .foregroundStyle(KX.Color.text)
                }
                .frame(width: 34)
                Rectangle().fill(KX.Color.line).frame(width: 1, height: 32)
                VStack(alignment: .leading, spacing: 2) {
                    Text(race.track.uppercased())
                        .font(KX.Font.display(17, weight: .bold))
                        .foregroundStyle(KX.Color.text)
                        .lineLimit(1)
                    HStack(spacing: 6) {
                        Image(systemName: "trophy.fill")
                            .font(.system(size: 9))
                            .foregroundStyle(winnerTeamColor)
                        Text(winnerName ?? "—")
                            .font(KX.Font.ui(11.5, weight: .semibold))
                            .foregroundStyle(KX.Color.dim)
                            .lineLimit(1)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 6) {
                    Text(race.date.formatted(.dateTime.day().month(.abbreviated)).uppercased())
                        .font(KX.Font.mono(10.5, weight: .semibold))
                        .foregroundStyle(KX.Color.faint)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
        }
    }
}

// MARK: - TeamStandingRow

private struct TeamStandingRow: View {
    let standing: TeamStanding
    let color: Color
    let showsDivider: Bool

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 12) {
                KXPosChip(position: standing.rank, size: 28, fontSize: 14)
                RoundedRectangle(cornerRadius: 2)
                    .fill(color)
                    .frame(width: 3, height: 28)
                VStack(alignment: .leading, spacing: 2) {
                    Text(standing.team.name.uppercased())
                        .font(KX.Font.display(16, weight: .bold))
                        .foregroundStyle(KX.Color.text)
                    Text("\(standing.raceEntries) Einsätze · \(standing.wins) Siege")
                        .font(KX.Font.ui(10.5))
                        .foregroundStyle(KX.Color.faint)
                }
                Spacer()
                HStack(alignment: .lastTextBaseline, spacing: 3) {
                    Text("\(standing.totalPoints)")
                        .font(KX.Font.mono(17, weight: .bold))
                        .foregroundStyle(KX.Color.text)
                    Text("PKT")
                        .font(KX.Font.ui(9, weight: .semibold))
                        .tracking(0.5)
                        .foregroundStyle(KX.Color.faint)
                }
            }
            .padding(.horizontal, 14)
            .frame(height: 52)
            if showsDivider {
                Rectangle().fill(KX.Color.line).frame(height: 1)
            }
        }
    }
}

// MARK: - KXIconBtnContent (für Menu/ShareLink ohne Action)

struct KXIconBtnContent<Content: View>: View {
    @ViewBuilder var icon: () -> Content
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 11, style: .continuous)
                .fill(KX.Color.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: 11, style: .continuous)
                        .stroke(KX.Color.line, lineWidth: 1)
                )
            icon().foregroundStyle(KX.Color.text)
        }
        .frame(width: 38, height: 38)
    }
}

#Preview {
    NavigationStack {
        LeagueDetailView(
            league: League(
                name: "Rheinland Kart Cup",
                description: "Indoor-Serie",
                tracks: ["Kart Arena Köln", "SpeedZone Bonn", "RaceHall Aachen"],
                teams: [Team(name: "Apex Racing"), Team(name: "Velocity"), Team(name: "Nordwind")],
                seasons: [
                    Season(name: "Saison 2026", startDate: Date(), isActive: true, drivers: [
                        Driver(name: "L. Brandt", number: 7),
                        Driver(name: "M. Vogel", number: 22),
                        Driver(name: "J. Keller", number: 3)
                    ])
                ]
            ),
            onUpdate: { _ in },
            onDelete: { _ in },
            onBack: {}
        )
    }
    .preferredColorScheme(.dark)
}

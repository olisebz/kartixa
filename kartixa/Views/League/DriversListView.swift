import SwiftUI

struct DriversListView: View {
    let league: League
    let seasonID: UUID
    var onUpdate: (League) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var formMode: DriverFormMode?
    @State private var detailDriver: Driver?
    @State private var driverToDelete: Driver?
    @State private var errorMessage: String?

    private var season: Season? {
        league.seasons.first(where: { $0.id == seasonID })
    }

    private var rankings: [DriverRanking] {
        guard let season else { return [] }
        return DriverRankingService.rankings(in: season).filter { !$0.driver.isUnknownDriver }
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

    private func teamName(for id: UUID?) -> String? {
        guard let id else { return nil }
        return league.teams.first(where: { $0.id == id })?.name
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                KXDetailHeader(title: "Wertung", onBack: { dismiss() }) {
                    KXIconBtn(filled: true, action: { formMode = .add }) {
                        Image(systemName: "plus")
                            .font(.system(size: 16, weight: .heavy))
                    }
                }

                hero
                    .padding(.horizontal, 18)
                    .padding(.bottom, 14)

                if rankings.isEmpty {
                    emptyState
                } else {
                    leaderSpotlight
                        .padding(.horizontal, 16)
                        .padding(.bottom, 18)

                    chasersSection
                }

                Color.clear.frame(height: 28)
            }
        }
        .scrollIndicators(.hidden)
        .kxBackground()
        .toolbar(.hidden, for: .navigationBar)
        .sheet(item: $formMode) { mode in
            DriverFormSheet(
                mode: mode,
                teams: league.teams,
                existingDriverNames: existingNamesExcluding(mode)
            ) { name, number, teamId in
                try handleSave(mode: mode, name: name, number: number, teamId: teamId)
            }
            .presentationDetents([.medium, .large])
            .preferredColorScheme(.dark)
        }
        .sheet(item: $detailDriver) { driver in
            if let season {
                DriverDetailSheet(driver: driver, season: season, teams: league.teams)
                    .preferredColorScheme(.dark)
            }
        }
        .alert("Fahrer löschen?", isPresented: deleteAlertBinding) {
            Button("Löschen", role: .destructive) {
                if let driver = driverToDelete { deleteDriver(driver) }
                driverToDelete = nil
            }
            Button("Abbrechen", role: .cancel) { driverToDelete = nil }
        } message: {
            if let driver = driverToDelete {
                Text("„\(driver.name)“ wird aus dieser Saison entfernt.")
            }
        }
        .alert("Fehler", isPresented: errorAlertBinding, presenting: errorMessage) { _ in
            Button("OK") { errorMessage = nil }
        } message: { message in
            Text(message)
        }
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 0) {
                Text("FAHRER")
                    .foregroundStyle(KX.Color.text)
                Text("WERTUNG")
                    .foregroundStyle(KX.Color.green)
            }
            .font(KX.Font.display(38, weight: .heavy))
            .tracking(-0.3)
            .lineLimit(1)
            .minimumScaleFactor(0.7)

            if let season {
                Text("\(league.name.uppercased()) · \(season.name.uppercased())")
                    .font(KX.Font.mono(11, weight: .semibold))
                    .tracking(0.5)
                    .foregroundStyle(KX.Color.dim)
                    .lineLimit(1)
            }
        }
    }

    private var leaderSpotlight: some View {
        Group {
            if let leader = rankings.first {
                KXCard(accent: KX.Color.gold) {
                    VStack(spacing: 0) {
                        HStack(alignment: .center, spacing: 10) {
                            KXPosChip(position: 1, size: 42, fontSize: 24)
                            VStack(alignment: .leading, spacing: 4) {
                                HStack(spacing: 8) {
                                    Text(leader.driver.name.uppercased())
                                        .font(KX.Font.display(25, weight: .heavy))
                                        .foregroundStyle(KX.Color.text)
                                        .lineLimit(1)
                                    if leader.driver.number > 0 {
                                        Text("#\(leader.driver.number)")
                                            .font(KX.Font.mono(12))
                                            .foregroundStyle(KX.Color.dim)
                                    }
                                }
                                HStack(spacing: 6) {
                                    Rectangle()
                                        .fill(teamColor(for: leader.driver.currentTeamId, fallback: 0))
                                        .frame(width: 8, height: 8)
                                    if let team = teamName(for: leader.driver.currentTeamId) {
                                        Text(team)
                                            .font(KX.Font.ui(12, weight: .semibold))
                                            .foregroundStyle(KX.Color.dim)
                                    }
                                    Text("· TITELFÜHREND")
                                        .font(KX.Font.display(10.5, weight: .bold))
                                        .tracking(1.0)
                                        .foregroundStyle(KX.Color.gold)
                                }
                            }
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("\(leader.stats.totalPoints)")
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
                            leaderStat(label: "Siege", value: "\(leader.stats.wins)", accent: KX.Color.gold)
                            leaderStat(label: "Schn. Rd.", value: "\(leader.stats.fastestLaps)")
                            leaderStat(label: "Rennen", value: "\(leader.stats.racesStarted)")
                            leaderStat(label: "Ø Pkt.", value: leader.stats.racesStarted > 0
                                       ? String(format: "%.1f", leader.stats.avgPointsPerRace)
                                       : "—")
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 12)
                    }
                }
            }
        }
    }

    private func leaderStat(label: LocalizedStringKey, value: String, accent: Color? = nil) -> some View {
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

    private var chasersSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            KXSecLabel("Verfolger")
            let leaderPoints = rankings.first?.stats.totalPoints
            let chasers = Array(rankings.dropFirst())
            KXCard {
                VStack(spacing: 0) {
                    ForEach(Array(chasers.enumerated()), id: \.element.id) { idx, ranking in
                        Button {
                            detailDriver = ranking.driver
                        } label: {
                            KXTowerRow(
                                ranking: ranking,
                                teamName: teamName(for: ranking.driver.currentTeamId),
                                teamColor: teamColor(for: ranking.driver.currentTeamId, fallback: idx + 1),
                                leaderPoints: leaderPoints,
                                showsDivider: idx < chasers.count - 1
                            )
                        }
                        .buttonStyle(.plain)
                        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                            Button(role: .destructive) {
                                attemptDelete(ranking)
                            } label: {
                                Label("Löschen", systemImage: "trash")
                            }
                            Button {
                                formMode = .edit(ranking.driver)
                            } label: {
                                Label("Bearbeiten", systemImage: "pencil")
                            }
                            .tint(.blue)
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 48, weight: .regular))
                .foregroundStyle(KX.Color.faint)
            Text("Keine Fahrer")
                .font(KX.Font.display(22, weight: .heavy))
                .foregroundStyle(KX.Color.text)
            Text("Lege Fahrer für diese Saison an.")
                .font(KX.Font.ui(14))
                .foregroundStyle(KX.Color.dim)
            Button {
                formMode = .add
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                    Text("Fahrer hinzufügen")
                        .font(KX.Font.display(14, weight: .bold))
                        .tracking(0.8)
                        .textCase(.uppercase)
                }
                .foregroundStyle(KX.Color.onGreen)
                .padding(.horizontal, 18)
                .padding(.vertical, 11)
                .background(KX.Color.green, in: Capsule())
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 30)
        .padding(.top, 60)
    }

    // MARK: - Actions

    private func attemptDelete(_ ranking: DriverRanking) {
        if ranking.stats.racesStarted > 0 {
            errorMessage = "Fahrer mit Rennergebnissen können nicht gelöscht werden."
        } else {
            driverToDelete = ranking.driver
        }
    }

    private func deleteDriver(_ driver: Driver) {
        do {
            let updated = try DriverService.deleteDriver(driver.id, in: league, season: seasonID)
            onUpdate(updated)
        } catch DriverService.DriverError.driverHasRaceResults {
            errorMessage = "Fahrer mit Rennergebnissen können nicht gelöscht werden."
        } catch {
            errorMessage = "Fehler beim Löschen: \(error)"
        }
    }

    private func handleSave(mode: DriverFormMode, name: String, number: Int, teamId: UUID?) throws {
        switch mode {
        case .add:
            let updated = try DriverService.addDriver(
                to: league, in: seasonID,
                name: name, number: number, teamId: teamId
            )
            onUpdate(updated)
        case .edit(let driver):
            let updated = try DriverService.updateDriver(
                driver.id, in: league, season: seasonID,
                name: name, number: number, teamId: teamId
            )
            onUpdate(updated)
        }
    }

    private func existingNamesExcluding(_ mode: DriverFormMode) -> [String] {
        let allNames = season?.drivers.map(\.name) ?? []
        switch mode {
        case .add:
            return allNames
        case .edit(let driver):
            return season?.drivers.filter { $0.id != driver.id }.map(\.name) ?? []
        }
    }

    private var deleteAlertBinding: Binding<Bool> {
        Binding(
            get: { driverToDelete != nil },
            set: { if !$0 { driverToDelete = nil } }
        )
    }

    private var errorAlertBinding: Binding<Bool> {
        Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )
    }
}

#Preview {
    let league = League(
        name: "Rheinland Kart Cup",
        tracks: ["Track A"],
        teams: [Team(name: "Apex Racing"), Team(name: "Velocity")],
        seasons: [
            Season(name: "Saison 2026", startDate: Date(), isActive: true, drivers: [
                Driver(name: "L. Brandt", number: 7),
                Driver(name: "M. Vogel", number: 22),
                Driver(name: "J. Keller", number: 3)
            ])
        ]
    )
    return NavigationStack {
        DriversListView(league: league, seasonID: league.seasons[0].id, onUpdate: { _ in })
    }
    .preferredColorScheme(.dark)
}

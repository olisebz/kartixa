import SwiftUI

struct LeagueListView: View {
    @State private var viewModel = LeagueListViewModel()
    @State private var path = NavigationPath()
    @State private var showingNewLeague = false
    @State private var leagueToDelete: League?
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack(path: $path) {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 0, pinnedViews: []) {
                    KXBrandBar {
                        KXIconBtn(filled: true, action: { showingNewLeague = true }) {
                            Image(systemName: "plus")
                                .font(.system(size: 18, weight: .heavy))
                        }
                    }

                    header
                        .padding(.horizontal, 18)
                        .padding(.bottom, 16)

                    if viewModel.leagues.isEmpty {
                        emptyState
                            .padding(.top, 60)
                    } else {
                        VStack(spacing: 13) {
                            ForEach(viewModel.leagues) { league in
                                Button {
                                    path.append(league.id)
                                } label: {
                                    LeagueCard(league: league)
                                }
                                .buttonStyle(.plain)
                                .contextMenu {
                                    Button(role: .destructive) {
                                        leagueToDelete = league
                                    } label: {
                                        Label("Liga löschen", systemImage: "trash")
                                    }
                                    ShareLink(item: league, preview: SharePreview(league.name)) {
                                        Label("Exportieren", systemImage: "square.and.arrow.up")
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                    }

                    Color.clear.frame(height: 24)
                }
            }
            .scrollIndicators(.hidden)
            .refreshable {
                viewModel.load()
            }
            .kxBackground()
            .toolbar(.hidden, for: .navigationBar)
            .navigationDestination(for: UUID.self) { leagueID in
                if let league = viewModel.leagues.first(where: { $0.id == leagueID }) {
                    LeagueDetailView(
                        league: league,
                        onUpdate: { viewModel.update($0) },
                        onDelete: { toDelete in
                            viewModel.delete(toDelete.id)
                            if !path.isEmpty { path.removeLast() }
                        },
                        onBack: { if !path.isEmpty { path.removeLast() } }
                    )
                } else {
                    Text("Liga nicht gefunden")
                        .foregroundStyle(KX.Color.dim)
                        .kxBackground()
                }
            }
            .sheet(isPresented: $showingNewLeague) {
                NewLeagueView { league in
                    if viewModel.create(league) {
                        path.append(league.id)
                    }
                }
            }
            .alert("Liga löschen?", isPresented: deleteAlertBinding) {
                Button("Löschen", role: .destructive) {
                    if let league = leagueToDelete {
                        viewModel.delete(league.id)
                    }
                    leagueToDelete = nil
                }
                Button("Abbrechen", role: .cancel) {
                    leagueToDelete = nil
                }
            } message: {
                if let league = leagueToDelete {
                    Text("„\(league.name)“ wird unwiderruflich gelöscht.")
                }
            }
            .onChange(of: scenePhase) { _, newPhase in
                if newPhase == .active {
                    viewModel.load()
                }
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(spacing: 0) {
                Text("RENN")
                    .foregroundStyle(KX.Color.text)
                Text("SERIEN")
                    .foregroundStyle(KX.Color.green)
            }
            .font(KX.Font.display(44, weight: .heavy))
            .tracking(-0.5)
            .lineLimit(1)

            Text(subtitleText)
                .font(KX.Font.mono(11.5, weight: .semibold))
                .tracking(0.5)
                .foregroundStyle(KX.Color.dim)
                .textCase(.uppercase)
        }
    }

    private var subtitleText: String {
        let activeCount = viewModel.leagues.reduce(0) { acc, league in
            acc + (league.seasons.contains(where: \.isActive) ? 1 : 0)
        }
        let year = Calendar.current.component(.year, from: Date())
        return String(format: "%02d aktiv · saison %d", activeCount, year)
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "flag.checkered")
                .font(.system(size: 48, weight: .regular))
                .foregroundStyle(KX.Color.faint)
            Text("Noch keine Serien")
                .font(KX.Font.display(22, weight: .heavy))
                .foregroundStyle(KX.Color.text)
            Text("Lege deine erste Liga an, um zu starten.")
                .font(KX.Font.ui(14))
                .foregroundStyle(KX.Color.dim)
                .multilineTextAlignment(.center)
            Button {
                showingNewLeague = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "plus")
                    Text("Neue Serie")
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
    }

    private var deleteAlertBinding: Binding<Bool> {
        Binding(
            get: { leagueToDelete != nil },
            set: { if !$0 { leagueToDelete = nil } }
        )
    }
}

private struct LeagueCard: View {
    let league: League

    private var activeSeason: Season? {
        league.seasons.first(where: \.isActive) ?? league.seasons.first
    }

    private var isLive: Bool {
        activeSeason?.isActive == true
    }

    private var accentColor: Color {
        isLive ? KX.Color.green : KX.Color.faint
    }

    private var driverCount: Int { activeSeason?.drivers.filter { !$0.isUnknownDriver }.count ?? 0 }
    private var raceCount: Int { activeSeason?.races.count ?? 0 }
    private var teamCount: Int { league.teams.filter(\.isActive).count }

    private var topRanking: DriverRanking? {
        guard let season = activeSeason else { return nil }
        return DriverRankingService.rankings(in: season).first
    }

    private var seasonLabel: String {
        guard let season = activeSeason else { return "—" }
        return season.name.uppercased()
    }

    var body: some View {
        KXCard(accent: accentColor) {
            VStack(alignment: .leading, spacing: 0) {
                VStack(alignment: .leading, spacing: 13) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(seasonLabel)
                            .font(KX.Font.ui(10, weight: .semibold))
                            .tracking(1.5)
                            .textCase(.uppercase)
                            .foregroundStyle(KX.Color.faint)
                        Spacer()
                        KXLiveBadge(isLive: isLive)
                    }

                    Text(league.name)
                        .font(KX.Font.display(26, weight: .heavy))
                        .foregroundStyle(KX.Color.text)
                        .textCase(.uppercase)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    HStack(spacing: 26) {
                        KXStat(label: "Fahrer", value: String(format: "%02d", driverCount))
                        KXStat(label: "Rennen", value: String(format: "%02d", raceCount))
                        KXStat(label: "Teams", value: String(format: "%02d", teamCount))
                    }
                }
                .padding(.horizontal, 15)
                .padding(.top, 13)
                .padding(.bottom, 13)

                if let ranking = topRanking {
                    HStack(spacing: 10) {
                        KXPosChip(position: 1, size: 26, fontSize: 14)
                        Text("Spitze")
                            .font(KX.Font.ui(10, weight: .semibold))
                            .tracking(1.0)
                            .textCase(.uppercase)
                            .foregroundStyle(KX.Color.faint)
                        Text(ranking.driver.name)
                            .font(KX.Font.display(16, weight: .bold))
                            .textCase(.uppercase)
                            .foregroundStyle(KX.Color.text)
                            .lineLimit(1)
                        Spacer()
                        Text("\(ranking.stats.totalPoints)")
                            .font(KX.Font.mono(15, weight: .bold))
                            .foregroundStyle(KX.Color.text)
                        Text("PKT")
                            .font(KX.Font.ui(9, weight: .semibold))
                            .tracking(0.5)
                            .foregroundStyle(KX.Color.faint)
                    }
                    .padding(.horizontal, 15)
                    .padding(.vertical, 10)
                    .background(KX.Color.surface2)
                    .overlay(
                        Rectangle().fill(KX.Color.line).frame(height: 1),
                        alignment: .top
                    )
                }
            }
        }
    }
}

#Preview {
    LeagueListView()
        .preferredColorScheme(.dark)
}

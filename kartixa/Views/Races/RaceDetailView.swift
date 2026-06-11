import SwiftUI

struct RaceDetailView: View {
    let race: Race
    let availableTracks: [String]
    let availableDrivers: [Driver]
    let teams: [Team]
    var onUpdate: (Race) -> Void
    var onDelete: () -> Void

    @Environment(\.dismiss) private var dismiss

    private var sortedResults: [RaceResult] {
        race.results.sorted(by: { $0.position < $1.position })
    }

    private var nonDNFResults: [RaceResult] {
        sortedResults.filter { !$0.dnf }
    }

    private var winner: RaceResult? { nonDNFResults.first }

    private var fastestLapResult: RaceResult? {
        sortedResults.first(where: { $0.fastestLap })
    }

    private var totalPoints: Int {
        sortedResults.reduce(0) { $0 + $1.points }
    }

    private let teamPalette: [Color] = [
        KX.Color.green, KX.Color.purple, KX.Color.blue,
        KX.Color.orange, KX.Color.red, KX.Color.gold
    ]

    private func teamColor(for id: UUID?) -> Color {
        guard let id, let idx = teams.firstIndex(where: { $0.id == id }) else {
            return KX.Color.faint
        }
        return teamPalette[idx % teamPalette.count]
    }

    private func driverName(for id: UUID) -> String {
        if id == Driver.unknownDriverSentinelID { return Driver.unknownDriverName }
        return availableDrivers.first(where: { $0.id == id })?.name ?? "—"
    }

    private func driverNumber(for id: UUID) -> Int {
        availableDrivers.first(where: { $0.id == id })?.number ?? 0
    }

    private func teamName(for id: UUID?) -> String? {
        guard let id else { return nil }
        return teams.first(where: { $0.id == id })?.name
    }

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 0) {
                KXDetailHeader(title: "Rennen", onBack: { dismiss() }) {
                    NavigationLink {
                        EditRaceView(
                            race: race,
                            availableTracks: availableTracks,
                            availableDrivers: availableDrivers,
                            onSave: onUpdate,
                            onDelete: onDelete
                        )
                    } label: {
                        KXIconBtnContent {
                            Image(systemName: "pencil")
                                .font(.system(size: 15, weight: .semibold))
                        }
                    }
                }

                hero
                    .padding(.horizontal, 18)
                    .padding(.bottom, 18)

                statStripCard
                    .padding(.horizontal, 16)
                    .padding(.bottom, 22)

                if nonDNFResults.count >= 3 {
                    podiumSection
                        .padding(.bottom, 22)
                }

                resultsSection

                Color.clear.frame(height: 28)
            }
        }
        .scrollIndicators(.hidden)
        .kxBackground()
        .toolbar(.hidden, for: .navigationBar)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                KXPill(text: "\(race.name)", color: KX.Color.green)
                Text(race.date.formatted(.dateTime.day().month(.abbreviated).year()).uppercased())
                    .font(KX.Font.mono(11, weight: .semibold))
                    .tracking(0.5)
                    .foregroundStyle(KX.Color.dim)
            }
            Text(race.track.uppercased())
                .font(KX.Font.display(36, weight: .heavy))
                .tracking(-0.3)
                .foregroundStyle(KX.Color.text)
                .lineLimit(3)
                .multilineTextAlignment(.leading)
        }
    }

    private var statStripCard: some View {
        KXCard {
            HStack(spacing: 0) {
                statCell(label: "Teilnehmer", value: "\(race.results.count)")
                divider
                statCell(label: "Punkte", value: "\(totalPoints)")
                divider
                statCell(
                    label: "Schn. Runde",
                    value: fastestLapResult.map { driverName(for: $0.driverId) } ?? "—",
                    accent: fastestLapResult == nil ? nil : KX.Color.purple
                )
            }
            .padding(.vertical, 12)
        }
    }

    private var divider: some View {
        Rectangle()
            .fill(KX.Color.line)
            .frame(width: 1)
            .padding(.vertical, 4)
    }

    private func statCell(label: LocalizedStringKey, value: String, accent: Color? = nil) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(KX.Font.mono(19, weight: .bold))
                .foregroundStyle(accent ?? KX.Color.text)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
            Text(label)
                .font(KX.Font.ui(9, weight: .semibold))
                .tracking(1.2)
                .textCase(.uppercase)
                .foregroundStyle(KX.Color.faint)
        }
        .frame(maxWidth: .infinity, alignment: .center)
    }

    private var podiumEntries: [PodiumEntry] {
        nonDNFResults.prefix(3).map { result in
            PodiumEntry(
                id: result.id,
                rank: result.position,
                driverName: driverName(for: result.driverId),
                teamName: teamName(for: result.teamId),
                teamColor: teamColor(for: result.teamId),
                points: result.points
            )
        }
    }

    private var podiumSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            KXSecLabel("Podium")
            KXCard {
                VStack(spacing: 0) {
                    PodiumView(entries: podiumEntries)
                        .padding(.top, 16)
                        .padding(.bottom, 0)
                    KXChecker(size: 7, height: 5, primary: KX.Color.lineHi)
                        .opacity(0.5)
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private var resultsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            KXSecLabel("Ergebnis")
            KXCard {
                VStack(spacing: 0) {
                    ForEach(Array(sortedResults.enumerated()), id: \.element.id) { index, result in
                        KXResultRow(
                            position: result.position,
                            dnf: result.dnf,
                            driverName: driverName(for: result.driverId),
                            driverNumber: driverNumber(for: result.driverId),
                            teamName: teamName(for: result.teamId),
                            teamColor: teamColor(for: result.teamId),
                            fastestLap: result.fastestLap,
                            points: result.points,
                            penaltyCount: result.penalties.count,
                            showsDivider: index < sortedResults.count - 1
                        )
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }
}

// MARK: - KXResultRow

struct KXResultRow: View {
    let position: Int
    let dnf: Bool
    let driverName: String
    let driverNumber: Int
    let teamName: String?
    let teamColor: Color
    let fastestLap: Bool
    let points: Int
    let penaltyCount: Int
    let showsDivider: Bool

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 11) {
                KXPosChip(position: position, dnf: dnf, size: 30, fontSize: 16)
                RoundedRectangle(cornerRadius: 2)
                    .fill(dnf ? KX.Color.faint : teamColor)
                    .frame(width: 3, height: 28)
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(driverName.uppercased())
                            .font(KX.Font.display(16.5, weight: .bold))
                            .foregroundStyle(KX.Color.text)
                            .lineLimit(1)
                        if fastestLap {
                            Image(systemName: "stopwatch.fill")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(KX.Color.purple)
                        }
                    }
                    HStack(spacing: 6) {
                        if driverNumber > 0 {
                            Text("#\(driverNumber)")
                                .font(KX.Font.mono(10))
                                .foregroundStyle(KX.Color.faint)
                        }
                        if let teamName {
                            Text(teamName)
                                .font(KX.Font.ui(10.5, weight: .medium))
                                .foregroundStyle(KX.Color.faint)
                                .lineLimit(1)
                        }
                        if penaltyCount > 0 {
                            Text("· \(penaltyCount) STRAFE\(penaltyCount == 1 ? "" : "N")")
                                .font(KX.Font.ui(9, weight: .semibold))
                                .tracking(0.5)
                                .foregroundStyle(KX.Color.orange)
                        }
                    }
                }
                Spacer()
                HStack(alignment: .lastTextBaseline, spacing: 3) {
                    Text("\(points)")
                        .font(KX.Font.mono(17, weight: .bold))
                        .foregroundStyle(dnf ? KX.Color.faint : KX.Color.text)
                    Text("PKT")
                        .font(KX.Font.ui(9, weight: .semibold))
                        .tracking(0.5)
                        .foregroundStyle(KX.Color.faint)
                }
            }
            .padding(.horizontal, 14)
            .frame(height: 52)
            .opacity(dnf ? 0.65 : 1)
            if showsDivider {
                Rectangle().fill(KX.Color.line).frame(height: 1)
            }
        }
    }
}

#Preview {
    NavigationStack {
        RaceDetailView(
            race: Race(
                name: "RD 07",
                track: "Kart Arena Köln",
                date: Date(),
                results: [
                    RaceResult(driverId: UUID(), teamId: nil, position: 1, points: 25, lapTime: "41.118", fastestLap: false),
                    RaceResult(driverId: UUID(), teamId: nil, position: 2, points: 18, lapTime: "41.402"),
                    RaceResult(driverId: UUID(), teamId: nil, position: 3, points: 15, lapTime: "41.633")
                ]
            ),
            availableTracks: ["Kart Arena Köln"],
            availableDrivers: [],
            teams: [],
            onUpdate: { _ in },
            onDelete: {}
        )
    }
    .preferredColorScheme(.dark)
}

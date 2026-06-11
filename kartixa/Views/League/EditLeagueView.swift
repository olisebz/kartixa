import SwiftUI

struct EditLeagueView: View {
    let league: League
    var onSave: (League) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var leagueDescription: String
    @State private var tracks: [DraftTrack]
    @State private var teams: [Team]

    init(league: League, onSave: @escaping (League) -> Void) {
        self.league = league
        self.onSave = onSave
        _name = State(initialValue: league.name)
        _leagueDescription = State(initialValue: league.description)
        _tracks = State(initialValue: league.tracks.map { DraftTrack(name: $0) })
        _teams = State(initialValue: league.teams)
    }

    var body: some View {
        Form {
            Section("Liga") {
                TextField("Name", text: $name)
                TextField("Beschreibung (optional)", text: $leagueDescription, axis: .vertical)
                    .lineLimit(1...4)
            }

            Section {
                ForEach($tracks) { $track in
                    TextField("Streckenname", text: $track.name)
                }
                .onDelete { offsets in
                    tracks.remove(atOffsets: offsets)
                }
                Button {
                    tracks.append(DraftTrack())
                } label: {
                    Label("Strecke hinzufügen", systemImage: "plus")
                }
            } header: {
                Text("Strecken")
            } footer: {
                Text("Mind. 1 Strecke erforderlich.")
            }

            Section("Teams") {
                ForEach($teams) { $team in
                    HStack {
                        TextField("Team-Name", text: $team.name)
                        Toggle("Aktiv", isOn: $team.isActive)
                            .labelsHidden()
                    }
                }
                .onDelete { offsets in
                    teams.remove(atOffsets: offsets)
                }
                Button {
                    teams.append(Team(name: ""))
                } label: {
                    Label("Team hinzufügen", systemImage: "plus")
                }
            }

            Section("Info") {
                LabeledContent("Angelegt", value: league.createdAt.formatted(date: .abbreviated, time: .omitted))
                LabeledContent("Fahrer gesamt", value: "\(totalDrivers)")
                LabeledContent("Rennen gesamt", value: "\(totalRaces)")
            }
        }
        .navigationTitle("Liga bearbeiten")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Speichern") { save() }
                    .disabled(!isValid)
            }
        }
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var cleanTrackNames: [String] {
        tracks.map { $0.name.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    private var totalDrivers: Int {
        league.seasons.reduce(0) { $0 + $1.drivers.count }
    }

    private var totalRaces: Int {
        league.seasons.reduce(0) { $0 + $1.races.count }
    }

    private var isValid: Bool {
        !trimmedName.isEmpty && !cleanTrackNames.isEmpty
    }

    private func save() {
        var updated = league
        updated.name = trimmedName
        updated.description = leagueDescription.trimmingCharacters(in: .whitespacesAndNewlines)
        updated.tracks = cleanTrackNames
        updated.teams = teams
            .map { team -> Team in
                var t = team
                t.name = t.name.trimmingCharacters(in: .whitespacesAndNewlines)
                return t
            }
            .filter { !$0.name.isEmpty }
        updated.updatedAt = Date()
        onSave(updated)
        dismiss()
    }
}

private struct DraftTrack: Identifiable {
    let id = UUID()
    var name: String = ""
}

#Preview {
    NavigationStack {
        EditLeagueView(
            league: League(
                name: "Friday Karts",
                description: "Indoor",
                tracks: ["Kart Arena"],
                teams: [Team(name: "Red")]
            ),
            onSave: { _ in }
        )
    }
}

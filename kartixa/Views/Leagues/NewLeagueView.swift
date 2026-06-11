import SwiftUI

struct NewLeagueView: View {
    let onCreate: (League) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String = ""
    @State private var leagueDescription: String = ""
    @State private var tracks: [DraftTrack] = [DraftTrack()]
    @State private var teams: [DraftTeam] = []
    @State private var drivers: [DraftDriver] = [DraftDriver()]

    var body: some View {
        NavigationStack {
            Form {
                Section("Liga") {
                    TextField("Name", text: $name)
                    TextField("Beschreibung (optional)", text: $leagueDescription, axis: .vertical)
                        .lineLimit(1...4)
                }

                Section {
                    ForEach($drivers) { $driver in
                        HStack {
                            TextField("Name", text: $driver.name)
                            TextField("Nr.", value: $driver.number, format: .number)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 60)
                        }
                    }
                    .onDelete { offsets in
                        drivers.remove(atOffsets: offsets)
                        if drivers.isEmpty { drivers.append(DraftDriver()) }
                    }
                    Button {
                        drivers.append(DraftDriver())
                    } label: {
                        Label("Fahrer hinzufügen", systemImage: "plus")
                    }
                } header: {
                    Text("Fahrer")
                } footer: {
                    Text("Mind. 1 Fahrer erforderlich. Wird der Initial-Saison zugeordnet.")
                }

                Section("Teams (optional)") {
                    ForEach($teams) { $team in
                        TextField("Team-Name", text: $team.name)
                    }
                    .onDelete { offsets in
                        teams.remove(atOffsets: offsets)
                    }
                    Button {
                        teams.append(DraftTeam())
                    } label: {
                        Label("Team hinzufügen", systemImage: "plus")
                    }
                }

                Section {
                    ForEach($tracks) { $track in
                        TextField("Streckenname", text: $track.name)
                    }
                    .onDelete { offsets in
                        tracks.remove(atOffsets: offsets)
                        if tracks.isEmpty { tracks.append(DraftTrack()) }
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
            }
            .navigationTitle("Neue Liga")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Erstellen") { save() }
                        .disabled(!isValid)
                }
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

    private var cleanDriverDrafts: [DraftDriver] {
        drivers.filter { !$0.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
    }

    private var isValid: Bool {
        !trimmedName.isEmpty
            && !cleanTrackNames.isEmpty
            && !cleanDriverDrafts.isEmpty
    }

    private func save() {
        let resolvedDrivers = cleanDriverDrafts.map {
            Driver(
                name: $0.name.trimmingCharacters(in: .whitespacesAndNewlines),
                number: $0.number
            )
        }
        let resolvedTeams = teams
            .map { Team(name: $0.name.trimmingCharacters(in: .whitespacesAndNewlines)) }
            .filter { !$0.name.isEmpty }

        let initialSeason = Season(
            name: "Saison \(Calendar.current.component(.year, from: Date()))",
            startDate: Date(),
            isActive: true,
            drivers: resolvedDrivers
        )

        let league = League(
            name: trimmedName,
            description: leagueDescription.trimmingCharacters(in: .whitespacesAndNewlines),
            tracks: cleanTrackNames,
            teams: resolvedTeams,
            seasons: [initialSeason]
        )

        onCreate(league)
        dismiss()
    }
}

private struct DraftDriver: Identifiable {
    let id = UUID()
    var name: String = ""
    var number: Int = 0
}

private struct DraftTeam: Identifiable {
    let id = UUID()
    var name: String = ""
}

private struct DraftTrack: Identifiable {
    let id = UUID()
    var name: String = ""
}

#Preview {
    NewLeagueView { _ in }
}

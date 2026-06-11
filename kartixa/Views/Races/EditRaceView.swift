import SwiftUI

struct EditRaceView: View {
    let race: Race
    let availableTracks: [String]
    let availableDrivers: [Driver]
    var onSave: (Race) -> Void
    var onDelete: () -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: RaceFormViewModel
    @State private var penaltiesIndex: PenaltiesIndex?
    @State private var errorMessage: String?
    @State private var showingDeleteAlert = false

    init(
        race: Race,
        availableTracks: [String],
        availableDrivers: [Driver],
        onSave: @escaping (Race) -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.race = race
        self.availableTracks = availableTracks
        self.availableDrivers = availableDrivers
        self.onSave = onSave
        self.onDelete = onDelete
        _viewModel = State(initialValue: RaceFormViewModel(
            mode: .edit(race),
            availableTracks: availableTracks,
            availableDrivers: availableDrivers
        ))
    }

    var body: some View {
        RaceFormView(
            viewModel: viewModel,
            onShowPenalties: { index in
                penaltiesIndex = PenaltiesIndex(value: index)
            },
            dangerZone: { showingDeleteAlert = true }
        )
        .navigationTitle("Rennen bearbeiten")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Speichern") { save() }
                    .foregroundStyle(KX.Color.green)
                    .fontWeight(.bold)
            }
        }
        .toolbarBackground(KX.Color.bg, for: .navigationBar)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .sheet(item: $penaltiesIndex) { box in
            PenaltySheet(penalties: Binding(
                get: { viewModel.results[box.value].penalties },
                set: { viewModel.results[box.value].penalties = $0 }
            ))
            .preferredColorScheme(.dark)
        }
        .alert("Rennen löschen?", isPresented: $showingDeleteAlert) {
            Button("Löschen", role: .destructive) {
                onDelete()
                dismiss()
            }
            Button("Abbrechen", role: .cancel) {}
        } message: {
            Text("„\(race.name)“ und alle Ergebnisse werden unwiderruflich gelöscht.")
        }
        .alert("Fehler", isPresented: errorBinding, presenting: errorMessage) { _ in
            Button("OK") { errorMessage = nil }
        } message: { msg in
            Text(msg)
        }
    }

    private func save() {
        do {
            let updatedRace = try viewModel.build()
            onSave(updatedRace)
            dismiss()
        } catch let error as RaceService.RaceError {
            errorMessage = RaceErrorFormatter.message(for: error)
        } catch {
            errorMessage = "Fehler: \(error)"
        }
    }

    private var errorBinding: Binding<Bool> {
        Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )
    }
}

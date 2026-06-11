import SwiftUI

struct NewRaceView: View {
    let availableTracks: [String]
    let availableDrivers: [Driver]
    var onCreate: (Race) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: RaceFormViewModel
    @State private var penaltiesIndex: PenaltiesIndex?
    @State private var errorMessage: String?

    init(
        availableTracks: [String],
        availableDrivers: [Driver],
        onCreate: @escaping (Race) -> Void
    ) {
        self.availableTracks = availableTracks
        self.availableDrivers = availableDrivers
        self.onCreate = onCreate
        _viewModel = State(initialValue: RaceFormViewModel(
            mode: .create,
            availableTracks: availableTracks,
            availableDrivers: availableDrivers
        ))
    }

    var body: some View {
        NavigationStack {
            RaceFormView(
                viewModel: viewModel,
                onShowPenalties: { index in
                    penaltiesIndex = PenaltiesIndex(value: index)
                }
            )
            .navigationTitle("Neues Rennen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }
                        .foregroundStyle(KX.Color.dim)
                }
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
            .alert("Fehler", isPresented: errorBinding, presenting: errorMessage) { _ in
                Button("OK") { errorMessage = nil }
            } message: { msg in
                Text(msg)
            }
        }
    }

    private func save() {
        do {
            let race = try viewModel.build()
            onCreate(race)
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

struct PenaltiesIndex: Identifiable {
    let value: Int
    var id: Int { value }
}

enum RaceErrorFormatter {
    static func message(for error: RaceService.RaceError) -> String {
        switch error {
        case .nameEmpty: "Der Rennname darf nicht leer sein."
        case .trackEmpty: "Eine Strecke ist erforderlich."
        case .noResults: "Mindestens ein Ergebnis-Eintrag wird benötigt."
        case .unselectedDriver(let i): "Zeile \(i + 1): Bitte einen Fahrer auswählen."
        case .multipleFastestLaps: "Nur ein Fahrer darf die schnellste Runde haben."
        case .duplicateDriver: "Ein Fahrer kann nicht mehrfach in einem Rennen vorkommen."
        case .seasonNotFound: "Saison wurde nicht gefunden."
        case .raceNotFound: "Rennen wurde nicht gefunden."
        }
    }
}

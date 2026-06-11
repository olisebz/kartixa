import SwiftUI

enum DriverFormMode: Identifiable {
    case add
    case edit(Driver)

    var id: String {
        switch self {
        case .add: "add"
        case .edit(let driver): driver.id.uuidString
        }
    }
}

struct DriverFormSheet: View {
    let mode: DriverFormMode
    let teams: [Team]
    let existingDriverNames: [String]
    var onSave: (_ name: String, _ number: Int, _ teamId: UUID?) throws -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String
    @State private var number: Int
    @State private var teamId: UUID?
    @State private var errorMessage: String?

    init(
        mode: DriverFormMode,
        teams: [Team],
        existingDriverNames: [String],
        onSave: @escaping (String, Int, UUID?) throws -> Void
    ) {
        self.mode = mode
        self.teams = teams
        self.existingDriverNames = existingDriverNames
        self.onSave = onSave

        switch mode {
        case .add:
            _name = State(initialValue: "")
            _number = State(initialValue: 1)
            _teamId = State(initialValue: nil)
        case .edit(let driver):
            _name = State(initialValue: driver.name)
            _number = State(initialValue: max(driver.number, 1))
            _teamId = State(initialValue: driver.currentTeamId)
        }
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $name)
                    HStack {
                        Text("Nummer")
                        Spacer()
                        TextField("Nr.", value: $number, format: .number)
                            .multilineTextAlignment(.trailing)
                            .keyboardType(.numberPad)
                            .frame(width: 80)
                    }
                } footer: {
                    Text("Nummer zwischen 1 und 999.")
                }

                Section("Team") {
                    Picker("Team", selection: $teamId) {
                        Text("Kein Team").tag(UUID?.none)
                        ForEach(teams.filter(\.isActive)) { team in
                            Text(team.name).tag(team.id as UUID?)
                        }
                    }
                }

                if nameAlreadyExists {
                    Section {
                        Label("Ein Fahrer mit diesem Namen existiert bereits.", systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.orange)
                    }
                }

                if let errorMessage {
                    Section {
                        Label(errorMessage, systemImage: "xmark.circle")
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Speichern") { save() }
                        .disabled(!isValid)
                }
            }
        }
    }

    private var title: String {
        switch mode {
        case .add: "Fahrer hinzufügen"
        case .edit: "Fahrer bearbeiten"
        }
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var nameAlreadyExists: Bool {
        let lowered = trimmedName.lowercased()
        guard !lowered.isEmpty else { return false }
        return existingDriverNames.contains(where: { $0.lowercased() == lowered })
    }

    private var isValid: Bool {
        !trimmedName.isEmpty
            && DriverService.validNumberRange.contains(number)
            && !nameAlreadyExists
    }

    private func save() {
        do {
            try onSave(trimmedName, number, teamId)
            dismiss()
        } catch DriverService.DriverError.nameAlreadyExists {
            errorMessage = "Ein Fahrer mit diesem Namen existiert bereits."
        } catch DriverService.DriverError.invalidNumber {
            errorMessage = "Die Nummer muss zwischen 1 und 999 liegen."
        } catch DriverService.DriverError.nameEmpty {
            errorMessage = "Der Name darf nicht leer sein."
        } catch {
            errorMessage = "Fehler: \(error)"
        }
    }
}

#Preview {
    DriverFormSheet(
        mode: .add,
        teams: [Team(name: "Red"), Team(name: "Blue")],
        existingDriverNames: ["Alice"]
    ) { _, _, _ in }
}

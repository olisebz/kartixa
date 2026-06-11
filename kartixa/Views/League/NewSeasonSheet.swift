import SwiftUI

struct NewSeasonSheet: View {
    let existingSeasonNames: [String]
    let canCopyDrivers: Bool
    let onCreate: (_ name: String, _ startDate: Date, _ copyDriversFromCurrent: Bool) -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var name: String = ""
    @State private var startDate: Date = Date()
    @State private var copyDrivers: Bool = true

    var body: some View {
        NavigationStack {
            Form {
                Section("Saison") {
                    TextField("Name", text: $name)
                    DatePicker(
                        "Startdatum",
                        selection: $startDate,
                        in: ...Date(),
                        displayedComponents: .date
                    )
                }

                if canCopyDrivers {
                    Section {
                        Toggle("Fahrer übernehmen", isOn: $copyDrivers)
                    } footer: {
                        Text("Übernimmt alle Fahrer der aktuell ausgewählten Saison in die neue Saison.")
                    }
                }

                if nameAlreadyExists {
                    Section {
                        Label("Eine Saison mit diesem Namen existiert bereits.", systemImage: "exclamationmark.triangle")
                            .foregroundStyle(.orange)
                    }
                }
            }
            .navigationTitle("Neue Saison")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Erstellen") {
                        onCreate(trimmedName, startDate, canCopyDrivers && copyDrivers)
                        dismiss()
                    }
                    .disabled(!isValid)
                }
            }
        }
    }

    private var trimmedName: String {
        name.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private var nameAlreadyExists: Bool {
        let lowered = trimmedName.lowercased()
        guard !lowered.isEmpty else { return false }
        return existingSeasonNames.contains(where: { $0.lowercased() == lowered })
    }

    private var isValid: Bool {
        !trimmedName.isEmpty && !nameAlreadyExists
    }
}

#Preview {
    NewSeasonSheet(
        existingSeasonNames: ["Saison 2025"],
        canCopyDrivers: true
    ) { _, _, _ in }
}

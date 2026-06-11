import SwiftUI

struct PenaltySheet: View {
    @Binding var penalties: [RaceResultPenalty]

    @Environment(\.dismiss) private var dismiss
    @State private var editingDraft: PenaltyDraft?

    var body: some View {
        NavigationStack {
            Group {
                if penalties.isEmpty {
                    ContentUnavailableView {
                        Label("Keine Strafen", systemImage: "exclamationmark.shield")
                    } description: {
                        Text("Tippe auf +, um eine Strafe hinzuzufügen.")
                    }
                } else {
                    List {
                        ForEach(penalties) { penalty in
                            Button {
                                editingDraft = PenaltyDraft.from(penalty)
                            } label: {
                                PenaltyRow(penalty: penalty)
                            }
                            .buttonStyle(.plain)
                        }
                        .onDelete { offsets in
                            penalties.remove(atOffsets: offsets)
                        }
                    }
                }
            }
            .navigationTitle("Strafen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Fertig") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        editingDraft = PenaltyDraft.empty()
                    } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Strafe hinzufügen")
                }
            }
            .sheet(item: $editingDraft) { draft in
                PenaltyEditForm(draft: draft) { saved in
                    apply(saved)
                }
                .presentationDetents([.medium])
            }
        }
    }

    private func apply(_ draft: PenaltyDraft) {
        if let existingID = draft.existingPenaltyID,
           let index = penalties.firstIndex(where: { $0.id == existingID }) {
            penalties[index] = RaceResultPenalty(
                id: existingID,
                type: draft.type,
                value: draft.value,
                note: draft.trimmedNote
            )
        } else {
            penalties.append(RaceResultPenalty(
                type: draft.type,
                value: draft.value,
                note: draft.trimmedNote
            ))
        }
    }
}

struct PenaltyDraft: Identifiable {
    let id: UUID
    var existingPenaltyID: UUID?
    var type: PenaltyType
    var value: Int
    var note: String

    var trimmedNote: String? {
        let trimmed = note.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    static func empty() -> PenaltyDraft {
        PenaltyDraft(
            id: UUID(),
            existingPenaltyID: nil,
            type: .seconds,
            value: 0,
            note: ""
        )
    }

    static func from(_ penalty: RaceResultPenalty) -> PenaltyDraft {
        PenaltyDraft(
            id: UUID(),
            existingPenaltyID: penalty.id,
            type: penalty.type,
            value: penalty.value,
            note: penalty.note ?? ""
        )
    }
}

struct PenaltyRow: View {
    let penalty: RaceResultPenalty

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Image(systemName: icon)
                Text(description)
                    .font(.headline)
            }
            if let note = penalty.note, !note.isEmpty {
                Text(note)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var description: String {
        switch penalty.type {
        case .seconds: "\(penalty.value) Sekunden"
        case .grid: "\(penalty.value) Startplätze"
        case .points: "\(penalty.value) Punkte"
        }
    }

    private var icon: String {
        switch penalty.type {
        case .seconds: "clock"
        case .grid: "arrow.down.to.line"
        case .points: "minus.circle"
        }
    }
}

struct PenaltyEditForm: View {
    @State private var draft: PenaltyDraft
    let onSave: (PenaltyDraft) -> Void

    @Environment(\.dismiss) private var dismiss

    init(draft: PenaltyDraft, onSave: @escaping (PenaltyDraft) -> Void) {
        _draft = State(initialValue: draft)
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Strafe") {
                    Picker("Typ", selection: $draft.type) {
                        Text("Sekunden").tag(PenaltyType.seconds)
                        Text("Startplätze").tag(PenaltyType.grid)
                        Text("Punkte").tag(PenaltyType.points)
                    }
                    HStack {
                        Text("Wert")
                        Spacer()
                        TextField("0", value: $draft.value, format: .number)
                            .multilineTextAlignment(.trailing)
                            .keyboardType(.numberPad)
                            .frame(width: 80)
                    }
                }
                Section("Notiz") {
                    TextField("Optional", text: $draft.note, axis: .vertical)
                        .lineLimit(1...3)
                }
            }
            .navigationTitle(draft.existingPenaltyID == nil ? "Neue Strafe" : "Strafe bearbeiten")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Abbrechen") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Speichern") {
                        onSave(draft)
                        dismiss()
                    }
                    .disabled(draft.value <= 0)
                }
            }
        }
    }
}

#Preview {
    @Previewable @State var penalties: [RaceResultPenalty] = [
        RaceResultPenalty(type: .seconds, value: 5, note: "Track limits"),
        RaceResultPenalty(type: .points, value: 3)
    ]
    return PenaltySheet(penalties: $penalties)
}

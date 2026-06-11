import SwiftUI

struct RaceFormView: View {
    @Bindable var viewModel: RaceFormViewModel
    let onShowPenalties: (Int) -> Void
    var dangerZone: (() -> Void)?

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 22) {
                detailsCard
                resultsSection
                pointsReferenceCard
                if let dangerZone {
                    dangerZoneCard(onDelete: dangerZone)
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 14)
            .padding(.bottom, 28)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
        .kxBackground()
    }

    // MARK: - Details

    private var detailsCard: some View {
        KXCard(accent: KX.Color.green) {
            VStack(spacing: 0) {
                nameField
                divider
                trackPickerRow
                if viewModel.trackSelection == .custom {
                    divider
                    customTrackField
                }
                divider
                datePickerRow
            }
        }
    }

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionLabel("Name")
            TextField("z. B. Sommer-Sprint", text: $viewModel.name)
                .font(KX.Font.display(18, weight: .bold))
                .foregroundStyle(KX.Color.text)
                .textInputAutocapitalization(.words)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    private var trackPickerRow: some View {
        HStack {
            sectionLabel("Strecke")
            Spacer()
            Menu {
                ForEach(viewModel.availableTracks, id: \.self) { track in
                    Button {
                        viewModel.trackSelection = .preset(track)
                    } label: {
                        Text(track)
                    }
                }
                Divider()
                Button {
                    viewModel.trackSelection = .custom
                } label: {
                    Label("Eigene Strecke …", systemImage: "pencil")
                }
            } label: {
                HStack(spacing: 6) {
                    Text(trackLabel.uppercased())
                        .font(KX.Font.display(15, weight: .bold))
                        .foregroundStyle(KX.Color.text)
                        .lineLimit(1)
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundStyle(KX.Color.dim)
                }
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    private var trackLabel: String {
        switch viewModel.trackSelection {
        case .preset(let name): name
        case .custom: viewModel.customTrack.isEmpty ? "Eigene Strecke" : viewModel.customTrack
        }
    }

    private var customTrackField: some View {
        VStack(alignment: .leading, spacing: 6) {
            sectionLabel("Eigener Streckenname")
            TextField("z. B. Hallen-Kart Berlin", text: $viewModel.customTrack)
                .font(KX.Font.display(15, weight: .bold))
                .foregroundStyle(KX.Color.text)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    private var datePickerRow: some View {
        HStack {
            sectionLabel("Datum")
            Spacer()
            DatePicker(
                "",
                selection: $viewModel.date,
                in: ...Date(),
                displayedComponents: .date
            )
            .labelsHidden()
            .tint(KX.Color.green)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    // MARK: - Results

    private var resultsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("ERGEBNISSE")
                    .font(KX.Font.display(14, weight: .bold))
                    .tracking(1.4)
                    .foregroundStyle(KX.Color.dim)
                Text("(\(viewModel.results.count))")
                    .font(KX.Font.mono(14, weight: .bold))
                    .foregroundStyle(KX.Color.faint)
                Spacer()
                Button {
                    viewModel.addResult()
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                            .font(.system(size: 10, weight: .heavy))
                        Text("ZEILE")
                            .font(KX.Font.display(12, weight: .bold))
                            .tracking(0.8)
                    }
                    .foregroundStyle(KX.Color.onGreen)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(KX.Color.green, in: Capsule())
                }
                .buttonStyle(.plain)
            }

            if viewModel.results.isEmpty {
                KXCard {
                    VStack(spacing: 10) {
                        Image(systemName: "list.bullet.rectangle")
                            .font(.system(size: 32, weight: .light))
                            .foregroundStyle(KX.Color.faint)
                        Text("Noch keine Einträge")
                            .font(KX.Font.display(16, weight: .bold))
                            .foregroundStyle(KX.Color.text)
                        Text("Auf „Zeile“ tippen, um das erste Ergebnis hinzuzufügen.")
                            .font(KX.Font.ui(12))
                            .foregroundStyle(KX.Color.dim)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 24)
                }
            } else {
                VStack(spacing: 12) {
                    ForEach(viewModel.results.indices, id: \.self) { index in
                        RaceResultRowEditor(
                            index: index,
                            viewModel: viewModel,
                            onShowPenalties: { onShowPenalties(index) }
                        )
                    }
                }
                Text("DNF-Einträge wandern beim Speichern automatisch ans Ende.")
                    .font(KX.Font.ui(11))
                    .foregroundStyle(KX.Color.faint)
                    .padding(.top, 4)
            }
        }
    }

    // MARK: - Points Reference

    private var pointsReferenceCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("PUNKTESYSTEM")
                .font(KX.Font.display(14, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(KX.Color.dim)
            KXCard {
                VStack(spacing: 0) {
                    let positions = Array(1...10)
                    ForEach(positions, id: \.self) { pos in
                        HStack {
                            KXPosChip(position: pos, size: 24, fontSize: 12)
                            Text("Platz \(pos)")
                                .font(KX.Font.ui(13, weight: .medium))
                                .foregroundStyle(KX.Color.dim)
                            Spacer()
                            Text("\(PointsSystem.table[pos] ?? 0) PKT.")
                                .font(KX.Font.mono(13, weight: .bold))
                                .foregroundStyle(KX.Color.text)
                        }
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        if pos < 10 {
                            Rectangle().fill(KX.Color.line).frame(height: 1)
                        }
                    }
                    Rectangle().fill(KX.Color.line).frame(height: 1)
                    HStack {
                        Image(systemName: "stopwatch.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(KX.Color.purple)
                        Text("Schnellste Runde · Top \(PointsSystem.fastestLapMaxPosition)")
                            .font(KX.Font.ui(13, weight: .medium))
                            .foregroundStyle(KX.Color.dim)
                        Spacer()
                        Text("+\(PointsSystem.fastestLapBonus) PKT.")
                            .font(KX.Font.mono(13, weight: .bold))
                            .foregroundStyle(KX.Color.purple)
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                }
            }
        }
    }

    // MARK: - Danger Zone

    private func dangerZoneCard(onDelete: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("GEFAHRENZONE")
                .font(KX.Font.display(14, weight: .bold))
                .tracking(1.4)
                .foregroundStyle(KX.Color.red)
            KXCard {
                Button(role: .destructive, action: onDelete) {
                    HStack(spacing: 10) {
                        Image(systemName: "trash.fill")
                            .font(.system(size: 14, weight: .bold))
                        Text("Rennen löschen")
                            .font(KX.Font.display(14, weight: .bold))
                            .tracking(0.5)
                            .textCase(.uppercase)
                        Spacer()
                    }
                    .foregroundStyle(KX.Color.red)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 14)
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Helpers

    private func sectionLabel(_ text: LocalizedStringKey) -> some View {
        Text(text)
            .font(KX.Font.ui(9, weight: .semibold))
            .tracking(1.2)
            .textCase(.uppercase)
            .foregroundStyle(KX.Color.faint)
    }

    private var divider: some View {
        Rectangle().fill(KX.Color.line).frame(height: 1)
    }
}

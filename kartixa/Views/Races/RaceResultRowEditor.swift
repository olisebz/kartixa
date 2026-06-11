import SwiftUI

struct RaceResultRowEditor: View {
    let index: Int
    @Bindable var viewModel: RaceFormViewModel
    let onShowPenalties: () -> Void

    private var draft: DraftRaceResult {
        guard viewModel.results.indices.contains(index) else { return DraftRaceResult() }
        return viewModel.results[index]
    }

    private var driverName: String {
        viewModel.driverName(for: draft.driverId)
    }

    private var driverNumber: Int? {
        guard let id = draft.driverId,
              id != Driver.unknownDriverSentinelID,
              let driver = viewModel.availableDrivers.first(where: { $0.id == id }),
              driver.number > 0 else { return nil }
        return driver.number
    }

    var body: some View {
        KXCard {
            VStack(alignment: .leading, spacing: 0) {
                headerSection
                Rectangle().fill(KX.Color.line).frame(height: 1)
                chipsSection
                Rectangle().fill(KX.Color.line).frame(height: 1)
                footerSection
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        HStack(spacing: 12) {
            positionBadge
            VStack(alignment: .leading, spacing: 4) {
                Text("FAHRER")
                    .font(KX.Font.ui(8.5, weight: .semibold))
                    .tracking(1.0)
                    .foregroundStyle(KX.Color.faint)
                driverPicker
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
    }

    @ViewBuilder
    private var positionBadge: some View {
        if draft.dnf {
            ZStack {
                RoundedRectangle(cornerRadius: 7).fill(KX.Color.chipBg)
                Text("DNF")
                    .font(KX.Font.display(11, weight: .bold, italic: true))
                    .foregroundStyle(KX.Color.faint)
            }
            .frame(width: 38, height: 38)
        } else {
            KXPosChip(position: positionForDisplay, size: 38, fontSize: 20)
        }
    }

    private var positionForDisplay: Int {
        let nonDNFBefore = viewModel.results.prefix(index).filter { !$0.dnf }.count
        return nonDNFBefore + 1
    }

    private var driverPicker: some View {
        Menu {
            Button {
                viewModel.setDriver(nil, at: index)
            } label: {
                Label("— wählen —", systemImage: "questionmark.circle")
            }
            Divider()
            ForEach(viewModel.availableDrivers) { driver in
                Button {
                    viewModel.setDriver(driver.id, at: index)
                } label: {
                    if driver.number > 0 {
                        Text("\(driver.name) · #\(driver.number)")
                    } else {
                        Text(driver.name)
                    }
                }
            }
            Divider()
            Button {
                viewModel.setDriver(Driver.unknownDriverSentinelID, at: index)
            } label: {
                Label(Driver.unknownDriverName, systemImage: "questionmark.diamond")
            }
        } label: {
            HStack(spacing: 6) {
                Text(draft.driverId == nil ? "FAHRER WÄHLEN" : driverName.uppercased())
                    .font(KX.Font.display(17, weight: .bold))
                    .foregroundStyle(draft.driverId == nil ? KX.Color.faint : KX.Color.text)
                    .lineLimit(1)
                if let number = driverNumber {
                    Text("#\(number)")
                        .font(KX.Font.mono(11))
                        .foregroundStyle(KX.Color.dim)
                }
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(KX.Color.dim)
            }
        }
    }

    // MARK: - Chips

    private var chipsSection: some View {
        HStack(spacing: 8) {
            chip(
                isActive: draft.fastestLap,
                label: "SCHN.",
                icon: "stopwatch.fill",
                tint: KX.Color.purple,
                disabled: draft.dnf
            ) {
                viewModel.toggleFastestLap(at: index)
            }
            chip(
                isActive: draft.dnf,
                label: "DNF",
                icon: "xmark.octagon.fill",
                tint: KX.Color.red,
                disabled: false
            ) {
                viewModel.toggleDNF(at: index)
            }
            chip(
                isActive: !draft.penalties.isEmpty,
                label: "STRAFEN (\(draft.penalties.count))",
                icon: "exclamationmark.shield.fill",
                tint: KX.Color.orange,
                disabled: false
            ) {
                onShowPenalties()
            }
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }

    private func chip(
        isActive: Bool,
        label: String,
        icon: String,
        tint: Color,
        disabled: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.system(size: 10, weight: .semibold))
                Text(label)
                    .font(KX.Font.display(11, weight: .bold))
                    .tracking(0.6)
            }
            .foregroundStyle(isActive ? tint : KX.Color.faint)
            .padding(.horizontal, 9)
            .padding(.vertical, 6)
            .background(isActive ? tint.opacity(0.15) : KX.Color.surface2)
            .overlay(
                Capsule().stroke(isActive ? tint.opacity(0.5) : KX.Color.line, lineWidth: 1)
            )
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .disabled(disabled)
        .opacity(disabled ? 0.4 : 1)
    }

    // MARK: - Footer

    private var footerSection: some View {
        HStack(spacing: 14) {
            Button {
                viewModel.moveUp(index)
            } label: {
                Image(systemName: "arrow.up")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(index == 0 ? KX.Color.faint : KX.Color.text)
                    .frame(width: 32, height: 32)
                    .background(KX.Color.surface2, in: RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
            .disabled(index == 0)

            Button {
                viewModel.moveDown(index)
            } label: {
                Image(systemName: "arrow.down")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(index >= viewModel.results.count - 1 ? KX.Color.faint : KX.Color.text)
                    .frame(width: 32, height: 32)
                    .background(KX.Color.surface2, in: RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
            .disabled(index >= viewModel.results.count - 1)

            Spacer()

            HStack(alignment: .lastTextBaseline, spacing: 4) {
                Text("\(viewModel.pointsPreview(at: index))")
                    .font(KX.Font.mono(20, weight: .bold))
                    .foregroundStyle(viewModel.pointsPreview(at: index) == 0 ? KX.Color.faint : KX.Color.text)
                Text("PKT")
                    .font(KX.Font.ui(9, weight: .semibold))
                    .tracking(0.8)
                    .foregroundStyle(KX.Color.faint)
            }

            Button(role: .destructive) {
                viewModel.removeResult(at: index)
            } label: {
                Image(systemName: "trash")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(KX.Color.red)
                    .frame(width: 32, height: 32)
                    .background(KX.Color.surface2, in: RoundedRectangle(cornerRadius: 8))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
    }
}

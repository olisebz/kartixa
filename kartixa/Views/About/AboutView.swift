import SwiftUI

struct AboutView: View {
    var body: some View {
        Form {
            Section {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Kartixa")
                        .font(.largeTitle.bold())
                    Text("Liga-Verwaltung für Indoor-Kart-Rennen.")
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
            }

            Section("Punktesystem") {
                ForEach(1...10, id: \.self) { position in
                    HStack {
                        Text("\(position).")
                            .monospacedDigit()
                            .frame(width: 28, alignment: .leading)
                        Spacer()
                        Text("\(PointsSystem.table[position] ?? 0) Pkt.")
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                    }
                }
                HStack {
                    Text("Schnellste Runde (Top \(PointsSystem.fastestLapMaxPosition))")
                    Spacer()
                    Text("+\(PointsSystem.fastestLapBonus) Pkt.")
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
            }

            Section("Hinweise") {
                Label("Daten liegen lokal und syncen via iCloud.", systemImage: "icloud")
                Label("Kein Login, keine Server.", systemImage: "lock.shield")
            }
        }
        .navigationTitle(String(localized: "nav.about"))
    }
}

#Preview {
    NavigationStack { AboutView() }
}

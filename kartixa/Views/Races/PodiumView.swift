import SwiftUI

struct PodiumEntry: Identifiable, Equatable {
    let id: UUID
    let rank: Int
    let driverName: String
    let teamName: String?
    let teamColor: Color
    let points: Int
}

struct PodiumView: View {
    let entries: [PodiumEntry]

    private var order: [Int] { [2, 1, 3] }

    private func medalColor(for rank: Int) -> Color {
        switch rank {
        case 1: KX.Color.gold
        case 2: KX.Color.silver
        case 3: KX.Color.bronze
        default: KX.Color.faint
        }
    }

    private func barHeight(for rank: Int) -> CGFloat {
        switch rank {
        case 1: 132
        case 2: 100
        case 3: 78
        default: 60
        }
    }

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            ForEach(order, id: \.self) { rank in
                if let entry = entries.first(where: { $0.rank == rank }) {
                    podiumColumn(entry: entry)
                } else {
                    Color.clear.frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.horizontal, 6)
    }

    private func podiumColumn(entry: PodiumEntry) -> some View {
        VStack(spacing: 0) {
            if entry.rank == 1 {
                KXChecker(size: 5, height: 9, primary: KX.Color.text)
                    .frame(width: 22)
                    .clipShape(RoundedRectangle(cornerRadius: 1))
                    .padding(.bottom, 6)
            } else {
                Color.clear.frame(height: 15)
            }

            Text(entry.driverName.uppercased())
                .font(KX.Font.display(14, weight: .bold))
                .foregroundStyle(KX.Color.text)
                .multilineTextAlignment(.center)
                .lineLimit(1)

            HStack(spacing: 4) {
                Rectangle()
                    .fill(entry.teamColor)
                    .frame(width: 6, height: 6)
                Text("\(entry.points) PKT")
                    .font(KX.Font.mono(11, weight: .bold))
                    .foregroundStyle(KX.Color.dim)
            }
            .padding(.top, 4)
            .padding(.bottom, 9)

            ZStack(alignment: .top) {
                LinearGradient(
                    colors: [medalColor(for: entry.rank).opacity(0.22), KX.Color.surface.opacity(0.95)],
                    startPoint: .top,
                    endPoint: .center
                )
                .overlay(
                    Rectangle()
                        .fill(medalColor(for: entry.rank))
                        .frame(height: 2.5),
                    alignment: .top
                )

                Text("\(entry.rank)")
                    .font(KX.Font.display(40, weight: .heavy, italic: true))
                    .foregroundStyle(medalColor(for: entry.rank).opacity(0.95))
                    .padding(.top, 10)
            }
            .frame(height: barHeight(for: entry.rank))
            .clipShape(UnevenRoundedRectangle(topLeadingRadius: 8, topTrailingRadius: 8))
            .overlay(
                UnevenRoundedRectangle(topLeadingRadius: 8, topTrailingRadius: 8)
                    .stroke(KX.Color.line, lineWidth: 1)
            )
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    PodiumView(entries: [
        PodiumEntry(id: UUID(), rank: 1, driverName: "L. Brandt", teamName: "Apex", teamColor: KX.Color.green, points: 25),
        PodiumEntry(id: UUID(), rank: 2, driverName: "M. Vogel", teamName: "Velocity", teamColor: KX.Color.purple, points: 18),
        PodiumEntry(id: UUID(), rank: 3, driverName: "J. Keller", teamName: "Apex", teamColor: KX.Color.green, points: 15)
    ])
    .padding()
    .background(KX.Color.bg)
    .preferredColorScheme(.dark)
}

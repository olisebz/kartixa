import SwiftUI

enum RootTab: Hashable, CaseIterable, Identifiable {
    case leagues, drivers, stats, more
    var id: Self { self }

    var label: LocalizedStringKey {
        switch self {
        case .leagues: "Serien"
        case .drivers: "Fahrer"
        case .stats: "Statistik"
        case .more: "Mehr"
        }
    }
}

struct KXTabBar: View {
    @Binding var selection: RootTab

    var body: some View {
        VStack(spacing: 0) {
            KXChecker(size: 7, height: 3, primary: KX.Color.green, secondary: Color(red: 0x0D/255, green: 0x2C/255, blue: 0x19/255))
                .opacity(0.9)
            HStack(spacing: 0) {
                ForEach(RootTab.allCases) { tab in
                    Button {
                        selection = tab
                    } label: {
                        VStack(spacing: 5) {
                            icon(for: tab, active: tab == selection)
                                .frame(width: 22, height: 22)
                            Text(tab.label)
                                .font(KX.Font.display(11, weight: .bold))
                                .tracking(0.6)
                                .textCase(.uppercase)
                                .foregroundStyle(tab == selection ? KX.Color.text : KX.Color.faint)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.top, 11)
            .padding(.bottom, 6)
            .background(
                KX.Color.bg.opacity(0.85)
                    .background(.ultraThinMaterial)
            )
            .overlay(
                Rectangle().fill(KX.Color.line).frame(height: 1),
                alignment: .top
            )
        }
    }

    @ViewBuilder
    private func icon(for tab: RootTab, active: Bool) -> some View {
        let color = active ? KX.Color.green : KX.Color.faint
        switch tab {
        case .leagues:
            Image(systemName: "flag.checkered")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(color)
        case .drivers:
            Image(systemName: "person.fill")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(color)
        case .stats:
            Image(systemName: "chart.bar.fill")
                .font(.system(size: 18, weight: .semibold))
                .foregroundStyle(color)
        case .more:
            Image(systemName: "ellipsis")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(color)
        }
    }
}

#Preview {
    @Previewable @State var selection: RootTab = .leagues
    return VStack {
        Spacer()
        KXTabBar(selection: $selection)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(KX.Color.bg)
}

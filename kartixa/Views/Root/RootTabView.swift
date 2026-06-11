import SwiftUI

struct RootTabView: View {
    @Environment(AppState.self) private var appState
    @State private var selection: RootTab = .leagues

    var body: some View {
        VStack(spacing: 0) {
            if !appState.isICloudAvailable {
                ICloudOfflineBanner()
            }
            ZStack(alignment: .bottom) {
                tabContent
                KXTabBar(selection: $selection)
            }
        }
        .kxBackground()
    }

    @ViewBuilder
    private var tabContent: some View {
        switch selection {
        case .leagues:
            LeagueListView()
        case .drivers:
            DriversPageView()
        case .stats:
            StatisticsView()
        case .more:
            NavigationStack { MoreMenuView() }
        }
    }
}

private struct ICloudOfflineBanner: View {
    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "icloud.slash")
                .foregroundStyle(KX.Color.orange)
            Text("iCloud nicht aktiv — Daten werden lokal gespeichert.")
                .font(KX.Font.ui(11, weight: .medium))
                .foregroundStyle(KX.Color.text)
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(KX.Color.orange.opacity(0.15))
    }
}

#Preview {
    RootTabView()
        .environment(AppState())
        .preferredColorScheme(.dark)
}

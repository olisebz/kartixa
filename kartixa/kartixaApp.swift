import SwiftUI

@main
struct kartixaApp: App {
    @State private var appState = AppState()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootTabView()
                .environment(appState)
                .preferredColorScheme(.dark)
                .tint(KX.Color.green)
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active {
                        appState.refreshICloudAvailability()
                    }
                }
        }
    }
}

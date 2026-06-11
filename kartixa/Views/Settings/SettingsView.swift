import SwiftUI

struct SettingsView: View {
    @Environment(AppState.self) private var appState

    var body: some View {
        Form {
            Section("Sprache") {
                HStack {
                    Text("Sprache")
                    Spacer()
                    Text("System")
                        .foregroundStyle(.secondary)
                }
            }

            Section("iCloud") {
                HStack {
                    Text("Status")
                    Spacer()
                    Label(
                        appState.isICloudAvailable ? "Aktiv" : "Inaktiv",
                        systemImage: appState.isICloudAvailable
                            ? "checkmark.circle.fill"
                            : "exclamationmark.triangle.fill"
                    )
                    .labelStyle(.titleAndIcon)
                    .foregroundStyle(appState.isICloudAvailable ? .green : .orange)
                }
            }

            Section("App") {
                HStack {
                    Text("Version")
                    Spacer()
                    Text(versionString)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle(String(localized: "nav.settings"))
    }

    private var versionString: String {
        let dict = Bundle.main.infoDictionary
        let version = dict?["CFBundleShortVersionString"] as? String ?? "—"
        let build = dict?["CFBundleVersion"] as? String ?? "—"
        return "\(version) (\(build))"
    }
}

#Preview {
    NavigationStack { SettingsView() }
        .environment(AppState())
}

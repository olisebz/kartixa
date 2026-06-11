import SwiftUI

struct MoreMenuView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                KXBrandBar { EmptyView() }

                Text("MEHR")
                    .font(KX.Font.display(44, weight: .heavy))
                    .tracking(-0.5)
                    .foregroundStyle(KX.Color.text)
                    .padding(.horizontal, 18)
                    .padding(.bottom, 22)

                KXSecLabel("App")
                KXCard {
                    VStack(spacing: 0) {
                        NavigationLink {
                            AboutView()
                        } label: {
                            MenuRow(title: "Über Kartixa", icon: "info.circle.fill")
                        }
                        .buttonStyle(.plain)
                        Rectangle().fill(KX.Color.line).frame(height: 1)
                        NavigationLink {
                            SettingsView()
                        } label: {
                            MenuRow(title: "Einstellungen", icon: "gearshape.fill")
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 16)

                Color.clear.frame(height: 60)
            }
        }
        .scrollIndicators(.hidden)
        .kxBackground()
        .toolbar(.hidden, for: .navigationBar)
    }
}

private struct MenuRow: View {
    let title: LocalizedStringKey
    let icon: String

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(KX.Color.green)
                .frame(width: 28)
            Text(title)
                .font(KX.Font.display(16, weight: .bold))
                .foregroundStyle(KX.Color.text)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(KX.Color.faint)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }
}

#Preview {
    NavigationStack {
        MoreMenuView()
    }
    .preferredColorScheme(.dark)
}

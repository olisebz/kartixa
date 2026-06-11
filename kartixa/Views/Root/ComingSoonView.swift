import SwiftUI

struct ComingSoonView: View {
    let title: LocalizedStringKey
    let subtitle: LocalizedStringKey
    let systemImage: String

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            KXBrandBar { EmptyView() }
            Spacer(minLength: 40)
            VStack(spacing: 20) {
                Image(systemName: systemImage)
                    .font(.system(size: 56, weight: .light))
                    .foregroundStyle(KX.Color.faint)
                Text(title)
                    .font(KX.Font.display(38, weight: .heavy))
                    .tracking(-0.3)
                    .foregroundStyle(KX.Color.text)
                Text(subtitle)
                    .font(KX.Font.ui(14))
                    .foregroundStyle(KX.Color.dim)
                    .multilineTextAlignment(.center)
                KXPill(text: "BALD VERFÜGBAR", color: KX.Color.green)
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, 30)
            Spacer()
        }
        .kxBackground()
    }
}

#Preview {
    ComingSoonView(
        title: "FAHRER",
        subtitle: "Liga-übergreifende Fahrer-Statistiken.",
        systemImage: "person.fill"
    )
    .preferredColorScheme(.dark)
}

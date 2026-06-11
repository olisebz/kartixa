import SwiftUI

// MARK: - KXChecker (Karierte Zielflagge)

struct KXChecker: View {
    var size: CGFloat = 7
    var height: CGFloat = 8
    var primary: Color = .white
    var secondary: Color = .clear

    var body: some View {
        Canvas { context, canvasSize in
            let cols = Int(ceil(canvasSize.width / size)) + 1
            let rows = Int(ceil(canvasSize.height / size)) + 1
            for row in 0..<rows {
                for col in 0..<cols {
                    let isOn = (row + col) % 2 == 0
                    let color = isOn ? primary : secondary
                    let rect = CGRect(
                        x: CGFloat(col) * size,
                        y: CGFloat(row) * size,
                        width: size,
                        height: size
                    )
                    context.fill(Path(rect), with: .color(color))
                }
            }
        }
        .frame(height: height)
        .allowsHitTesting(false)
    }
}

// MARK: - KXCard

struct KXCard<Content: View>: View {
    var accent: Color? = nil
    @ViewBuilder var content: () -> Content

    var body: some View {
        VStack(spacing: 0) {
            if let accent {
                Rectangle()
                    .fill(accent)
                    .frame(height: 3)
            }
            content()
        }
        .background(KX.Color.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(KX.Color.line, lineWidth: 1)
        )
    }
}

// MARK: - KXSecLabel

struct KXSecLabel<Right: View>: View {
    let title: LocalizedStringKey
    @ViewBuilder var right: () -> Right

    init(_ title: LocalizedStringKey, @ViewBuilder right: @escaping () -> Right = { EmptyView() }) {
        self.title = title
        self.right = right
    }

    var body: some View {
        HStack(spacing: 8) {
            // schräger grüner Marker
            Rectangle()
                .fill(KX.Color.green)
                .frame(width: 3, height: 14)
                .clipShape(SkewedRect(angle: -12))
            Text(title)
                .font(KX.Font.display(13, weight: .bold))
                .tracking(1.4)
                .textCase(.uppercase)
                .foregroundStyle(KX.Color.dim)
            Spacer()
            right()
        }
        .padding(.horizontal, 18)
        .padding(.bottom, 11)
    }
}

extension KXSecLabel where Right == EmptyView {
    init(_ title: LocalizedStringKey) {
        self.init(title, right: { EmptyView() })
    }
}

/// Helfer für schräges Rechteck (skewX-Effekt).
struct SkewedRect: Shape {
    var angle: CGFloat
    func path(in rect: CGRect) -> Path {
        let dx = rect.height * tan(angle * .pi / 180)
        var path = Path()
        path.move(to: CGPoint(x: rect.minX - dx / 2, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX - dx / 2, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.maxX + dx / 2, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.minX + dx / 2, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

// MARK: - KXStat (Wert + Label)

struct KXStat: View {
    let label: LocalizedStringKey
    let value: String
    var accent: Color? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(value)
                .font(KX.Font.mono(19, weight: .bold))
                .foregroundStyle(accent ?? KX.Color.text)
            Text(label)
                .font(KX.Font.ui(9, weight: .semibold))
                .tracking(1.2)
                .textCase(.uppercase)
                .foregroundStyle(KX.Color.faint)
        }
    }
}

// MARK: - KXPosChip

struct KXPosChip: View {
    let position: Int
    var dnf: Bool = false
    var size: CGFloat = 34
    var fontSize: CGFloat = 18

    private var background: Color {
        if dnf { return .clear }
        switch position {
        case 1: return KX.Color.gold
        case 2: return KX.Color.silver
        case 3: return KX.Color.bronze
        default: return KX.Color.chipBg
        }
    }

    private var foreground: Color {
        if dnf { return KX.Color.faint }
        switch position {
        case 1, 2, 3: return Color(red: 0x1A/255, green: 0x13/255, blue: 0x00/255)
        default: return KX.Color.text
        }
    }

    private var border: Color {
        dnf ? KX.Color.line : .clear
    }

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 7, style: .continuous)
                .fill(background)
                .overlay(
                    RoundedRectangle(cornerRadius: 7, style: .continuous)
                        .stroke(border, lineWidth: 1.5)
                )
            Text(dnf ? "DNF" : "\(position)")
                .font(KX.Font.display(dnf ? fontSize * 0.62 : fontSize, weight: .bold, italic: true))
                .foregroundStyle(foreground)
        }
        .frame(width: size, height: size)
        .shadow(color: (position <= 3 && !dnf) ? background.opacity(0.25) : .clear, radius: 6, y: 2)
    }
}

// MARK: - KXIconBtn

struct KXIconBtn<Content: View>: View {
    var filled: Bool = false
    var action: () -> Void = {}
    @ViewBuilder var icon: () -> Content

    var body: some View {
        Button(action: action) {
            ZStack {
                RoundedRectangle(cornerRadius: 11, style: .continuous)
                    .fill(filled ? KX.Color.green : KX.Color.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: 11, style: .continuous)
                            .stroke(filled ? .clear : KX.Color.line, lineWidth: 1)
                    )
                icon()
                    .foregroundStyle(filled ? KX.Color.onGreen : KX.Color.text)
            }
            .frame(width: 38, height: 38)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - KXBrandBar

struct KXBrandBar<Trailing: View>: View {
    @ViewBuilder var trailing: () -> Trailing

    var body: some View {
        HStack(spacing: 9) {
            KXChecker(size: 6, height: 18, primary: KX.Color.text.opacity(0.9))
                .frame(width: 14)
                .clipShape(RoundedRectangle(cornerRadius: 1))
            HStack(spacing: 0) {
                Text("KARTIXA")
                    .font(KX.Font.display(20, weight: .black, italic: true))
                    .tracking(0.5)
                    .foregroundStyle(KX.Color.text)
                Text(".")
                    .font(KX.Font.display(20, weight: .black, italic: true))
                    .foregroundStyle(KX.Color.green)
            }
            Spacer()
            trailing()
        }
        .padding(.horizontal, 18)
        .padding(.top, 6)
        .padding(.bottom, 12)
    }
}

// MARK: - KXDetailHeader

struct KXDetailHeader<Trailing: View>: View {
    let title: LocalizedStringKey
    var onBack: () -> Void
    @ViewBuilder var trailing: () -> Trailing

    var body: some View {
        HStack {
            KXIconBtn(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 14, weight: .bold))
            }
            Spacer()
            Text(title)
                .font(KX.Font.display(13, weight: .bold))
                .tracking(1.0)
                .textCase(.uppercase)
                .foregroundStyle(KX.Color.dim)
            Spacer()
            trailing()
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
    }
}

// MARK: - KXLiveBadge

struct KXLiveBadge: View {
    let isLive: Bool

    var body: some View {
        HStack(spacing: 5) {
            if isLive {
                Circle()
                    .fill(KX.Color.green)
                    .frame(width: 6, height: 6)
                    .shadow(color: KX.Color.green.opacity(0.8), radius: 4)
                Text("LÄUFT")
                    .foregroundStyle(KX.Color.green)
            } else {
                Text("PAUSE")
                    .foregroundStyle(KX.Color.faint)
            }
        }
        .font(KX.Font.display(11, weight: .bold))
        .tracking(1.0)
    }
}

// MARK: - KXPill

struct KXPill: View {
    let text: LocalizedStringKey
    var color: Color = KX.Color.green

    var body: some View {
        Text(text)
            .font(KX.Font.mono(8.5, weight: .bold))
            .foregroundStyle(color)
            .padding(.horizontal, 5)
            .padding(.vertical, 2)
            .overlay(
                RoundedRectangle(cornerRadius: 3)
                    .stroke(color.opacity(0.35), lineWidth: 1)
            )
    }
}

import SwiftUI

/// Design tokens für das "Kartixa GP" Motorsport-Theme.
/// Werte spiegeln das Redesign aus dem PDF-Mockup.
enum KX {
    enum Color {
        static let bg = SwiftUI.Color(red: 0x0B/255, green: 0x0D/255, blue: 0x10/255)
        static let bgGradTop = SwiftUI.Color(red: 0x14/255, green: 0x18/255, blue: 0x1F/255)
        static let surface = SwiftUI.Color(red: 0x15/255, green: 0x18/255, blue: 0x1E/255)
        static let surface2 = SwiftUI.Color(red: 0x1B/255, green: 0x1F/255, blue: 0x27/255)
        static let line = SwiftUI.Color.white.opacity(0.075)
        static let lineHi = SwiftUI.Color.white.opacity(0.14)

        static let text = SwiftUI.Color(red: 0xF3/255, green: 0xF5/255, blue: 0xF8/255)
        static let dim = SwiftUI.Color(red: 0x98/255, green: 0xA1/255, blue: 0xAD/255)
        static let faint = SwiftUI.Color(red: 0x5A/255, green: 0x63/255, blue: 0x6F/255)

        static let green = SwiftUI.Color(red: 0x19/255, green: 0xDA/255, blue: 0x68/255)
        static let greenDim = SwiftUI.Color(red: 0x0F/255, green: 0xA9/255, blue: 0x4E/255)
        static let purple = SwiftUI.Color(red: 0x9B/255, green: 0x5C/255, blue: 0xFF/255)
        static let blue = SwiftUI.Color(red: 0x2D/255, green: 0xA8/255, blue: 0xFF/255)
        static let red = SwiftUI.Color(red: 0xFF/255, green: 0x5C/255, blue: 0x5C/255)
        static let orange = SwiftUI.Color.orange

        static let gold = SwiftUI.Color(red: 0xF6/255, green: 0xC9/255, blue: 0x45/255)
        static let silver = SwiftUI.Color(red: 0xCB/255, green: 0xD2/255, blue: 0xDC/255)
        static let bronze = SwiftUI.Color(red: 0xCF/255, green: 0x8B/255, blue: 0x4E/255)

        static let chipBg = SwiftUI.Color(red: 0x22/255, green: 0x27/255, blue: 0x2F/255)
        static let onGreen = SwiftUI.Color(red: 0x04/255, green: 0x14/255, blue: 0x0A/255)
    }

    enum Font {
        /// Display: condensed bold, uppercase use-case (race-broadcast vibe).
        static func display(_ size: CGFloat, weight: SwiftUI.Font.Weight = .black, italic: Bool = false) -> SwiftUI.Font {
            var font = SwiftUI.Font.system(size: size, weight: weight, design: .default)
            font = font.width(.condensed)
            if italic { font = font.italic() }
            return font
        }

        /// Monospace für Zahlen und Codes.
        static func mono(_ size: CGFloat, weight: SwiftUI.Font.Weight = .semibold) -> SwiftUI.Font {
            .system(size: size, weight: weight, design: .monospaced)
        }

        /// UI-Standardschrift.
        static func ui(_ size: CGFloat, weight: SwiftUI.Font.Weight = .regular) -> SwiftUI.Font {
            .system(size: size, weight: weight, design: .default)
        }
    }
}

extension View {
    /// Setzt den radialen Dark-Background als Inhalt-Hintergrund.
    func kxBackground() -> some View {
        background {
            RadialGradient(
                colors: [KX.Color.bgGradTop, KX.Color.bg],
                center: UnitPoint(x: 0.5, y: -0.1),
                startRadius: 0,
                endRadius: 600
            )
            .ignoresSafeArea()
        }
    }

    /// Letter spacing wrapper, da SwiftUI's `.tracking(:)` direkt am Text nur Float nimmt.
    func kxTracking(_ value: CGFloat) -> some View {
        self.tracking(value)
    }
}

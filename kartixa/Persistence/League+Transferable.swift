import Foundation
import CoreTransferable
import UniformTypeIdentifiers

extension League: Transferable {
    static var transferRepresentation: some TransferRepresentation {
        DataRepresentation(exportedContentType: .json) { league in
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
            return try encoder.encode(LeagueFile(league: league))
        }
        .suggestedFileName { league in
            let sanitized = league.name
                .components(separatedBy: CharacterSet.alphanumerics.union(.whitespaces).inverted)
                .joined()
                .trimmingCharacters(in: .whitespacesAndNewlines)
            let base = sanitized.isEmpty ? "Liga" : sanitized
            return "\(base).kartixa.json"
        }
    }
}

import Foundation

enum ICloudStore {
    static let containerID = "iCloud.oz.kartixa"
    static let leaguesFolder = "Leagues"

    static func documentsURL() -> URL? {
        guard let container = FileManager.default
            .url(forUbiquityContainerIdentifier: containerID) else {
            return nil
        }
        let docs = container.appendingPathComponent("Documents", isDirectory: true)
        try? FileManager.default.createDirectory(
            at: docs, withIntermediateDirectories: true
        )
        return docs
    }

    static func leaguesURL() -> URL? {
        guard let docs = documentsURL() else { return nil }
        let folder = docs.appendingPathComponent(leaguesFolder, isDirectory: true)
        try? FileManager.default.createDirectory(
            at: folder, withIntermediateDirectories: true
        )
        return folder
    }

    static var isAvailable: Bool {
        FileManager.default.ubiquityIdentityToken != nil
    }
}

import Foundation

struct LeagueRepository {
    enum RepoError: Error {
        case iCloudUnavailable
        case readFailed(URL, Error)
        case writeFailed(URL, Error)
        case unsupportedSchemaVersion(Int)
        case fileTooLarge(URL, Int)
    }

    static let trashFolderName = ".trash"
    static let softDeleteRetentionDays = 30
    static let trashFileExtension = "kartixa.json"
    /// Obergrenze pro League-Datei; schützt vor Speicher-Spitzen durch
    /// korrupte oder manipulierte Dateien aus dem iCloud-Container.
    static let maxFileSize = 10 * 1024 * 1024

    let folderURL: URL

    private let encoder: JSONEncoder
    private let decoder: JSONDecoder

    init(folderURL: URL) {
        self.folderURL = folderURL

        let e = JSONEncoder()
        e.dateEncodingStrategy = .iso8601
        e.outputFormatting = [.prettyPrinted, .sortedKeys]
        self.encoder = e

        let d = JSONDecoder()
        d.dateDecodingStrategy = .iso8601
        self.decoder = d

        try? FileManager.default.createDirectory(
            at: folderURL, withIntermediateDirectories: true
        )
    }

    static func iCloud() throws -> LeagueRepository {
        guard let folder = ICloudStore.leaguesURL() else {
            throw RepoError.iCloudUnavailable
        }
        return LeagueRepository(folderURL: folder)
    }

    static func localFallback() -> LeagueRepository {
        let docs = FileManager.default
            .urls(for: .documentDirectory, in: .userDomainMask).first
            ?? FileManager.default.temporaryDirectory
        let folder = docs.appendingPathComponent("Leagues", isDirectory: true)
        return LeagueRepository(folderURL: folder)
    }

    static func bestAvailable() -> LeagueRepository {
        if let folder = ICloudStore.leaguesURL() {
            return LeagueRepository(folderURL: folder)
        }
        return localFallback()
    }

    func loadAll() throws -> [League] {
        let urls = try FileManager.default.contentsOfDirectory(
            at: folderURL, includingPropertiesForKeys: nil
        ).filter { $0.pathExtension == "json" }

        return try urls
            .map { try readCoordinated(at: $0) }
            .sorted(by: { $0.createdAt < $1.createdAt })
    }

    func save(_ league: League) throws {
        let file = fileURL(for: league.id)
        let payload = LeagueFile(league: league)
        let data = try encoder.encode(payload)
        try writeCoordinated(data: data, to: file)
    }

    func delete(_ leagueID: UUID) throws {
        let file = fileURL(for: leagueID)
        var coordError: NSError?
        var removeError: Error?
        NSFileCoordinator().coordinate(
            writingItemAt: file, options: .forDeleting, error: &coordError
        ) { url in
            do {
                try FileManager.default.removeItem(at: url)
            } catch {
                removeError = error
            }
        }
        if let coordError { throw RepoError.writeFailed(file, coordError) }
        if let removeError { throw RepoError.writeFailed(file, removeError) }
    }

    /// Verschiebt die League-Datei in den `.trash`-Ordner. Bleibt 30 Tage erhalten,
    /// dann wird sie via `pruneTrash()` gelöscht.
    func softDelete(_ leagueID: UUID, now: Date = Date()) throws {
        let source = fileURL(for: leagueID)
        try FileManager.default.createDirectory(
            at: trashFolderURL, withIntermediateDirectories: true
        )
        let trashName = "\(leagueID.uuidString)__\(Int(now.timeIntervalSince1970)).\(Self.trashFileExtension)"
        let destination = trashFolderURL.appendingPathComponent(trashName)

        var coordError: NSError?
        var moveError: Error?
        NSFileCoordinator().coordinate(
            writingItemAt: source, options: .forMoving,
            writingItemAt: destination, options: .forReplacing,
            error: &coordError
        ) { src, dst in
            do {
                try FileManager.default.moveItem(at: src, to: dst)
            } catch {
                moveError = error
            }
        }
        if let coordError { throw RepoError.writeFailed(source, coordError) }
        if let moveError { throw RepoError.writeFailed(source, moveError) }
    }

    /// Löscht Trash-Einträge, die älter als `softDeleteRetentionDays` sind.
    /// Best effort: einzelne Fehler werden ignoriert.
    @discardableResult
    func pruneTrash(now: Date = Date()) -> Int {
        guard let contents = try? FileManager.default.contentsOfDirectory(
            at: trashFolderURL, includingPropertiesForKeys: nil
        ) else { return 0 }

        let cutoff = now.addingTimeInterval(-Double(Self.softDeleteRetentionDays) * 86_400)
        var removed = 0
        for url in contents {
            guard let deletedAt = Self.parseDeletionDate(from: url.lastPathComponent) else { continue }
            if deletedAt < cutoff {
                if (try? FileManager.default.removeItem(at: url)) != nil {
                    removed += 1
                }
            }
        }
        return removed
    }

    var trashFolderURL: URL {
        folderURL.appendingPathComponent(Self.trashFolderName, isDirectory: true)
    }

    static func parseDeletionDate(from filename: String) -> Date? {
        let suffix = ".\(trashFileExtension)"
        guard filename.hasSuffix(suffix) else { return nil }
        let stem = String(filename.dropLast(suffix.count))
        guard let separator = stem.range(of: "__") else { return nil }
        let timestampString = stem[separator.upperBound...]
        guard let unix = TimeInterval(timestampString) else { return nil }
        return Date(timeIntervalSince1970: unix)
    }

    private func fileURL(for leagueID: UUID) -> URL {
        folderURL.appendingPathComponent("\(leagueID.uuidString).kartixa.json")
    }

    private func readCoordinated(at url: URL) throws -> League {
        var coordError: NSError?
        var inner: Result<League, Error>?
        NSFileCoordinator().coordinate(
            readingItemAt: url, options: [], error: &coordError
        ) { url in
            do {
                let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
                if let size = attributes[.size] as? Int, size > Self.maxFileSize {
                    inner = .failure(RepoError.fileTooLarge(url, size))
                    return
                }
                let data = try Data(contentsOf: url)
                let file = try decoder.decode(LeagueFile.self, from: data)
                guard file.schemaVersion == LeagueFile.currentSchemaVersion else {
                    inner = .failure(RepoError.unsupportedSchemaVersion(file.schemaVersion))
                    return
                }
                inner = .success(file.league)
            } catch {
                inner = .failure(error)
            }
        }
        if let coordError { throw RepoError.readFailed(url, coordError) }
        switch inner {
        case .success(let league): return league
        case .failure(let error): throw RepoError.readFailed(url, error)
        case .none: throw RepoError.readFailed(url, CocoaError(.fileReadUnknown))
        }
    }

    private func writeCoordinated(data: Data, to url: URL) throws {
        var coordError: NSError?
        var writeError: Error?
        NSFileCoordinator().coordinate(
            writingItemAt: url, options: .forReplacing, error: &coordError
        ) { url in
            do {
                try data.write(to: url, options: [.atomic, .completeFileProtectionUnlessOpen])
            } catch {
                writeError = error
            }
        }
        if let coordError { throw RepoError.writeFailed(url, coordError) }
        if let writeError { throw RepoError.writeFailed(url, writeError) }
    }
}

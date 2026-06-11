import Foundation
import Testing
@testable import kartixa

struct LeagueRepositoryTests {

    private func makeTempRepo() -> (LeagueRepository, URL) {
        let folder = FileManager.default.temporaryDirectory
            .appendingPathComponent("kartixa-tests-\(UUID().uuidString)", isDirectory: true)
        return (LeagueRepository(folderURL: folder), folder)
    }

    private func cleanup(_ folder: URL) {
        try? FileManager.default.removeItem(at: folder)
    }

    @Test func roundTripSingleLeague() throws {
        let (repo, folder) = makeTempRepo()
        defer { cleanup(folder) }

        let league = League(
            name: "Friday Night Karts",
            description: "Indoor series",
            tracks: ["Kart Arena", "RaceHall"],
            teams: [Team(name: "Red")],
            seasons: [
                Season(name: "2026", startDate: Date(), drivers: [Driver(name: "Alice", number: 7)])
            ]
        )

        try repo.save(league)
        let loaded = try repo.loadAll()

        #expect(loaded.count == 1)
        #expect(loaded[0].id == league.id)
        #expect(loaded[0].name == "Friday Night Karts")
        #expect(loaded[0].tracks == ["Kart Arena", "RaceHall"])
        #expect(loaded[0].seasons.count == 1)
        #expect(loaded[0].seasons[0].drivers.first?.name == "Alice")
    }

    @Test func loadAllSortedByCreatedAt() throws {
        let (repo, folder) = makeTempRepo()
        defer { cleanup(folder) }

        let older = League(
            name: "Older",
            createdAt: Date(timeIntervalSince1970: 1000),
            updatedAt: Date(timeIntervalSince1970: 1000)
        )
        let newer = League(
            name: "Newer",
            createdAt: Date(timeIntervalSince1970: 2000),
            updatedAt: Date(timeIntervalSince1970: 2000)
        )

        try repo.save(newer)
        try repo.save(older)

        let loaded = try repo.loadAll()
        #expect(loaded.map(\.name) == ["Older", "Newer"])
    }

    @Test func saveOverwritesExisting() throws {
        let (repo, folder) = makeTempRepo()
        defer { cleanup(folder) }

        var league = League(name: "Original")
        try repo.save(league)

        league.name = "Renamed"
        try repo.save(league)

        let loaded = try repo.loadAll()
        #expect(loaded.count == 1)
        #expect(loaded[0].name == "Renamed")
    }

    @Test func deleteRemovesLeague() throws {
        let (repo, folder) = makeTempRepo()
        defer { cleanup(folder) }

        let a = League(name: "A")
        let b = League(name: "B")
        try repo.save(a)
        try repo.save(b)

        try repo.delete(a.id)

        let loaded = try repo.loadAll()
        #expect(loaded.count == 1)
        #expect(loaded[0].id == b.id)
    }

    @Test func loadAllOnEmptyFolder() throws {
        let (repo, folder) = makeTempRepo()
        defer { cleanup(folder) }

        let loaded = try repo.loadAll()
        #expect(loaded.isEmpty)
    }

    @Test func softDeleteMovesFileToTrash() throws {
        let (repo, folder) = makeTempRepo()
        defer { cleanup(folder) }

        let league = League(name: "ToDelete")
        try repo.save(league)
        try repo.softDelete(league.id)

        let loaded = try repo.loadAll()
        #expect(loaded.isEmpty)

        let trashContents = try FileManager.default.contentsOfDirectory(
            at: repo.trashFolderURL, includingPropertiesForKeys: nil
        )
        #expect(trashContents.count == 1)
        #expect(trashContents[0].lastPathComponent.hasPrefix(league.id.uuidString))
    }

    @Test func softDeleteDoesNotAffectOtherLeagues() throws {
        let (repo, folder) = makeTempRepo()
        defer { cleanup(folder) }

        let a = League(name: "A")
        let b = League(name: "B")
        try repo.save(a)
        try repo.save(b)
        try repo.softDelete(a.id)

        let loaded = try repo.loadAll()
        #expect(loaded.count == 1)
        #expect(loaded[0].id == b.id)
    }

    @Test func pruneTrashRemovesOldEntries() throws {
        let (repo, folder) = makeTempRepo()
        defer { cleanup(folder) }

        let league = League(name: "Old")
        try repo.save(league)
        let longAgo = Date().addingTimeInterval(-31 * 86_400)
        try repo.softDelete(league.id, now: longAgo)

        let removed = repo.pruneTrash()
        #expect(removed == 1)

        let trashContents = try FileManager.default.contentsOfDirectory(
            at: repo.trashFolderURL, includingPropertiesForKeys: nil
        )
        #expect(trashContents.isEmpty)
    }

    @Test func pruneTrashKeepsRecentEntries() throws {
        let (repo, folder) = makeTempRepo()
        defer { cleanup(folder) }

        let league = League(name: "Recent")
        try repo.save(league)
        let recent = Date().addingTimeInterval(-5 * 86_400)
        try repo.softDelete(league.id, now: recent)

        let removed = repo.pruneTrash()
        #expect(removed == 0)

        let trashContents = try FileManager.default.contentsOfDirectory(
            at: repo.trashFolderURL, includingPropertiesForKeys: nil
        )
        #expect(trashContents.count == 1)
    }

    @Test func loadAllIgnoresTrashFolder() throws {
        let (repo, folder) = makeTempRepo()
        defer { cleanup(folder) }

        let a = League(name: "A")
        let b = League(name: "B")
        try repo.save(a)
        try repo.save(b)
        try repo.softDelete(a.id)

        let loaded = try repo.loadAll()
        #expect(loaded.count == 1)
        #expect(loaded[0].id == b.id)
    }

    @Test func parseDeletionDateFromFilename() {
        let id = UUID()
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        let filename = "\(id.uuidString)__\(Int(date.timeIntervalSince1970)).kartixa.json"

        let parsed = LeagueRepository.parseDeletionDate(from: filename)
        #expect(parsed == Date(timeIntervalSince1970: 1_700_000_000))
    }

    @Test func unsupportedSchemaVersionThrows() throws {
        let (repo, folder) = makeTempRepo()
        defer { cleanup(folder) }

        let id = UUID()
        let badPayload = """
        {
          "schemaVersion": 999,
          "league": {
            "id": "\(id.uuidString)",
            "name": "Future",
            "description": "",
            "tracks": [],
            "teams": [],
            "seasons": [],
            "createdAt": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z"
          }
        }
        """.data(using: .utf8)!

        try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
        let file = folder.appendingPathComponent("\(id.uuidString).kartixa.json")
        try badPayload.write(to: file)

        #expect(throws: LeagueRepository.RepoError.self) {
            try repo.loadAll()
        }
    }
}

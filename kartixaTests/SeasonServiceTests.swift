import Foundation
import Testing
@testable import kartixa

struct SeasonServiceTests {

    private func makeLeague(seasons: [Season] = []) -> League {
        League(
            name: "Test",
            description: "",
            tracks: ["Track A"],
            teams: [],
            seasons: seasons
        )
    }

    private func season(
        name: String,
        active: Bool = false,
        drivers: [Driver] = []
    ) -> Season {
        Season(
            name: name,
            startDate: Date(timeIntervalSince1970: 1000),
            isActive: active,
            drivers: drivers
        )
    }

    // MARK: - addSeason

    @Test func addSeasonAppendsNewSeasonAsActive() {
        let league = makeLeague(seasons: [season(name: "2025", active: true)])

        let updated = SeasonService.addSeason(
            to: league,
            name: "2026",
            startDate: Date(),
            copyDriversFrom: nil
        )

        #expect(updated.seasons.count == 2)
        #expect(updated.seasons.last?.name == "2026")
        #expect(updated.seasons.last?.isActive == true)
    }

    @Test func addSeasonDeactivatesPreviousSeasons() {
        let league = makeLeague(seasons: [
            season(name: "2024", active: false),
            season(name: "2025", active: true)
        ])

        let updated = SeasonService.addSeason(
            to: league,
            name: "2026",
            startDate: Date(),
            copyDriversFrom: nil
        )

        let activeCount = updated.seasons.filter(\.isActive).count
        #expect(activeCount == 1)
        #expect(updated.seasons.last?.isActive == true)
    }

    @Test func addSeasonCopiesDriversWhenRequested() {
        let drivers = [
            Driver(name: "Alice", number: 7),
            Driver(name: "Bob", number: 22)
        ]
        let source = season(name: "2025", active: true, drivers: drivers)
        let league = makeLeague(seasons: [source])

        let updated = SeasonService.addSeason(
            to: league,
            name: "2026",
            startDate: Date(),
            copyDriversFrom: source.id
        )

        #expect(updated.seasons.last?.drivers.count == 2)
        #expect(updated.seasons.last?.drivers.map(\.name) == ["Alice", "Bob"])
        #expect(updated.seasons.last?.drivers.map(\.number) == [7, 22])
    }

    @Test func addSeasonCopiedDriversGetNewIDs() {
        let original = Driver(name: "Alice", number: 7)
        let source = season(name: "2025", drivers: [original])
        let league = makeLeague(seasons: [source])

        let updated = SeasonService.addSeason(
            to: league,
            name: "2026",
            startDate: Date(),
            copyDriversFrom: source.id
        )

        let copied = updated.seasons.last?.drivers.first
        #expect(copied?.name == original.name)
        #expect(copied?.id != original.id)
    }

    @Test func addSeasonWithoutCopyStartsEmpty() {
        let source = season(name: "2025", drivers: [Driver(name: "Alice")])
        let league = makeLeague(seasons: [source])

        let updated = SeasonService.addSeason(
            to: league,
            name: "2026",
            startDate: Date(),
            copyDriversFrom: nil
        )

        #expect(updated.seasons.last?.drivers.isEmpty == true)
    }

    // MARK: - setActiveSeason

    @Test func setActiveSeasonOnlyMarksOne() throws {
        let s1 = season(name: "A", active: true)
        let s2 = season(name: "B", active: false)
        let league = makeLeague(seasons: [s1, s2])

        let updated = try SeasonService.setActiveSeason(s2.id, in: league)

        let active = updated.seasons.filter(\.isActive)
        #expect(active.count == 1)
        #expect(active.first?.id == s2.id)
    }

    @Test func setActiveSeasonNotFoundThrows() {
        let league = makeLeague(seasons: [season(name: "A", active: true)])

        #expect(throws: SeasonService.SeasonError.seasonNotFound) {
            try SeasonService.setActiveSeason(UUID(), in: league)
        }
    }

    // MARK: - deleteSeason

    @Test func deleteSeasonRemovesIt() throws {
        let s1 = season(name: "A", active: false)
        let s2 = season(name: "B", active: true)
        let league = makeLeague(seasons: [s1, s2])

        let updated = try SeasonService.deleteSeason(s1.id, from: league)

        #expect(updated.seasons.count == 1)
        #expect(updated.seasons.first?.id == s2.id)
    }

    @Test func deleteLastSeasonThrows() {
        let s1 = season(name: "A", active: true)
        let league = makeLeague(seasons: [s1])

        #expect(throws: SeasonService.SeasonError.lastSeasonCannotBeDeleted) {
            try SeasonService.deleteSeason(s1.id, from: league)
        }
    }

    @Test func deletingActiveSeasonPromotesAnother() throws {
        let s1 = season(name: "A", active: false)
        let s2 = season(name: "B", active: true)
        let league = makeLeague(seasons: [s1, s2])

        let updated = try SeasonService.deleteSeason(s2.id, from: league)

        #expect(updated.seasons.count == 1)
        #expect(updated.seasons.first?.isActive == true)
    }

    @Test func deletingInactiveSeasonKeepsActive() throws {
        let s1 = season(name: "A", active: true)
        let s2 = season(name: "B", active: false)
        let league = makeLeague(seasons: [s1, s2])

        let updated = try SeasonService.deleteSeason(s2.id, from: league)

        #expect(updated.seasons.count == 1)
        #expect(updated.seasons.first?.id == s1.id)
        #expect(updated.seasons.first?.isActive == true)
    }

    @Test func deleteNonExistentSeasonThrows() {
        let league = makeLeague(seasons: [
            season(name: "A", active: true),
            season(name: "B", active: false)
        ])

        #expect(throws: SeasonService.SeasonError.seasonNotFound) {
            try SeasonService.deleteSeason(UUID(), from: league)
        }
    }
}

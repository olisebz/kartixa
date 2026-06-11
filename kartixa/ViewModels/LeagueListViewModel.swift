import Foundation
import Observation

@Observable
final class LeagueListViewModel {
    var leagues: [League] = []
    var errorMessage: String?

    private let repository: LeagueRepository

    init(repository: LeagueRepository = .bestAvailable()) {
        self.repository = repository
        repository.pruneTrash()
        load()
    }

    func load() {
        do {
            leagues = try repository.loadAll()
            errorMessage = nil
        } catch {
            errorMessage = String(describing: error)
        }
    }

    @discardableResult
    func create(_ league: League) -> Bool {
        do {
            try repository.save(league)
            load()
            return true
        } catch {
            errorMessage = String(describing: error)
            return false
        }
    }

    @discardableResult
    func update(_ league: League) -> Bool {
        do {
            try repository.save(league)
            load()
            return true
        } catch {
            errorMessage = String(describing: error)
            return false
        }
    }

    @discardableResult
    func delete(_ leagueID: UUID) -> Bool {
        do {
            try repository.softDelete(leagueID)
            load()
            return true
        } catch {
            errorMessage = String(describing: error)
            return false
        }
    }
}

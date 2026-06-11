import Foundation
import Observation

@Observable
final class RaceFormViewModel {
    enum Mode {
        case create
        case edit(Race)
    }

    enum TrackSelection: Hashable {
        case preset(String)
        case custom
    }

    var name: String
    var trackSelection: TrackSelection
    var customTrack: String
    var date: Date
    var results: [DraftRaceResult]

    let mode: Mode
    let availableTracks: [String]
    let availableDrivers: [Driver]

    init(mode: Mode, availableTracks: [String], availableDrivers: [Driver]) {
        self.mode = mode
        self.availableTracks = availableTracks
        // Sentinel-Driver wird im Form-Picker separat als Option angeboten,
        // also aus der regulären Liste entfernen.
        self.availableDrivers = availableDrivers.filter { !$0.isUnknownDriver }

        switch mode {
        case .create:
            self.name = ""
            self.trackSelection = availableTracks.first.map(TrackSelection.preset) ?? .custom
            self.customTrack = ""
            self.date = Date()
            self.results = []
        case .edit(let race):
            self.name = race.name
            if availableTracks.contains(race.track) {
                self.trackSelection = .preset(race.track)
                self.customTrack = ""
            } else {
                self.trackSelection = .custom
                self.customTrack = race.track
            }
            self.date = race.date
            self.results = race.results.map(DraftRaceResult.init(from:))
        }
    }

    var trackValue: String {
        switch trackSelection {
        case .preset(let track): track
        case .custom: customTrack
        }
    }

    var raceID: UUID? {
        switch mode {
        case .create: nil
        case .edit(let race): race.id
        }
    }

    // MARK: - Result-Mutationen

    func addResult() {
        results.append(DraftRaceResult())
    }

    func removeResult(at index: Int) {
        guard results.indices.contains(index) else { return }
        results.remove(at: index)
    }

    func moveUp(_ index: Int) {
        guard index > 0, results.indices.contains(index) else { return }
        results.swapAt(index, index - 1)
    }

    func moveDown(_ index: Int) {
        guard index < results.count - 1, results.indices.contains(index) else { return }
        results.swapAt(index, index + 1)
    }

    func setDriver(_ driverID: UUID?, at index: Int) {
        guard results.indices.contains(index) else { return }
        results[index].driverId = driverID
        results[index].teamId = teamID(for: driverID)
    }

    func toggleFastestLap(at index: Int) {
        guard results.indices.contains(index) else { return }
        let willEnable = !results[index].fastestLap
        if willEnable {
            for i in results.indices {
                results[i].fastestLap = (i == index)
            }
        } else {
            results[index].fastestLap = false
        }
    }

    func toggleDNF(at index: Int) {
        guard results.indices.contains(index) else { return }
        results[index].dnf.toggle()
        if results[index].dnf {
            results[index].fastestLap = false
            results[index].lapTime = ""
        }
        // DNF-Einträge wandern automatisch ans Ende, damit Position-Preview stimmt.
        let nonDNF = results.filter { !$0.dnf }
        let dnf = results.filter { $0.dnf }
        results = nonDNF + dnf
    }

    // MARK: - Punkte-Preview

    func pointsPreview(at index: Int) -> Int {
        guard results.indices.contains(index) else { return 0 }
        let draft = results[index]
        let nonDNF = results.filter { !$0.dnf }
        let position: Int
        if draft.dnf {
            let dnfBefore = results.prefix(index).filter { $0.dnf }.count
            position = nonDNF.count + dnfBefore + 1
        } else {
            let nonDNFBefore = results.prefix(index).filter { !$0.dnf }.count
            position = nonDNFBefore + 1
        }
        let isUnknown = draft.driverId == Driver.unknownDriverSentinelID
        return PointsCalculator.calculate(
            position: position,
            fastestLap: draft.fastestLap && !draft.dnf,
            isUnknownDriver: isUnknown,
            dnf: draft.dnf,
            penalties: draft.penalties
        )
    }

    func displayPosition(at index: Int) -> String {
        guard results.indices.contains(index) else { return "—" }
        let draft = results[index]
        if draft.dnf { return "DNF" }
        let nonDNFBefore = results.prefix(index).filter { !$0.dnf }.count
        return "\(nonDNFBefore + 1)."
    }

    // MARK: - Lookup

    func driverName(for id: UUID?) -> String {
        guard let id else { return "—" }
        if id == Driver.unknownDriverSentinelID { return Driver.unknownDriverName }
        return availableDrivers.first(where: { $0.id == id })?.name ?? "—"
    }

    private func teamID(for driverID: UUID?) -> UUID? {
        guard let driverID, driverID != Driver.unknownDriverSentinelID else { return nil }
        return availableDrivers.first(where: { $0.id == driverID })?.currentTeamId
    }

    // MARK: - Build

    func build() throws -> Race {
        try RaceService.buildRace(
            id: raceID,
            name: name,
            track: trackValue,
            date: date,
            drafts: results
        )
    }
}

import Foundation
import Testing
@testable import kartixa

struct PointsCalculatorTests {

    @Test func position1NoFastestLap() {
        let points = PointsCalculator.calculate(
            position: 1, fastestLap: false, isUnknownDriver: false, dnf: false, penalties: []
        )
        #expect(points == 25)
    }

    @Test func position10NoFastestLap() {
        let points = PointsCalculator.calculate(
            position: 10, fastestLap: false, isUnknownDriver: false, dnf: false, penalties: []
        )
        #expect(points == 1)
    }

    @Test func position11NoPoints() {
        let points = PointsCalculator.calculate(
            position: 11, fastestLap: false, isUnknownDriver: false, dnf: false, penalties: []
        )
        #expect(points == 0)
    }

    @Test func fastestLapBonusInTop10() {
        let p1 = PointsCalculator.calculate(
            position: 1, fastestLap: true, isUnknownDriver: false, dnf: false, penalties: []
        )
        let p10 = PointsCalculator.calculate(
            position: 10, fastestLap: true, isUnknownDriver: false, dnf: false, penalties: []
        )
        #expect(p1 == 26)
        #expect(p10 == 2)
    }

    @Test func fastestLapNoBonusOutsideTop10() {
        let points = PointsCalculator.calculate(
            position: 11, fastestLap: true, isUnknownDriver: false, dnf: false, penalties: []
        )
        #expect(points == 0)
    }

    @Test func dnfYieldsZero() {
        let points = PointsCalculator.calculate(
            position: 1, fastestLap: true, isUnknownDriver: false, dnf: true, penalties: []
        )
        #expect(points == 0)
    }

    @Test func unknownDriverYieldsZero() {
        let points = PointsCalculator.calculate(
            position: 1, fastestLap: true, isUnknownDriver: true, dnf: false, penalties: []
        )
        #expect(points == 0)
    }

    @Test func pointsPenaltySubtracted() {
        let penalty = RaceResultPenalty(type: .points, value: 5)
        let points = PointsCalculator.calculate(
            position: 1, fastestLap: false, isUnknownDriver: false, dnf: false, penalties: [penalty]
        )
        #expect(points == 20)
    }

    @Test func multiplePointsPenaltiesSummed() {
        let p1 = RaceResultPenalty(type: .points, value: 3)
        let p2 = RaceResultPenalty(type: .points, value: 5)
        let points = PointsCalculator.calculate(
            position: 1, fastestLap: false, isUnknownDriver: false, dnf: false, penalties: [p1, p2]
        )
        #expect(points == 17)
    }

    @Test func nonPointsPenaltiesIgnored() {
        let secondsPenalty = RaceResultPenalty(type: .seconds, value: 10)
        let gridPenalty = RaceResultPenalty(type: .grid, value: 3)
        let points = PointsCalculator.calculate(
            position: 1,
            fastestLap: false,
            isUnknownDriver: false,
            dnf: false,
            penalties: [secondsPenalty, gridPenalty]
        )
        #expect(points == 25)
    }

    @Test func fastestLapBonusAppliedBeforePenalty() {
        let penalty = RaceResultPenalty(type: .points, value: 5)
        let points = PointsCalculator.calculate(
            position: 1, fastestLap: true, isUnknownDriver: false, dnf: false, penalties: [penalty]
        )
        #expect(points == 21)
    }
}

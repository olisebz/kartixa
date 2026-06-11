import Foundation
import Observation

@Observable
final class AppState {
    var isICloudAvailable: Bool

    init() {
        self.isICloudAvailable = ICloudStore.isAvailable
    }

    func refreshICloudAvailability() {
        self.isICloudAvailable = ICloudStore.isAvailable
    }
}

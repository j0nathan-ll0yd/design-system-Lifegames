import LifegamesTokens
import SwiftUI

public struct OnboardingPermissionProps: Equatable, Sendable {
    public let id: String
    public let icon: String
    public let title: String
    public let description: String
    public let accentColor: Color
    public let status: PermissionDisplayStatus

    public enum PermissionDisplayStatus: Equatable, Sendable {
        case pending
        case requesting
        case granted
        case denied
        case skipped
    }

    public init(
        id: String,
        icon: String,
        title: String,
        description: String,
        accentColor: Color,
        status: PermissionDisplayStatus
    ) {
        self.id = id
        self.icon = icon
        self.title = title
        self.description = description
        self.accentColor = accentColor
        self.status = status
    }
}

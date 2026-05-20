import LifegamesTokens
import SwiftUI

struct DevActivityIcon: View {
    let type: String

    private var config: (icon: String, color: Color) {
        switch type {
        case "commit": return ("chevron.right", .colorAccentGreen)
        case "pr_merged": return ("arrow.merge", .colorAccentPurple)
        case "pr_opened": return ("arrow.triangle.branch", .colorAccentBlue)
        case "pr_closed": return ("xmark.circle", .colorHealthRed)
        case "issue_opened": return ("exclamationmark.circle", .colorAccentAmber)
        case "issue_closed": return ("checkmark.circle", .colorAccentGreen)
        default: return ("circle.fill", .colorTextMuted)
        }
    }

    var body: some View {
        Image(systemName: config.icon)
            .font(.system(size: 9))
            .foregroundStyle(config.color)
            .frame(width: 16, height: 16)
    }
}

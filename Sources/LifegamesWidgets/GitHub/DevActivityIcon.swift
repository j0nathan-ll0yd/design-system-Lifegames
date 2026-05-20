import LifegamesTokens
import SwiftUI

struct DevActivityIcon: View {
    let type: String

    private var config: (icon: String, color: Color) {
        switch type {
        case "commit": return ("chevron.right", Color.colorAccentGreen)
        case "pr_merged": return ("arrow.merge", Color.colorAccentPurple)
        case "pr_opened": return ("arrow.triangle.branch", Color.colorAccentBlue)
        case "pr_closed": return ("xmark.circle", Color.colorHealthRed)
        case "issue_opened": return ("exclamationmark.circle", Color.colorAccentAmber)
        case "issue_closed": return ("checkmark.circle", Color.colorAccentGreen)
        default: return ("circle.fill", Color.colorTextMuted)
        }
    }

    var body: some View {
        Image(systemName: config.icon)
            .font(.system(size: 9))
            .foregroundStyle(config.color)
            .frame(width: 16, height: 16)
    }
}

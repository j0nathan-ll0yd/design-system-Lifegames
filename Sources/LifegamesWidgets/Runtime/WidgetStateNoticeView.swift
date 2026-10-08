import LifegamesComponents
import LifegamesCopy
import LifegamesTokens
import SwiftUI

/// The two honest non-data states. Each shows a notice and no data value.
enum WidgetStateNotice {
    case unavailable
    case suppressed

    var text: String {
        switch self {
        case .unavailable: CopyLoader.widgets.widgetState.unavailable
        case .suppressed: CopyLoader.widgets.widgetState.suppressed
        }
    }
}

/// Notice body. Use inside a card that already draws its own chrome.
/// Same anatomy as the web `.widget-state-notice` (GOVERNANCE P2): one line of
/// muted text, no icon, no data.
struct WidgetStateNoticeView: View {
    let notice: WidgetStateNotice

    var body: some View {
        VStack(spacing: 8) {
            Text(notice.text)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(LGColor.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .padding(.horizontal, 18)
    }
}

/// Full card: widget header, notice, neon chrome. The header shows no timestamp: nothing is live. Names the title and the notice for VoiceOver.
struct WidgetStateNoticeCard: View {
    let notice: WidgetStateNotice
    let title: String
    let accent: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: title.uppercased(), dotColor: accent, timestamp: "")
            WidgetStateNoticeView(notice: notice)
        }
        .neonCard(accent: accent)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title). \(notice.text)")
    }
}

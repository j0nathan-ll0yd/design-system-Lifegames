import LifegamesTokens
import SwiftUI

/// **Status:** Experimental
///
/// Unstyled metric content: a top-left accent icon, a large prominent value,
/// and an uppercased caption label. Brand-agnostic — the `accent` color is
/// injected (default `LGColor.accentDefault`) and all colors resolve to
/// semantic tokens. Callers supply card chrome via `.neonCard(accent:)` (or
/// any other card modifier); this view intentionally ships no background.
///
/// Reconciles the OMD `StatCardView` layout (uppercased label, value with
/// `minimumScaleFactor`, top-left icon, no `unit`) without shallowing the
/// deep `MetricCardView`, which keeps its baked-in `.portalCard()` and `unit`.
public struct MetricContentView: View {
    public let label: String
    public let value: String
    public let systemImage: String
    public var accent: Color

    public init(
        label: String,
        value: String,
        systemImage: String,
        accent: Color = LGColor.accentDefault
    ) {
        self.label = label
        self.value = value
        self.systemImage = systemImage
        self.accent = accent
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: Spacing.s100) {
            HStack {
                Image(systemName: systemImage)
                    .font(.system(size: 14))
                    .foregroundStyle(accent)
                Spacer()
            }

            Text(value)
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(LGColor.textTitle)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            Text(label)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(LGColor.textMuted)
                .textCase(.uppercase)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

#if os(iOS)
    #Preview("Metric Content") {
        HStack(spacing: Spacing.s300) {
            MetricContentView(
                label: "Downloads",
                value: "47",
                systemImage: "arrow.down.circle.fill",
                accent: LGColor.accentBlue
            )
            .neonCard(accent: LGColor.accentBlue)

            MetricContentView(
                label: "Storage",
                value: "2.4 GB",
                systemImage: "internaldrive.fill",
                accent: LGColor.accentAmber
            )
            .neonCard(accent: LGColor.accentAmber)
        }
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }
#endif

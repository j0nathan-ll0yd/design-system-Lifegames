import LifegamesTokens
import SwiftUI

/// Monospaced label with trailing divider line.
/// Extracted from HealthFeatureView.sectionHeader() pattern.
public struct SectionHeader: View {
    public let title: String

    public init(title: String) {
        self.title = title
    }

    public var body: some View {
        HStack {
            Text(title)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .kerning(3)
                .foregroundStyle(LGColor.textMuted)
            VStack { Divider().overlay(LGColor.textSubtle) }
        }
        .padding(.top, 8)
    }
}

#Preview("Section Header") {
    VStack(spacing: 16) {
        SectionHeader(title: "METRICS")
        SectionHeader(title: "SLEEP")
        SectionHeader(title: "WORKOUTS")
    }
    .padding()
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

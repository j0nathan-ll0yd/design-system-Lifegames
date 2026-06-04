import LifegamesComponents
import LifegamesTokens
import LifegamesWidgets
import SwiftUI

struct DSWidgetsShowcase: View {
    private static let identity = IdentityCardProps(
        name: "Alexandria Konstantinopolous-Richardson",
        title: "Senior Software Engineer",
        bio: "Building distributed systems at scale. Previously infra at two unicorns.",
        tagline: "ship it or skip it",
        githubUrl: "https://github.com/lifegames",
        linkedinUrl: "https://linkedin.com/in/lifegames"
    )

    private static let hydration = HydrationProps(
        waterOz: 64,
        caffeineMg: 180,
        waterMax: 120,
        caffeineMax: 500,
        waterRangeLo: 64,
        waterRangeHi: 96,
        caffeineRangeLo: 0,
        caffeineRangeHi: 300
    )

    private static let heartRate = HeartRateProps(
        bpm: 62,
        hrv: 48,
        zone: "resting"
    )

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                IdentityCardView(props: Self.identity)
                HydrationView(props: Self.hydration)
                HeartRateView(props: Self.heartRate)
                HealthWidgetsShowcase()
            }
            .padding()
        }
        .background(LGColor.surfaceBase)
        .navigationTitle("Widgets")
        #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
        #endif
            .preferredColorScheme(.dark)
    }
}

#Preview("DS Widgets") {
    NavigationStack {
        DSWidgetsShowcase()
    }
    .preferredColorScheme(.dark)
}

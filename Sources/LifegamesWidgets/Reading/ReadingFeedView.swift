import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct ReadingFeedView: View {
    private let state: WidgetState<ReadingFeedProps>

    public init(state: WidgetState<ReadingFeedProps>) {
        self.state = state
    }

    public init(props: ReadingFeedProps) {
        state = props.articles.isEmpty ? .empty : .populated(props)
    }

    public var body: some View {
        switch state {
        case .loading:
            ReadingFeedSkeletonView()
        case .empty:
            ReadingFeedEmptyView()
        case let .populated(props):
            ReadingFeedPopulatedView(props: props)
        }
    }
}

private struct ReadingFeedPopulatedView: View {
    let props: ReadingFeedProps

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "READING FEED", dotColor: Color.colorAccentAmber, timestamp: "recent")

            VStack(spacing: 0) {
                ForEach(Array(props.articles.enumerated()), id: \.offset) { index, article in
                    HStack(alignment: .top, spacing: 0) {
                        Text(article.title)
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color.colorTextTitle)
                            .lineLimit(1)

                        Spacer(minLength: 8)

                        Text("(\(article.source))")
                            .font(.system(size: 10))
                            .foregroundStyle(Color.colorTextMuted)

                        Text(article.date)
                            .font(.system(size: 9, design: .monospaced))
                            .foregroundStyle(Color.colorTextMuted.opacity(0.7))
                            .padding(.leading, 6)
                    }
                    .padding(.vertical, 8)

                    if index < props.articles.count - 1 {
                        Divider().overlay(Color.white.opacity(0.05))
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentAmber)
    }
}

private struct ReadingFeedEmptyView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "READING FEED", dotColor: Color.colorAccentAmber, timestamp: "recent")

            VStack(spacing: 8) {
                Image(systemName: "doc.text")
                    .font(.system(size: 24))
                    .foregroundStyle(Color.colorAccentAmber.opacity(0.4))
                Text("No articles yet")
                    .font(.system(size: 11))
                    .foregroundStyle(Color.colorTextMuted)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
        }
        .neonCard(accent: Color.colorAccentAmber)
    }
}

private struct ReadingFeedSkeletonView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "READING FEED", dotColor: Color.colorAccentAmber, timestamp: "recent")

            VStack(spacing: 0) {
                ForEach(0 ..< 4, id: \.self) { index in
                    HStack(alignment: .center, spacing: 0) {
                        SkeletonBar(width: 140, height: 11)
                        Spacer(minLength: 8)
                        SkeletonBar(width: 60, height: 10)
                        SkeletonBar(width: 30, height: 9)
                            .padding(.leading, 6)
                    }
                    .padding(.vertical, 8)

                    if index < 3 {
                        Divider().overlay(Color.white.opacity(0.05))
                    }
                }
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: Color.colorAccentAmber)
    }
}

#Preview("Reading Feed — Populated") {
    ReadingFeedView(props: ReadingFeedProps(articles: [
        .init(title: "SwiftUI Performance Tips", source: "swiftbysundell.com", date: "2d ago"),
        .init(title: "The State of AI in 2025", source: "every.to", date: "3d ago"),
        .init(title: "Building Design Systems", source: "smashingmagazine.com", date: "5d ago"),
    ]))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}

#Preview("Reading Feed — Loading") {
    ReadingFeedView(state: .loading)
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}

#Preview("Reading Feed — Empty") {
    ReadingFeedView(state: .empty)
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}

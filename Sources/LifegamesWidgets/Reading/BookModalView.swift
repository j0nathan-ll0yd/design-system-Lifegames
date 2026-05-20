import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct BookModalView: View {
    public let props: BookModalProps
    public var onDismiss: (() -> Void)?

    public init(props: BookModalProps, onDismiss: (() -> Void)? = nil) {
        self.props = props
        self.onDismiss = onDismiss
    }

    public var body: some View {
        VStack(spacing: 0) {
            headerSection
            Divider().overlay(Color.white.opacity(0.06))
            bodySection
        }
        .background(Color.colorSurfaceRaised)
        .clipShape(RoundedRectangle(cornerRadius: 20))
        .overlay(
            RoundedRectangle(cornerRadius: 20)
                .stroke(Color.colorBorderSubtle, lineWidth: 1)
        )
        .frame(maxWidth: 400)
    }

    private var headerSection: some View {
        HStack(alignment: .top, spacing: 16) {
            RoundedRectangle(cornerRadius: 4)
                .fill(
                    LinearGradient(
                        colors: [Color.colorAccentAmber.opacity(0.2), Color.colorAccentBlue.opacity(0.1)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 100, height: 150)
                .overlay(
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(Color.colorAccentAmber.opacity(0.4))
                )

            VStack(alignment: .leading, spacing: 6) {
                Text(props.title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(Color.colorTextTitle)

                if let series = props.series {
                    HStack(spacing: 4) {
                        Text(series)
                            .font(.system(size: 11))
                            .foregroundStyle(Color.colorTextMuted)
                        if let num = props.seriesNumber {
                            Text("Book \(num)")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(Color.colorAccentGreen)
                        }
                    }
                }

                Text(props.author)
                    .font(.system(size: 12))
                    .foregroundStyle(Color.colorTextMuted)

                if let rating = props.rating {
                    HStack(spacing: 2) {
                        ForEach(1 ... 5, id: \.self) { star in
                            Image(systemName: star <= rating ? "star.fill" : "star")
                                .font(.system(size: 11))
                                .foregroundStyle(Color.colorAccentAmber)
                        }
                    }
                }
            }

            Spacer()

            if let onDismiss {
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(Color.colorTextMuted)
                        .frame(width: 28, height: 28)
                        .background(Color.white.opacity(0.06))
                        .clipShape(Circle())
                }
            }
        }
        .padding(20)
    }

    private var bodySection: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 20) {
                StatBlock(value: props.pages.map(String.init) ?? "\u{2014}", label: "Pages")
                StatBlock(value: props.year.map(String.init) ?? "\u{2014}", label: "Published")
                StatBlock(value: props.statusLabel, label: "Status")
            }

            if props.status == "in_progress", let progress = props.progress {
                VStack(spacing: 4) {
                    ProgressView(value: Double(progress), total: 100)
                        .tint(Color.colorAccentAmber)
                    Text("\(progress)% complete")
                        .font(.system(size: 10))
                        .foregroundStyle(Color.colorTextMuted)
                }
            }

            if let desc = props.description {
                Text(desc)
                    .font(.system(size: 11))
                    .foregroundStyle(Color.colorTextMuted)
                    .lineLimit(4)
            }

            if !props.genres.isEmpty {
                FlowLayout(spacing: 6) {
                    ForEach(props.genres, id: \.self) { genre in
                        Text(genre)
                            .font(.system(size: 9, weight: .medium))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.white.opacity(0.05))
                            .clipShape(Capsule())
                            .foregroundStyle(Color.colorTextMuted)
                    }
                }
            }

            if let notes = props.notes, props.status == "completed" {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Notes")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(Color.colorTextMuted)
                        .textCase(.uppercase)
                    Text(notes)
                        .font(.system(size: 11))
                        .foregroundStyle(Color.colorTextTitle)
                }
            }
        }
        .padding(20)
    }
}

private struct StatBlock: View {
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(Color.colorTextTitle)
            Text(label)
                .font(.system(size: 9))
                .foregroundStyle(Color.colorTextMuted)
        }
    }
}

private struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache _: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache _: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> (size: CGSize, positions: [CGPoint]) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var totalHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            totalHeight = y + rowHeight
        }
        return (CGSize(width: maxWidth, height: totalHeight), positions)
    }
}

#Preview("Book Modal") {
    BookModalView(props: BookModalProps(
        title: "Project Hail Mary",
        author: "Andy Weir",
        asin: "B08FHBV4ZX",
        status: "in_progress",
        statusLabel: "READING",
        progress: 67,
        pages: 496,
        year: 2021,
        description: "A lone astronaut must save the earth from disaster.",
        genres: ["Sci-Fi", "Adventure", "Space"],
        series: "Standalone"
    ), onDismiss: {})
        .padding()
        .background(Color.colorSurfaceBase)
        .preferredColorScheme(.dark)
}

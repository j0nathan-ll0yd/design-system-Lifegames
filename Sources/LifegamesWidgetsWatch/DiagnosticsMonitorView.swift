import LifegamesComponentsWatch
import LifegamesTokens
import SwiftUI

public struct DiagnosticsMonitorView: View {
    public let props: DiagnosticsMonitorProps
    public var onClearTap: () -> Void
    public var onTransferTap: () -> Void

    // SAFETY: Static formatters to avoid per-body allocation (S59).
    private nonisolated(unsafe) static let byteFormatter: ByteCountFormatter = {
        let f = ByteCountFormatter()
        f.allowedUnits = [.useKB, .useMB]
        f.countStyle = .file
        return f
    }()

    private nonisolated(unsafe) static let relativeFormatter: RelativeDateTimeFormatter = {
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .abbreviated
        return f
    }()

    public init(
        props: DiagnosticsMonitorProps,
        onClearTap: @escaping () -> Void,
        onTransferTap: @escaping () -> Void
    ) {
        self.props = props
        self.onClearTap = onClearTap
        self.onTransferTap = onTransferTap
    }

    public var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: Spacing.s200) {
                countsCard
                eventCountLine
                actionRow
                Divider().background(LGColor.borderSubtle)
                logHeader
                logRows
            }
            .padding(.horizontal, Spacing.s200)
            .padding(.bottom, Spacing.s100)
        }
        .background(LGColor.surfaceBase)
    }

    private var eventCountLine: some View {
        Text("\(props.totalEventCount) events")
            .font(Font.Tokens.caption2())
            .foregroundStyle(LGColor.textMuted)
            .frame(maxWidth: .infinity, alignment: .trailing)
            .accessibilityLabel("Total: \(props.totalEventCount) events")
    }

    private var countsCard: some View {
        let maxCount = max(1, props.counts.map(\.count).max() ?? 1)
        return VStack(spacing: Spacing.s100) {
            ForEach(props.counts, id: \.category) { row in
                CountRowView(row: row, maxCount: maxCount)
            }
        }
        .padding(Spacing.s150)
        .background(RoundedRectangle(cornerRadius: 20).fill(LGColor.surfaceRaised))
    }

    private var actionRow: some View {
        HStack {
            Text(Self.byteFormatter.string(fromByteCount: Int64(props.fileSizeBytes)))
                .font(Font.Tokens.caption())
                .foregroundStyle(LGColor.textMuted)
                .accessibilityLabel("Log size")
                .accessibilityValue(Self.byteFormatter.string(fromByteCount: Int64(props.fileSizeBytes)))
            Spacer()
            Button(action: onClearTap) {
                Image(systemName: "trash.fill")
            }
            .buttonStyle(.bordered)
            .tint(LGColor.healthRed)
            .accessibilityLabel("Clear log")
            .accessibilityHint("Permanently deletes all recorded events")

            Button(action: onTransferTap) { transferIcon }
                .buttonStyle(.bordered)
                .tint(LGColor.accentBlue)
                .disabled(props.transferStatus == .uploading)
                .accessibilityLabel(transferAccessibilityLabel)
                .accessibilityHint("Sends the log file to the iPhone")
        }
    }

    @ViewBuilder private var transferIcon: some View {
        switch props.transferStatus {
        case .idle: Image(systemName: "arrow.up.circle.fill")
        case .uploading: ProgressView()
        case .success: Image(systemName: "checkmark.circle.fill")
        case .failure: Image(systemName: "exclamationmark.triangle.fill")
        }
    }

    private var transferAccessibilityLabel: String {
        switch props.transferStatus {
        case .idle: return "Transfer log to iPhone"
        case .uploading: return "Transfer in progress"
        case .success: return "Transfer complete"
        case .failure: return "Transfer failed"
        }
    }

    private var logHeader: some View {
        Text("RECENT ACTIVITY")
            .font(Font.Tokens.caption2())
            .foregroundStyle(LGColor.textMuted)
            .accessibilityAddTraits(.isHeader)
    }

    private var logRows: some View {
        ForEach(props.entries.prefix(25)) { entry in
            LogRowView(
                entry: entry,
                referenceDate: props.referenceDate,
                formatter: Self.relativeFormatter
            )
        }
    }
}

private struct CountRowView: View {
    let row: DiagnosticsMonitorProps.CategoryCount
    let maxCount: Int

    var body: some View {
        HStack(spacing: Spacing.s100) {
            Rectangle()
                .fill(diagnosticsAccent(for: row.category))
                .frame(width: 4, height: 16)
            Text(label(for: row.category))
                .font(Font.Tokens.code())
                .foregroundStyle(LGColor.textPrimary)
            ZStack(alignment: .leading) {
                Capsule().fill(LGColor.surfaceInset)
                Capsule()
                    .fill(diagnosticsAccent(for: row.category))
                    .frame(width: max(2, CGFloat(row.count) / CGFloat(maxCount) * 80))
            }
            .frame(height: 6)
            Text("\(row.count)")
                .font(Font.Tokens.code())
                .foregroundStyle(LGColor.textMuted)
                .monospacedDigit()
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label(for: row.category)) category, \(row.count) events")
    }

    private func label(for c: DiagnosticsMonitorProps.Category) -> String {
        switch c {
        case .syn: return "SYN"
        case .bg: return "BG"
        case .hlt: return "HLT"
        case .loc: return "LOC"
        case .lif: return "LIF"
        case .con: return "CON"
        }
    }
}

private struct LogRowView: View {
    let entry: DiagnosticsMonitorProps.LogEntry
    let referenceDate: Date
    let formatter: RelativeDateTimeFormatter

    var body: some View {
        HStack(alignment: .top, spacing: Spacing.s100) {
            Circle()
                .fill(diagnosticsAccent(for: entry.category))
                .frame(width: 6, height: 6)
                .padding(.top, Spacing.s50)
            Text(formatter.localizedString(for: entry.timestamp, relativeTo: referenceDate))
                .font(Font.Tokens.code())
                .foregroundStyle(LGColor.textMuted)
            Text(entry.message)
                .font(Font.Tokens.caption())
                .foregroundStyle(LGColor.textPrimary)
                .lineLimit(3)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(entry.category.rawValue.uppercased()) \(entry.message)")
        .accessibilityValue(formatter.localizedString(for: entry.timestamp, relativeTo: referenceDate))
    }
}

/// Single source of truth for the category-to-color mapping. Internal to the file.
func diagnosticsAccent(for category: DiagnosticsMonitorProps.Category) -> Color {
    switch category {
    case .syn: return LGColor.accentPurple
    case .bg: return LGColor.accentGreen
    case .hlt: return LGColor.accentPink
    case .loc: return LGColor.accentBlue
    case .lif: return LGColor.healthGreen
    case .con: return LGColor.accentDefault
    }
}

#Preview("empty") { DiagnosticsMonitorView(props: .previewEmpty, onClearTap: {}, onTransferTap: {}).preferredColorScheme(.dark) }
#Preview("populated") { DiagnosticsMonitorView(props: .previewPopulated, onClearTap: {}, onTransferTap: {}).preferredColorScheme(.dark) }
#Preview("many") { DiagnosticsMonitorView(props: .previewMany, onClearTap: {}, onTransferTap: {}).preferredColorScheme(.dark) }
#Preview("transferring") { DiagnosticsMonitorView(props: .previewTransferring, onClearTap: {}, onTransferTap: {}).preferredColorScheme(.dark) }

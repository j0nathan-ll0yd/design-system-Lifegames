import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct ComingSoonView: View {
    public let props: ComingSoonProps

    public init(props: ComingSoonProps) {
        self.props = props
    }

    public var body: some View {
        VStack(spacing: 0) {
            dossierHeader

            VStack(spacing: 20) {
                statusRow
                divider
                fieldsSection
                divider
                objectivesSection
            }
            .padding(24)

            dossierFooter
        }
        .background(Color.white.opacity(0.03))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
        .frame(maxWidth: 480)
    }

    private var dossierHeader: some View {
        HStack {
            Text("MISSION DOSSIER")
                .font(.system(size: 10, weight: .semibold))
                .kerning(3)
                .foregroundStyle(Color.colorTextMuted)

            Spacer()

            Text("CC-\(Calendar.current.component(.year, from: Date()))")
                .font(.system(size: 9, design: .monospaced))
                .foregroundStyle(Color.white.opacity(0.15))
        }
        .padding(.horizontal, 24)
        .padding(.vertical, 14)
        .overlay(alignment: .bottom) {
            Rectangle().fill(Color.white.opacity(0.06)).frame(height: 1)
        }
    }

    private var statusRow: some View {
        HStack(spacing: 10) {
            PulsingDot(color: Color.colorAccentAmber)
            Text("MISSION PENDING")
                .font(.system(size: 14, weight: .bold))
                .kerning(2)
                .foregroundStyle(Color.colorAccentAmber)
        }
    }

    private var divider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.06))
            .frame(height: 1)
    }

    private var fieldsSection: some View {
        VStack(spacing: 14) {
            HStack(alignment: .top, spacing: 16) {
                FieldItem(label: "Operative", value: props.operative)
                FieldItem(label: "Callsign", value: props.callsign, color: Color.colorAccentBlue)
            }
            HStack(alignment: .top, spacing: 16) {
                FieldItem(label: "Mission Type", value: props.missionType, color: Color.colorAccentPink)
                FieldItem(label: "ETA", value: props.eta, color: Color.colorAccentAmber)
            }
            FieldItem(label: "Briefing", value: props.briefing, color: Color.colorTextMuted)
        }
    }

    private var objectivesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("OBJECTIVES")
                .font(.system(size: 9, weight: .medium))
                .kerning(3)
                .foregroundStyle(Color.colorTextMuted)

            ForEach(Array(props.objectives.enumerated()), id: \.offset) { _, objective in
                HStack(spacing: 10) {
                    ZStack {
                        RoundedRectangle(cornerRadius: 3)
                            .stroke(
                                objective.completed ? Color.colorAccentGreen.opacity(0.4) : Color.white.opacity(0.12),
                                lineWidth: 1
                            )
                            .frame(width: 14, height: 14)

                        if objective.completed {
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.colorAccentGreen.opacity(0.1))
                                .frame(width: 14, height: 14)
                            Image(systemName: "checkmark")
                                .font(.system(size: 8, weight: .bold))
                                .foregroundStyle(Color.colorAccentGreen)
                        }
                    }

                    Text(objective.text)
                        .font(.system(size: 11))
                        .foregroundStyle(
                            objective.completed ? Color.colorAccentGreen.opacity(0.6) : Color.colorTextMuted
                        )
                }
            }
        }
    }

    private var dossierFooter: some View {
        Text("Classification: Unclassified // Distribution: Public")
            .font(.system(size: 8))
            .kerning(2)
            .foregroundStyle(Color.white.opacity(0.12))
            .textCase(.uppercase)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .overlay(alignment: .top) {
                Rectangle().fill(Color.white.opacity(0.06)).frame(height: 1)
            }
    }
}

private struct FieldItem: View {
    let label: String
    let value: String
    var color: Color = .colorTextTitle

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(label.uppercased())
                .font(.system(size: 8, weight: .medium))
                .kerning(2)
                .foregroundStyle(Color.colorTextMuted)
            Text(value)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct PulsingDot: View {
    let color: Color
    @State private var isPulsing = false

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 8, height: 8)
            .shadow(color: color.opacity(0.4), radius: 6)
            .opacity(isPulsing ? 0.4 : 1.0)
            .animation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true), value: isPulsing)
            .task { isPulsing = true }
    }
}

#Preview("Coming Soon") {
    ComingSoonView(props: ComingSoonProps(
        operative: "Jonathan Lloyd",
        callsign: "j0nathan-ll0yd",
        missionType: "Portfolio Launch",
        eta: "TBD",
        briefing: "A datastream-themed portfolio is under construction.",
        objectives: [
            .init(text: "Design system established", completed: true),
            .init(text: "Core infrastructure deployed", completed: true),
            .init(text: "Widget systems online", completed: false),
            .init(text: "Live data feeds connected", completed: false),
            .init(text: "Final clearance granted", completed: false),
        ]
    ))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}

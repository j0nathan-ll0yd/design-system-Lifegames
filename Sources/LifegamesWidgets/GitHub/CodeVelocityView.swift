import Charts
import LifegamesComponents
import LifegamesTokens
import SwiftUI

public struct CodeVelocityView: View {
    public let props: CodeVelocityProps

    public init(props: CodeVelocityProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: "CODE VELOCITY", dotColor: .colorAccentGreen, timestamp: "52w")

            Chart {
                ForEach(Array(props.weeks.enumerated()), id: \.offset) { index, week in
                    AreaMark(
                        x: .value("Week", index),
                        y: .value("Additions", week.additions)
                    )
                    .foregroundStyle(.colorAccentGreen.opacity(0.3))
                    .interpolationMethod(.catmullRom)

                    LineMark(
                        x: .value("Week", index),
                        y: .value("Additions", week.additions)
                    )
                    .foregroundStyle(.colorAccentGreen)
                    .interpolationMethod(.catmullRom)

                    AreaMark(
                        x: .value("Week", index),
                        y: .value("Deletions", -week.deletions)
                    )
                    .foregroundStyle(.colorHealthRed.opacity(0.3))
                    .interpolationMethod(.catmullRom)

                    LineMark(
                        x: .value("Week", index),
                        y: .value("Deletions", -week.deletions)
                    )
                    .foregroundStyle(.colorHealthRed)
                    .interpolationMethod(.catmullRom)
                }
            }
            .chartXAxis(.hidden)
            .chartYAxis(.hidden)
            .frame(height: 100)
            .padding(.horizontal, 18)
            .padding(.bottom, 16)

            HStack(spacing: 16) {
                Label("Additions", systemImage: "plus")
                    .font(.system(size: 9))
                    .foregroundStyle(.colorAccentGreen)
                Label("Deletions", systemImage: "minus")
                    .font(.system(size: 9))
                    .foregroundStyle(.colorHealthRed)
            }
            .padding(.horizontal, 18)
            .padding(.bottom, 12)
        }
        .neonCard(accent: .colorAccentGreen)
    }
}

import LifegamesComponents
import LifegamesCopy
import LifegamesTokens
import SwiftUI

private let bioCopy = CopyLoader.widgets.bio

public struct BioTerminalView: View {
    public let props: BioTerminalProps
    @State private var visibleLines = 0

    public init(props: BioTerminalProps) {
        self.props = props
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            WidgetHeaderView(label: bioCopy.title.uppercased(), dotColor: Color.colorAccentDefault, timestamp: bioCopy.timestampZsh)

            VStack(spacing: 0) {
                terminalTitleBar

                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(props.lines.enumerated()), id: \.offset) { index, line in
                        if index < visibleLines {
                            terminalLineView(line)
                                .transition(.opacity)
                        }
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(LGColor.gray950)
            }
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .padding(.horizontal, 14)
            .padding(.bottom, 14)
        }
        .neonCard(accent: Color.colorAccentDefault)
        .task {
            await revealLines()
        }
    }

    private var terminalTitleBar: some View {
        HStack(spacing: 6) {
            Circle().fill(Color.colorAccentRed).frame(width: 10, height: 10)
            Circle().fill(Color.colorAccentAmber).frame(width: 10, height: 10)
            Circle().fill(Color.colorAccentGreen).frame(width: 10, height: 10)
            Spacer()
            Text(bioCopy.terminalTitle)
                .font(.system(size: 10, design: .monospaced))
                .foregroundStyle(Color.colorTextMuted)
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.04))
    }

    private func terminalLineView(_ line: BioTerminalProps.TerminalLine) -> some View {
        HStack(spacing: 0) {
            switch line.type {
            case "prompt":
                Text("$ ")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color.colorAccentGreen)
                Text(line.text ?? "")
                    .font(.system(size: 11, design: .monospaced))
                    .foregroundStyle(Color.colorTextTitle)
            case "cursor":
                Text("$ ")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundStyle(Color.colorAccentGreen)
                BlinkingCursor()
            case "blank":
                Text(" ")
                    .font(.system(size: 11, design: .monospaced))
            default:
                if let text = line.text, text.hasPrefix("\u{2192}") {
                    Text("\u{2192} ")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(Color.colorAccentBlue)
                    Text(String(text.dropFirst(2)))
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(Color.colorTextMuted)
                } else {
                    Text(line.text ?? "")
                        .font(.system(size: 11, design: .monospaced))
                        .foregroundStyle(Color.colorTextMuted)
                }
            }
        }
        .padding(.vertical, 1)
    }

    private func revealLines() async {
        for i in 1 ... props.lines.count {
            try? await Task.sleep(for: .milliseconds(120))
            withAnimation(.easeIn(duration: 0.15)) {
                visibleLines = i
            }
        }
    }
}

private struct BlinkingCursor: View {
    @State private var visible = true

    var body: some View {
        Rectangle()
            .fill(Color.colorAccentGreen)
            .frame(width: 7, height: 14)
            .opacity(visible ? 1 : 0)
            .animation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true), value: visible)
            .task { visible.toggle() }
    }
}

#Preview("Bio Terminal") {
    BioTerminalView(props: BioTerminalProps(lines: [
        .init(type: "prompt", text: "gpg -k"),
        .init(type: "output", text: "\u{2192} pub   rsa4096 2002-01-01 [SC]"),
        .init(type: "output", text: "\u{2192} uid   Jonathan Lloyd (Software Engineer)"),
        .init(type: "blank"),
        .init(type: "prompt", text: "uptime"),
        .init(type: "output", text: "\u{2192} up 24+ years professionally and counting"),
        .init(type: "blank"),
        .init(type: "prompt", text: "cat philosophy.txt"),
        .init(type: "output", text: "\u{2192} \"Creating things I'm proud of\""),
        .init(type: "output", text: "\u{2192} \"Enjoying the passage of time\""),
        .init(type: "cursor"),
    ]))
    .padding()
    .background(Color.colorSurfaceBase)
    .preferredColorScheme(.dark)
}

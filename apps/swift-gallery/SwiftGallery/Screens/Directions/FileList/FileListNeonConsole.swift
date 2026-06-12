import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

struct FileListNeonConsole: View {
    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            ScrollView {
                VStack(spacing: Spacing.s300) {
                    ForEach(OMDFixtures.sampleFiles) { file in
                        FileRowNeon(file: file)
                    }
                }
                .padding(Spacing.s400)
                .padding(.bottom, 80)
            }
            .background(
                LinearGradient(
                    colors: [LGColor.surfaceBase, LGColor.surfaceDeep],
                    startPoint: .top,
                    endPoint: .bottom
                )
            )
            .gradientBackground()

            // Floating add button
            Button {} label: {
                ZStack {
                    Circle()
                        .fill(LGColor.accentBlue)
                        .shadow(color: LGColor.accentBlue.opacity(0.6), radius: 12, x: 0, y: 4)
                    Image(systemName: "plus")
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(LGColor.textTitle)
                }
                .frame(width: 56, height: 56)
            }
            .frame(minWidth: 44, minHeight: 44)
            .contentShape(.rect)
            .padding(.trailing, Spacing.s500)
            .padding(.bottom, Spacing.s600)
        }
        #if os(iOS)
        .navigationBarTitleDisplayMode(.inline)
        #endif
        .toolbar {
            #if os(iOS)
                ToolbarItem(placement: .principal) {
                    Text("LIBRARY")
                        .font(.system(size: 13, weight: .bold, design: .monospaced))
                        .foregroundStyle(LGColor.accentBlue)
                        .shadow(color: LGColor.accentBlue.opacity(0.5), radius: 4)
                }
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {} label: {
                        Image(systemName: "arrow.clockwise")
                            .foregroundStyle(LGColor.accentCyan)
                            .shadow(color: LGColor.accentCyan.opacity(0.6), radius: 4)
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(.rect)

                    Button {} label: {
                        Image(systemName: "clock.badge.fill")
                            .foregroundStyle(LGColor.accentPink)
                            .shadow(color: LGColor.accentPink.opacity(0.6), radius: 4)
                    }
                    .frame(minWidth: 44, minHeight: 44)
                    .contentShape(.rect)
                }
            #endif
        }
    }
}

enum FileListScreen {
    static let entry = ScreenEntry(
        id: "file-list",
        title: "File List",
        directions: [
            ScreenDirection(id: "neon-console", label: "Neon Console", make: { AnyView(FileListNeonConsole()) }),
        ]
    )
}

#Preview("File List — Neon Console") {
    NavigationStack {
        FileListNeonConsole()
    }
    .background(LGColor.surfaceBase)
    .preferredColorScheme(.dark)
}

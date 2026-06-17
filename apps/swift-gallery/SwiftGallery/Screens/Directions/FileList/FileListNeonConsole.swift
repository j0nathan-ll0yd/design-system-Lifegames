import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTemplates
import LifegamesTokens
import SwiftUI

struct FileListNeonConsole: View {
    var body: some View {
        // Built on ListTemplate: the media rows ARE the `row` slot
        // (`FileRowNeon` keeps its own neon card + swipe affordances). The
        // floating add button, the NavigationStack title, and the toolbar stay
        // host-owned. An `emptyState` is supplied per the template contract even
        // though the sample data is always populated. The neon cards own their
        // own surfaces, so the row background / separators / insets are cleared.
        ZStack(alignment: .bottomTrailing) {
            ListTemplate(
                items: OMDFixtures.sampleFiles,
                accent: LGColor.accentBlue,
                emptyState: LGEmptyState(
                    title: "No Files Yet",
                    systemImage: "tray",
                    description: "Files you download will appear in your library.",
                    accent: LGColor.accentBlue
                )
            ) { file in
                FileRowNeon(file: file)
                    .listRowInsets(EdgeInsets(
                        top: Spacing.s150,
                        leading: Spacing.s400,
                        bottom: Spacing.s150,
                        trailing: Spacing.s400
                    ))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
            }

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
        .navigationBarTitleDisplayMode(.large)
        #endif
        .navigationTitle("Library")
        .toolbar {
            #if os(iOS)
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

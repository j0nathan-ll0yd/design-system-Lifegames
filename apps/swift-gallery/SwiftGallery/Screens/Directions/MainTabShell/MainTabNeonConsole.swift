import LifegamesComponents
import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

struct MainTabNeonConsole: View {
    @State private var selectedTab = 0

    private let downloadingFile = OMDFixtures.sampleFiles[1]
    private let downloadProgress = 0.62

    var body: some View {
        VStack(spacing: 0) {
            ActiveDownloadBannerView(
                file: downloadingFile,
                progress: downloadProgress,
                style: .neonConsole
            )
            .background(.ultraThinMaterial)
            .overlay(alignment: .bottom) {
                Rectangle()
                    .fill(LGColor.accentBlue.opacity(0.3))
                    .frame(height: 1)
                    .shadow(color: LGColor.accentBlue.opacity(0.5), radius: 4)
            }

            Group {
                if selectedTab == 0 { NeonFilesStub() } else { NeonAccountStub() }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            neonTabBar
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LGColor.surfaceBase.ignoresSafeArea())
    }

    private var neonTabBar: some View {
        HStack(spacing: 0) {
            neonTabButton(index: 0, label: "Files", icon: "folder.fill")
            neonTabButton(index: 1, label: "Account", icon: "person.crop.circle.fill")
        }
        .padding(.top, Spacing.s200)
        .padding(.bottom, Spacing.s400)
        .background(
            LGColor.surfaceDeep
                .overlay(alignment: .top) {
                    Rectangle()
                        .fill(LGColor.accentBlue.opacity(0.25))
                        .frame(height: 1)
                        .shadow(color: LGColor.accentBlue.opacity(0.4), radius: 3)
                }
        )
    }

    private func neonTabButton(index: Int, label: String, icon: String) -> some View {
        let isSelected = selectedTab == index
        return Button {
            selectedTab = index
        } label: {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 20))
                    .shadow(color: isSelected ? LGColor.accentBlue.opacity(0.7) : .clear, radius: 8)
                Text(label)
                    .font(OMDFont.medium(10))
            }
            .foregroundStyle(isSelected ? LGColor.accentBlue : LGColor.textMuted)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 44)
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }
}

private struct NeonFilesStub: View {
    var body: some View {
        ZStack {
            LGColor.surfaceBase.ignoresSafeArea()
            VStack(spacing: Spacing.s300) {
                Image(systemName: "folder.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(LGColor.accentBlue)
                    .shadow(color: LGColor.accentBlue.opacity(0.6), radius: 12)
                Text("FILES")
                    .font(OMDFont.medium(12))
                    .foregroundStyle(LGColor.textMuted)
                    .tracking(3)
            }
        }
    }
}

private struct NeonAccountStub: View {
    var body: some View {
        ZStack {
            LGColor.surfaceBase.ignoresSafeArea()
            VStack(spacing: Spacing.s300) {
                Image(systemName: "person.crop.circle.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(LGColor.accentPink)
                    .shadow(color: LGColor.accentPink.opacity(0.6), radius: 12)
                Text("ACCOUNT")
                    .font(OMDFont.medium(12))
                    .foregroundStyle(LGColor.textMuted)
                    .tracking(3)
            }
        }
    }
}

enum MainTabShellScreen {
    static let entry = ScreenEntry(
        id: "main-tab-shell",
        title: "Main Tab Shell",
        directions: [
            ScreenDirection(id: "neon-console", label: "Neon Console") {
                AnyView(MainTabNeonConsole())
            },
        ]
    )
}

#Preview("Main Tab — Neon Console") {
    MainTabNeonConsole()
        .preferredColorScheme(.dark)
}

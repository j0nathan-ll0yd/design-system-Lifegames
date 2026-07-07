import LifegamesComponentsCore
import LifegamesTokens
import SwiftUI

#if canImport(MapKit) && !os(watchOS)
    import MapKit
#endif

// MARK: - LocationMapTile

/// Small map tile for the bento grid.
///
/// On iOS and macOS: renders a live MapKit `Map` centered on the provided coordinates with
/// a pulsing marker. A gradient overlay at the bottom shows the place name, subtitle, and
/// a "currently here" pill.
///
/// On watchOS (or if MapKit is unavailable): renders a blue-gradient placeholder with the
/// place name and subtitle centered.
public struct LocationMapTile: View {
    public let latitude: Double
    public let longitude: Double
    public let placeName: String
    public let subtitle: String
    public let statusText: String

    public init(
        latitude: Double,
        longitude: Double,
        placeName: String,
        subtitle: String,
        statusText: String
    ) {
        self.latitude = latitude
        self.longitude = longitude
        self.placeName = placeName
        self.subtitle = subtitle
        self.statusText = statusText
    }

    public var body: some View {
        ZStack(alignment: .bottom) {
            mapLayer
            gradientOverlay
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(placeName), \(subtitle). \(statusText)")
    }

    // MARK: - Map or placeholder

    @ViewBuilder
    private var mapLayer: some View {
        #if canImport(MapKit) && !os(watchOS)
            MapKitLayer(latitude: latitude, longitude: longitude)
        #else
            placeholderMap
        #endif
    }

    private var placeholderMap: some View {
        LinearGradient(
            colors: [LGColor.accentBlue.opacity(0.3), LGColor.surfaceDeep],
            startPoint: .top,
            endPoint: .bottom
        )
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .overlay(
            Image(systemName: "map.fill")
                .font(.system(size: 32))
                .foregroundStyle(LGColor.accentBlue.opacity(0.4))
        )
    }

    // MARK: - Bottom gradient overlay

    private var gradientOverlay: some View {
        VStack(alignment: .leading, spacing: Spacing.s100) {
            Spacer()
            LinearGradient(
                colors: [.clear, LGColor.surfaceDeep.opacity(0.92)],
                startPoint: .top,
                endPoint: .bottom
            )
            .frame(height: 80)
            .overlay(alignment: .bottom) {
                VStack(alignment: .leading, spacing: Spacing.s50) {
                    Text(placeName)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(LGColor.textTitle)
                        .lineLimit(1)
                    Text(subtitle)
                        .font(.system(size: 11))
                        .foregroundStyle(LGColor.textMuted)
                        .lineLimit(1)
                    HStack(spacing: Spacing.s100) {
                        Circle()
                            .fill(LGColor.accentGreen)
                            .frame(width: 6, height: 6)
                        Text(statusText)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(LGColor.accentGreen)
                    }
                    .padding(.horizontal, Spacing.s200)
                    .padding(.vertical, Spacing.s100)
                    .background(LGColor.accentGreen.opacity(0.12))
                    .clipShape(Capsule())
                }
                .padding(.horizontal, Spacing.s300)
                .padding(.bottom, Spacing.s300)
            }
        }
    }
}

// MARK: - MapKit layer (iOS + macOS only)

#if canImport(MapKit) && !os(watchOS)
    private struct MapKitLayer: View {
        let latitude: Double
        let longitude: Double

        /// The camera is derived from the props on every render — NOT seeded into @State,
        /// which would freeze it at the first coordinates ever passed (consumers often
        /// render once at a 0,0 placeholder before live coordinates load, which left the
        /// camera parked over open ocean). The map is non-interactive (constant binding,
        /// hit testing off), so there is no user camera state to preserve.
        private var position: MapCameraPosition {
            .region(
                MKCoordinateRegion(
                    center: CLLocationCoordinate2D(
                        latitude: latitude,
                        longitude: longitude
                    ),
                    span: MKCoordinateSpan(
                        latitudeDelta: 0.008,
                        longitudeDelta: 0.008
                    )
                )
            )
        }

        var body: some View {
            Map(position: .constant(position)) {
                Marker(
                    "",
                    coordinate: CLLocationCoordinate2D(
                        latitude: latitude,
                        longitude: longitude
                    )
                )
                .tint(LGColor.accentBlue)
            }
            .mapStyle(.standard(elevation: .automatic, pointsOfInterest: .excludingAll))
            .allowsHitTesting(false)
            .frame(maxWidth: .infinity)
            .frame(minHeight: 140)
        }
    }
#endif

// MARK: - Previews

#if os(iOS)
    #Preview("Location Map Tile") {
        LocationMapTile(
            latitude: 37.7955,
            longitude: -122.3937,
            placeName: "Blue Bottle Coffee",
            subtitle: "Ferry Building",
            statusText: "Currently here · 34m"
        )
        .frame(height: 180)
        .padding()
        .background(LGColor.surfaceBase)
        .preferredColorScheme(.dark)
    }
#endif

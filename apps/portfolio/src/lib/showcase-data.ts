// Baseline data for the static showcase (`apps/portfolio`).
//
// The showcase is a demo surface, not a test fixture: it renders ONE
// representative dashboard. Data is sourced from the canonical `@j0nathan-ll0yd/fixtures`
// package (the same source the web consumes) so it never drifts from the real
// widget contracts. Full-page visual regression lives on the web consumer; DS
// widget coverage lives in Storybook — the showcase does not carry its own suite.
import {type DashboardFixture, getDashboardFixture} from '@j0nathan-ll0yd/fixtures'
import {rawFixtures} from '@j0nathan-ll0yd/fixtures/raw'
import type {FocusExport, TheatreReviewsExport} from '@j0nathan-ll0yd/portal-contract/schemas'

export interface ShowcaseData {
  dashboard: DashboardFixture
  theatre: TheatreReviewsExport
  /** Raw focus export; `null` for the baseline showcase (no overlay active). */
  focus: FocusExport | null
}

/** The representative (`baseline`) dashboard payload for the showcase. */
export function getShowcaseData(): ShowcaseData {
  return {dashboard: getDashboardFixture('baseline'), theatre: rawFixtures.theatreReviews.baseline, focus: null}
}

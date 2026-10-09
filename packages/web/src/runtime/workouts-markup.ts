// The Workouts recovery-day empty state (atlas decision 0160, review M02).
//
// One owner for the markup: Workouts.astro renders it on the server and
// updateWorkouts writes it when a successful export carries no workouts, so a
// card that turns empty on the client shows exactly what the server would.
// Its styles are global (components.css), so markup written on the client
// renders the same as server markup.
import {widgets} from '@j0nathan-ll0yd/copy'
import {esc} from './html-utils'

const REST_ICON = '<svg class="workout-rest-icon" viewBox="0 0 56 56" fill="none">' +
  '<circle cx="28" cy="20" r="10" stroke="var(--neon-pink)" stroke-width="1.5" opacity="0.7"></circle>' +
  '<path d="M16 38 Q20 32 28 30 Q36 32 40 38" stroke="var(--neon-pink)" stroke-width="1.5" opacity="0.5" fill="none"></path>' +
  '<path d="M12 44 Q18 38 28 36 Q38 38 44 44" stroke="var(--neon-blue)" stroke-width="1" opacity="0.3" fill="none"></path>' +
  '<circle cx="28" cy="20" r="3" fill="var(--neon-pink)" opacity="0.6"></circle>' +
  '<path d="M24 18 Q28 14 32 18" stroke="rgba(255,255,255,0.3)" stroke-width="0.8" fill="none"></path>' +
  '</svg>'

/** The recovery-day empty state: a `[data-state-notice="empty"]` block. */
export function workoutsRestHtml(): string {
  return '<div class="workout-rest-center" data-state-notice="empty">' +
    REST_ICON +
    '<div class="workout-rest-heading">' +
    esc(widgets.workouts.recoveryDay) +
    '</div>' +
    '<div class="workout-rest-sub">' +
    esc(widgets.workouts.none) +
    '</div>' +
    '<div class="workout-rest-insight">' +
    esc(widgets.workouts.recoveryBody) +
    '</div>' +
    '</div>'
}

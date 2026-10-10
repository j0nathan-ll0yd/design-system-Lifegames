// Markup a template and a browser updater both write (atlas decision 0160).
// One string per element, so a card the browser fills matches the server's
// markup element for element. The styles for these classes are global, so
// they apply to client-written nodes too.
import {widgets} from '@j0nathan-ll0yd/copy'
import {esc} from './html-utils'
import type {RangeBand} from './widget-views'

/** HeartRate's empty notice (copy key widgets.heartRate.empty). */
export function heartRateEmptyHtml(): string {
  return '<div class="hr-empty" data-state-notice="empty"><span class="hr-empty-label">' + esc(widgets.heartRate.empty) + '</span></div>'
}

/** MovementRings' empty notice. */
export function movementEmptyHtml(): string {
  return '<div class="mv-empty" data-state-notice="empty"><span class="mv-empty-label">' + esc(widgets.movement.empty) + '</span></div>'
}

/** A Hydration vessel's target-range band with its two bound labels. */
export function hydrationRangeHtml(kind: 'water' | 'coffee', band: RangeBand): string {
  const label = (edge: 'top' | 'bottom', text: string): string =>
    '<div class="hydra-range-label hydra-range-label-' + edge + ' hydra-range-label-' + kind + '">' + esc(text) + '</div>'
  return '<div class="hydra-range hydra-range-' +
    kind +
    '" style="bottom: ' +
    band.bottomPct +
    '%; height: ' +
    band.heightPct +
    '%">' +
    label('top', band.hi) +
    label('bottom', band.lo) +
    '</div>'
}

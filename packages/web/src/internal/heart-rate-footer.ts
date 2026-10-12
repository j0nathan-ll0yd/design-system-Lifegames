// HeartRate's footer writer, shared by updateHeartRate (runtime/updaters) and
// updateHeartRateFooter (runtime/updaters-movement).
//
// INTERNAL to this package: no key of the package.json exports map reaches
// src/internal/, so no consumer can import this module.
import type {HeartRateView} from '../runtime/widget-views'

/** Write HeartRate's footer vitals (RHR · RR · Temp) from its view. */
export function writeHeartRateFooter(view: HeartRateView): void {
  for (const [id, text] of [['hrFooterRhr', view.rhrText], ['hrFooterRr', view.rrText], ['hrFooterTemp', view.tempText]] as const) {
    const el = document.getElementById(id)
    if (el) {
      el.textContent = text
    }
  }
}

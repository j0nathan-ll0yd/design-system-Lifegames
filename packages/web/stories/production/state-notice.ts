import {html} from 'lit'
import {widgets} from '@j0nathan-ll0yd/copy'

// Shared story render for the honest non-data states (atlas decision 0160).
// Mirrors the markup the Astro widgets render for `unavailable` and
// `suppressed`: the card chrome (title, a quiet live dot, no timestamp label)
// plus one notice, and NO data value. Not a story file: the Storybook glob
// only collects *.stories.ts.
export type NoticeState = 'unavailable' | 'suppressed'

export function renderStateCard(opts: {id: string; title: string; accentClass?: string; state: NoticeState}) {
  const notice = opts.state === 'unavailable' ? widgets.widgetState.unavailable : widgets.widgetState.suppressed
  return html`
    <div id=${opts.id} class="tri-card ${opts.accentClass ?? ''}" data-ssr-state=${opts.state}>
      <div class="widget-header">
        <h3 class="widget-label">${opts.title}</h3>
        <div class="widget-header-right">
          <div class="live-dot"></div>
          <span class="widget-timestamp"></span>
        </div>
      </div>
      <div class="widget-body">
        <div class="widget-empty widget-state-notice" data-state-notice=${opts.state} role="status">
          ${notice}
        </div>
      </div>
    </div>
  `
}

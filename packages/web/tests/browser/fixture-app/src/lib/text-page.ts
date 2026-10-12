// Filler for the text-page fixtures: enough sections that the card is several
// viewports tall at 1400x900, so a page that cannot scroll hides its footer.
export const SECTIONS = Array.from({length: 12},
  (_, i) => ({
    id: `section-${i + 1}`,
    heading: `Fixture section ${i + 1}`,
    paragraphs: Array.from({length: 3}, (_, j) => `Fixture paragraph ${i + 1}.${j + 1}. ` + 'Filler text that wraps across the card width. '.repeat(6))
  }))

export const LINKS = [
  {href: '/text-page/', label: 'Text page', current: true},
  {href: '/text-page-control/', label: 'Control'}
]

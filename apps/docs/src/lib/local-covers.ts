// The docs site's cover mirror (public/images/books), as Bookshelf's `localCovers`
// prop. A Bookshelf fixture's CloudFront cover renders same-origin only when its
// exact path is in this list; every other book keeps the placeholder.
/// <reference path="../virtual-modules.d.ts" />
import localCovers from 'virtual:docs-local-covers'

/** The fixture with the mirror list added, for every Bookshelf render on a docs page. */
export function withLocalCovers<T extends object>(fixture: T): T & {localCovers: readonly string[]} {
  return {...fixture, localCovers}
}

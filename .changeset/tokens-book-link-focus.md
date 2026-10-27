---
'@j0nathan-ll0yd/tokens': patch
---

Move the green book focus ring in `base.css` from `.shelf-book:focus-visible` to `.shelf-book-link:focus-visible::after`, 3px outside the overlay, and give the link itself no ring. The Bookshelf tile no longer takes focus; its title link does, and the link's overlay covers the tile (web minor, atlas decision 0160 D5).

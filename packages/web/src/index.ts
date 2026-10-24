// Primitives
export { default as Card } from './components/Card.astro'
export { default as Pill } from './components/Pill.astro'
export { default as Modal } from './components/Modal.astro'
export { default as PollStatus } from './components/PollStatus.astro'
export { default as SiteFooterNav } from './components/SiteFooterNav.astro'
export type { SiteFooterNavLink } from './components/SiteFooterNav.types'
export { default as Skeleton } from './components/Skeleton.astro'
export { default as TextPage } from './components/TextPage.astro'
export { default as TextPageSection } from './components/TextPageSection.astro'

// Widget re-exports from category barrels
export * from './widgets/github/index'
export * from './widgets/location/index'
export * from './widgets/health/index'
export * from './widgets/reading/index'
export * from './widgets/identity/index'
export * from './widgets/other/index'

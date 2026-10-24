/** One page link in a SiteFooterNav. */
export interface SiteFooterNavLink {
  href: string
  label: string
  /** True for the link to the page being rendered: it carries aria-current="page". */
  current?: boolean
}

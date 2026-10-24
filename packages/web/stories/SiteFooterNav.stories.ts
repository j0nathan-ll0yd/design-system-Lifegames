import type {Meta, StoryObj} from '@storybook/web-components-vite'
import {html} from 'lit'

// Hand-renders the markup of SiteFooterNav.astro with lit, like every primitive story.
// The styles come from packages/web/src/styles/primitives.css, imported once in
// .storybook/preview.ts. "Site" is identity.navigation.siteNavLabel, the component's
// default accessible name. The four links are the website's text pages.
const meta: Meta = {
  title: 'Primitives/SiteFooterNav',
  tags: ['autodocs'],
  render: () =>
    html`
    <nav class="lg-site-footer-nav" aria-label="Site">
      <ul class="lg-site-footer-nav-list">
        <li class="lg-site-footer-nav-item"><a href="#" class="lg-site-footer-nav-link">About</a></li>
        <li class="lg-site-footer-nav-item"><a href="#" class="lg-site-footer-nav-link">Contact</a></li>
        <li class="lg-site-footer-nav-item"><a href="#" class="lg-site-footer-nav-link" aria-current="page">Developers</a></li>
        <li class="lg-site-footer-nav-item"><a href="#" class="lg-site-footer-nav-link">Privacy</a></li>
      </ul>
    </nav>
  `
}

export default meta
type Story = StoryObj

export const Default: Story = {}

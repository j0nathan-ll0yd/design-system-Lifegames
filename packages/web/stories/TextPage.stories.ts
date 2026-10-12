import type {Meta, StoryObj} from '@storybook/web-components-vite'
import {html} from 'lit'

// Hand-renders the markup of TextPage.astro and TextPageSection.astro with lit, like
// every primitive story. The styles come from packages/web/src/styles/primitives.css,
// imported once in .storybook/preview.ts. The main element omits id="main-content" so
// the autodocs page, which mounts every story at once, holds no duplicate id.
const meta: Meta = {
  title: 'Primitives/TextPage',
  tags: ['autodocs'],
  parameters: {layout: 'fullscreen'},
  render: () =>
    html`
    <main class="lg-text-page">
      <article class="lg-text-page-card" aria-labelledby="story-text-page-title">
        <header class="lg-text-page-header">
          <h1 id="story-text-page-title" class="lg-text-page-title">Page title</h1>
          <p class="lg-text-page-meta">Last updated <time>October 2026</time></p>
        </header>
        <div class="lg-text-page-body">
          <p class="lg-text-page-lede">An intro paragraph that sets out what the page covers.</p>
          <section class="lg-text-page-section" id="story-first" aria-labelledby="story-first-heading">
            <h2 id="story-first-heading" class="lg-text-page-section-heading">First section</h2>
            <div class="lg-text-page-section-body">
              <p>A body paragraph. Text pages carry copy from the copy package, one section per heading.</p>
              <p>A second paragraph, with <a href="#">an inline link</a>.</p>
            </div>
          </section>
          <section class="lg-text-page-section" id="story-second" aria-labelledby="story-second-heading">
            <h2 id="story-second-heading" class="lg-text-page-section-heading">Second section</h2>
            <div class="lg-text-page-section-body">
              <ul>
                <li><strong>Label</strong> <a href="#">value</a><small>A note under the item.</small></li>
                <li><a href="#">Another item</a><small>Its note.</small></li>
              </ul>
            </div>
          </section>
        </div>
        <footer class="lg-text-page-footer">
          <a href="#" class="lg-text-page-back">Back</a>
          <nav class="lg-text-page-nav">
            <a href="#" class="lg-text-page-nav-link" aria-current="page">This page</a>
            <a href="#" class="lg-text-page-nav-link">Other page</a>
          </nav>
        </footer>
      </article>
    </main>
  `
}

export default meta
type Story = StoryObj

export const Default: Story = {}

import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
// Import the SAME stylesheet the component ships, so the snapshot guards the
// real glitch CSS (not a copy). The test-runner captures with
// `animations: 'disabled'`, freezing the infinite glitch keyframes to their
// initial frame — a deterministic baseline.
import '../../src/widgets/identity/NotFound.css';

const meta: Meta = {
  title: 'Production/Identity/NotFound',
  tags: ['stable', 'autodocs'],
  render: () => html`
    <main id="main-content" class="glitch-page" aria-label="Error 404 — page not found">
      <div class="glitch-container">
        <div class="glitch-404" aria-hidden="true">404</div>
        <div class="glitch-subtitle">Glitch Protocol Engaged</div>
        <div class="glitch-sub2">datastream integrity compromised</div>
      </div>
      <a href="/" class="glitch-return">Return to Dashboard</a>
    </main>
  `,
};

export default meta;
type Story = StoryObj;

export const Default: Story = {};

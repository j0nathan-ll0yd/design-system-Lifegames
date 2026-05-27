import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

const meta: Meta = {
  title: 'Integration/shadcn',
  tags: ['stable'],
  parameters: {
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component: 'Smoke fixture verifying shadcn OKLCH CSS vars from `@lifegames/tokens/shadcn`.',
      },
    },
  },
};

export default meta;
type Story = StoryObj;

const shadcnStyles = html`
  <style>
    .shadcn-demo {
      font-family: var(--lg-font-family-base, sans-serif);
      background: var(--background);
      color: var(--foreground);
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-height: 200px;
    }
    .shadcn-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      border-radius: var(--radius, 8px);
      border: none;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .shadcn-btn--primary {
      background: var(--primary);
      color: var(--primary-foreground);
    }
    .shadcn-btn--destructive {
      background: var(--destructive);
      color: var(--destructive-foreground);
    }
    .shadcn-card {
      background: var(--card);
      color: var(--card-foreground);
      border: 1px solid var(--border);
      border-radius: var(--radius, 8px);
      padding: 16px;
    }
    .shadcn-input {
      background: transparent;
      color: var(--foreground);
      border: 1px solid var(--input);
      border-radius: calc(var(--radius, 8px) * 0.75);
      padding: 8px 12px;
      font-size: 0.875rem;
      width: 100%;
      box-sizing: border-box;
      outline: none;
    }
    .shadcn-input:focus {
      border-color: var(--ring);
      box-shadow: 0 0 0 2px var(--ring);
    }
  </style>
`;

export const Default: Story = {
  render: () => html`
    ${shadcnStyles}
    <div class="shadcn-demo dark">
      <div class="shadcn-card">
        <h3 style="margin: 0 0 8px; font-size: 1rem;">shadcn/ui OKLCH tokens</h3>
        <p style="margin: 0 0 12px; color: var(--muted-foreground); font-size: 0.875rem;">
          Lifegames tokens mapped to shadcn color roles — dark-first.
        </p>
        <input class="shadcn-input" placeholder="Type something…" />
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button class="shadcn-btn shadcn-btn--primary">Primary</button>
        <button class="shadcn-btn shadcn-btn--destructive">Destructive</button>
      </div>
    </div>
  `,
};

export const DestructiveVariant: Story = {
  render: () => html`
    ${shadcnStyles}
    <div class="shadcn-demo dark">
      <div class="shadcn-card">
        <h3 style="margin: 0 0 8px; font-size: 1rem; color: var(--destructive);">Delete account</h3>
        <p style="margin: 0 0 12px; color: var(--muted-foreground); font-size: 0.875rem;">
          This action cannot be undone.
        </p>
        <button class="shadcn-btn shadcn-btn--destructive">Delete account</button>
      </div>
    </div>
  `,
};

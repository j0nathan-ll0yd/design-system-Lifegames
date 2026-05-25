import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';

// DS-internal fixture: github/starred-repo-list.json
const defaultRepos = [
  { owner: 'vercel', name: 'next.js', url: 'https://github.com/vercel/next.js', stars: 128000, language: 'JavaScript', languageColor: '#f1e05a', starredAt: '2 days ago' },
  { owner: 'astro-community', name: 'astro', url: 'https://github.com/astro-community/astro', stars: 48000, language: 'TypeScript', languageColor: '#3178c6', starredAt: '5 days ago' },
  { owner: 'denoland', name: 'deno', url: 'https://github.com/denoland/deno', stars: 101000, language: 'TypeScript', languageColor: '#3178c6', starredAt: '1 week ago' },
];

function formatStars(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(0) + 'k' : String(n);
}

function renderRepos(repos: typeof defaultRepos) {
  if (!repos?.length) {
    return html`
      <div id="cardStarredRepos" class="tri-card">
        <div class="widget-header"><span class="widget-label">Starred Repos</span></div>
        <div class="widget-body" style="padding: 16px; color: var(--lg-color-text-muted); text-align: center;">No starred repos</div>
      </div>
    `;
  }
  return html`
    <div id="cardStarredRepos" class="tri-card">
      <div class="widget-header"><span class="widget-label">Starred Repos</span></div>
      <div class="widget-body" style="padding: 8px 16px; color: var(--lg-color-text-primary);">
        ${repos.map((r) => html`
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--lg-color-border);">
            <div>
              <a href="${r.url}" style="color: var(--lg-color-accent-blue); font-size: 0.9em;">${r.owner}/${r.name}</a>
              <div style="font-size: 0.75em; color: var(--lg-color-text-muted);">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${r.languageColor}; margin-right: 4px;"></span>
                ${r.language} · ${r.starredAt}
              </div>
            </div>
            <span style="font-size: 0.8em; color: var(--lg-color-text-muted);">★ ${formatStars(r.stars)}</span>
          </div>
        `)}
      </div>
    </div>
  `;
}

const meta: Meta = {
  title: 'Production/Github/StarredRepoList',
  tags: ['autodocs'],
  argTypes: { repos: { control: 'object' } },
  render: (args) => renderRepos(args.repos),
};

export default meta;
type Story = StoryObj;

export const Default: Story = { args: { repos: defaultRepos } };
export const Empty: Story = { args: { repos: [] } };
export const Loading: Story = { args: { repos: [] } };

import { describe, it, expect } from 'vitest';
import { renderProvenance } from '../../src/runtime/render-provenance';

describe('renderProvenance', () => {
  it('converts a [label](https://...) link to an anchor element', () => {
    const result = renderProvenance('Powered by [Feedly](https://feedly.com) daily.');
    expect(result).toBe(
      'Powered by <a href="https://feedly.com" target="_blank" rel="noopener noreferrer">Feedly</a> daily.',
    );
  });

  it('converts multiple [label](url) links in one string', () => {
    const result = renderProvenance(
      'Water by [Larq](https://www.livelarq.com). Caffeine by [Acaia](https://acaia.co/products/pearl)',
    );
    expect(result).toBe(
      'Water by <a href="https://www.livelarq.com" target="_blank" rel="noopener noreferrer">Larq</a>. ' +
        'Caffeine by <a href="https://acaia.co/products/pearl" target="_blank" rel="noopener noreferrer">Acaia</a>',
    );
  });

  it('HTML-escapes < in non-link text', () => {
    const result = renderProvenance('a < b');
    expect(result).toBe('a &lt; b');
  });

  it('HTML-escapes & in non-link text', () => {
    const result = renderProvenance('a & b');
    expect(result).toBe('a &amp; b');
  });

  it('HTML-escapes " in non-link text', () => {
    const result = renderProvenance('say "hello"');
    expect(result).toBe('say &quot;hello&quot;');
  });

  it('HTML-escapes > in non-link text', () => {
    const result = renderProvenance('a > b');
    expect(result).toBe('a &gt; b');
  });

  it('scheme guard: http: hrefs render as escaped plain text, not a link', () => {
    const result = renderProvenance('[click](http://example.com)');
    // No https: prefix → regex does not match → emitted as escaped plain text
    expect(result).not.toContain('<a ');
    expect(result).toContain('[click]');
    expect(result).toContain('http://example.com');
  });

  it('scheme guard: javascript: hrefs render as escaped plain text, not a link', () => {
    const result = renderProvenance('[evil](javascript:alert(1))');
    expect(result).not.toContain('<a ');
    expect(result).toContain('[evil]');
  });

  it('returns an empty string unchanged', () => {
    expect(renderProvenance('')).toBe('');
  });

  it('returns plain text with no links unchanged (only HTML-escaping applied)', () => {
    expect(renderProvenance('No links here.')).toBe('No links here.');
  });

  it('HTML-escapes the link label', () => {
    const result = renderProvenance('[A & B](https://example.com)');
    expect(result).toContain('A &amp; B');
    expect(result).toContain('<a ');
  });

  it('HTML-escapes the href (should not occur in practice given scheme guard, but defensive)', () => {
    // A https: URL with a " in it would be escaped in the attribute
    const result = renderProvenance('[x](https://example.com?a=1&b=2)');
    expect(result).toContain('href="https://example.com?a=1&amp;b=2"');
  });
});

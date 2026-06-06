'use strict';

const path = require('path');
const { RuleTester } = require('eslint');

const rule = require('../no-raw-hex-in-widgets');

// Synthetic filename inside the rule's FILE_PATTERN scope.
const widgetTsFile = path.join(
  '/Users/x/proj/packages/web/src/widgets/foo/Foo.ts'
);
const widgetTsxFile = path.join(
  '/Users/x/proj/packages/web/src/widgets/foo/Foo.tsx'
);
const outsideFile = '/tmp/elsewhere/Foo.ts';

const tester = new RuleTester({
  languageOptions: { ecmaVersion: 2020, sourceType: 'module' },
});

tester.run('no-raw-hex-in-widgets', rule, {
  valid: [
    // File outside scope — no warns even with raw hex
    {
      filename: outsideFile,
      code: 'const s = "color: #ff006e";',
    },
    // var(--lg-*, FALLBACK) exemption — second-arg hex is allowed
    {
      filename: widgetTsFile,
      code: 'const s = "color: var(--lg-color-accent-pink, #ff006e)";',
    },
    // Token-only reference — no raw hex
    {
      filename: widgetTsFile,
      code: 'const s = "color: var(--lg-color-text-title)";',
    },
    // Template literal with no hex
    {
      filename: widgetTsFile,
      code: 'const s = `color: var(--lg-color-bg-base)`;',
    },
    // Hex-shaped substring that is not a valid CSS hex length (5 digits) → skipped
    {
      filename: widgetTsFile,
      code: 'const s = "#12345";',
    },
    // HTML numeric character entity (`&#NNNN;`) — not a CSS hex literal,
    // negative lookbehind in HEX_RE rules out the `&`-prefixed form so
    // glyphs like ★ &#9733; ⑂ &#9474; do not trip the rule.
    {
      filename: widgetTsFile,
      code: 'const s = "<span>&#9733;</span>";',
    },
    {
      filename: widgetTsFile,
      code: 'const s = "&#9474; &#8758; &#9472;";',
    },
  ],

  invalid: [
    // Raw 6-digit hex in string literal
    {
      filename: widgetTsFile,
      code: 'const s = "color: #ff006e";',
      errors: [{ messageId: 'rawHex', data: { hex: '#ff006e' } }],
    },
    // Raw 3-digit hex in string literal
    {
      filename: widgetTsFile,
      code: 'const s = "color: #abc";',
      errors: [{ messageId: 'rawHex', data: { hex: '#abc' } }],
    },
    // Raw 8-digit hex (with alpha) in string literal
    {
      filename: widgetTsFile,
      code: 'const s = "color: #ff006e80";',
      errors: [{ messageId: 'rawHex', data: { hex: '#ff006e80' } }],
    },
    // Template literal raw hex
    {
      filename: widgetTsxFile,
      code: 'const s = `background: #06d6a0`;',
      errors: [{ messageId: 'rawHex', data: { hex: '#06d6a0' } }],
    },
    // Two raw hex in same string → two errors
    {
      filename: widgetTsFile,
      code: 'const s = "linear-gradient(#3a86ff, #ff006e)";',
      errors: [
        { messageId: 'rawHex', data: { hex: '#3a86ff' } },
        { messageId: 'rawHex', data: { hex: '#ff006e' } },
      ],
    },
    // var(--lg-*, FALLBACK) exemption only covers the SECOND-arg hex, not
    // unrelated hex in the same string.
    {
      filename: widgetTsFile,
      code: 'const s = "var(--lg-color-accent-pink, #ff006e), #06d6a0";',
      errors: [{ messageId: 'rawHex', data: { hex: '#06d6a0' } }],
    },
  ],
});

console.log('no-raw-hex-in-widgets: all tests passed');

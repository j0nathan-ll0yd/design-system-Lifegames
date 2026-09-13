'use strict'

// Raw-text ESLint parser for `.css`.
//
// `no-raw-hex-in-widgets` already declares `.css` in its FILE_PATTERN and already
// scans raw source text at `Program` — the CSS-in-`.astro` path proves the scan
// works. What was missing is a parser: ESLint never handed the rule a `.css`
// file, so `packages/web/src/widgets/**/*.css` was unscanned and the P1
// token-as-truth boundary had a hole exactly the width of one file extension.
//
// CSS has no ESTree grammar, and the rule does not need one — it reads
// `sourceCode.text` and maps offsets back through `getLocFromIndex`. So this
// parser returns a well-formed but EMPTY `Program`: no body, no tokens, no
// comments. Node-visitor rules see nothing and stay silent; raw-text rules see
// the whole file. That is the entire contract.
//
// Deliberately NOT a CSS parser. Anything needing real CSS structure belongs in
// `@eslint/css`, not here — a hand-rolled tokenizer would be a second grammar to
// keep correct for no gain.

module.exports = {
  parseForESLint(text) {
    const lines = text.split('\n')
    const lastLine = lines.length
    const lastColumn = lines[lines.length - 1].length
    return {
      ast: {
        type: 'Program',
        body: [],
        sourceType: 'script',
        comments: [],
        tokens: [],
        range: [0, text.length],
        loc: {start: {line: 1, column: 0}, end: {line: lastLine, column: lastColumn}}
      },
      scopeManager: null,
      visitorKeys: null
    }
  }
}

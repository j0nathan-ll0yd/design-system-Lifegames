'use strict';

const path = require('path');
const fs = require('fs');

// Load deprecated tokens from the build output once per process
let _deprecatedTokens = null;

function getDeprecatedTokens(projectRoot) {
  if (_deprecatedTokens !== null) return _deprecatedTokens;
  const distPath = path.join(projectRoot, 'packages/tokens/dist/deprecated-tokens.json');
  try {
    _deprecatedTokens = JSON.parse(fs.readFileSync(distPath, 'utf8'));
  } catch {
    _deprecatedTokens = [];
  }
  return _deprecatedTokens;
}

function findProjectRoot(filename) {
  // Walk up from the file to find the repo root (containing packages/tokens/dist)
  let dir = path.dirname(filename);
  for (let i = 0; i < 20; i++) {
    if (fs.existsSync(path.join(dir, 'packages/tokens/dist/deprecated-tokens.json'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'D4: warn on references to deprecated Lifegames design tokens',
    },
    messages: {
      deprecatedCssVar:
        'D4: CSS var {{var}} references a deprecated token. Check tokens/dist/deprecated-tokens.json for the replacement.',
      deprecatedSwiftAccess:
        'D4: Swift accessor {{name}} references a deprecated token. Check tokens/dist/deprecated-tokens.json for the replacement.',
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    const projectRoot = findProjectRoot(filename);
    if (!projectRoot) return {};

    const deprecated = getDeprecatedTokens(projectRoot);
    if (!deprecated.length) return {};

    const deprecatedCssVars = new Set(deprecated.map((t) => t.cssVar));
    const deprecatedSwiftNames = new Set(deprecated.map((t) => t.swiftName));

    // Match `var(--lg-foo-bar)` patterns in template literals, strings, and JSX attributes
    const CSS_VAR_RE = /var\((--lg-[a-z0-9-]+)\)/g;
    // Match `LGColor.fooBar` or `Color.fooBar` (camelCase Swift access) in template literals and strings
    const SWIFT_RE = /\b(?:LGColor|Color)\.([a-zA-Z][a-zA-Z0-9]*)\b/g;

    function checkStringValue(node, value) {
      let match;
      CSS_VAR_RE.lastIndex = 0;
      while ((match = CSS_VAR_RE.exec(value)) !== null) {
        if (deprecatedCssVars.has(match[1])) {
          context.report({
            node,
            messageId: 'deprecatedCssVar',
            data: { var: match[1] },
          });
        }
      }
      SWIFT_RE.lastIndex = 0;
      while ((match = SWIFT_RE.exec(value)) !== null) {
        const accessName = 'Color.' + match[1];
        if (deprecatedSwiftNames.has(accessName)) {
          context.report({
            node,
            messageId: 'deprecatedSwiftAccess',
            data: { name: accessName },
          });
        }
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === 'string') {
          checkStringValue(node, node.value);
        }
      },
      TemplateLiteral(node) {
        for (const quasi of node.quasis) {
          checkStringValue(quasi, quasi.value.raw);
        }
      },
    };
  },
};

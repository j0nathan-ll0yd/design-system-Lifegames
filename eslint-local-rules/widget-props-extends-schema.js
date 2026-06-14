'use strict';

const FILE_PATTERN = /\/packages\/web\/src\/widgets\/[^/]+\/[^/]+\.types\.ts$/;
const SCHEMA_IMPORT_SOURCE = '@lifegames/schemas';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'W16: production widget Props types must extend a @lifegames/schemas type',
    },
    messages: {
      missingSchema:
        "W16: '{{name}}' is not connected to @lifegames/schemas. Either extend/intersect with a type from '@lifegames/schemas', or add a leading comment '// schema-exempt: <reason>' to opt out.",
    },
    schema: [],
  },
  create(context) {
    const filename = context.filename || context.getFilename();
    if (!FILE_PATTERN.test(filename)) {
      return {};
    }

    // Check for leading exemption comment in source
    const sourceCode = context.sourceCode;
    const allComments = sourceCode.getAllComments();
    const firstComment = allComments[0];
    if (firstComment && /schema-exempt:/.test(firstComment.value)) {
      return {};
    }

    // Track whether @lifegames/schemas is imported
    let schemaImported = false;

    return {
      ImportDeclaration(node) {
        if (node.source.value === SCHEMA_IMPORT_SOURCE) {
          schemaImported = true;
        }
      },
      'Program:exit'() {
        if (!schemaImported) {
          // Find the first exported declaration to report on, fallback to program root
          const ast = sourceCode.ast;
          const reportNode =
            ast.body.find(
              (n) =>
                n.type === 'ExportNamedDeclaration' ||
                n.type === 'TSInterfaceDeclaration' ||
                n.type === 'TSTypeAliasDeclaration',
            ) || ast;
          context.report({
            node: reportNode,
            messageId: 'missingSchema',
            data: { name: filename.split('/').pop() },
          });
        }
      },
    };
  },
};

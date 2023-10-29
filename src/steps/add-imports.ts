import { readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { createFiles, findFiles } from '@codemod-utils/files';

import type { Options } from '../types/index.js';

import { AST as AST_JS } from '@codemod-utils/ast-javascript';
import { AST as AST_HBS } from '@codemod-utils/ast-template';

function replaceExtension(filePath: string): string {
  return filePath.replace('.js', '.gjs');
}

function rewriteHbsTemplateString(file: string): string {
  const traverse = AST_JS.traverse();
  let allComponentNames = new Set();

  const ast = traverse(file, {
    visitIdentifier(path) {
      if (path.node.name === 'hbs' && path.name === 'tag') {
        let code = path.parentPath.value.quasi.quasis[0].value.raw;
        allComponentNames = new Set([
          ...allComponentNames,
          ...extractComponentsFromTemplate(code),
        ]);
        path.parentPath.parentPath.value[0] = AST_JS.builders.jsxText(
          '<template>' + code + '</template>',
        );
      }
      return false;
    },
  });

  return AST_JS.print(ast);
}

function extractComponentsFromTemplate(template: string): string[] {
  const components: string[] = [];
  const traverse = AST_HBS.traverse();

  traverse(template, {
    /* Use AST.builders to transform the tree */
    ElementNode(node) {
      const componentName = node.tag;
      // Assume it's a component invocation if it starts with a capital letter
      if (componentName[0] === componentName[0]?.toUpperCase()) {
        components.push(componentName);
      }
    },
  });

  return components;
}

export function addImports(options: Options): void {
  const { projectRoot } = options;

  const filePaths = findFiles('**/*-test.js', {
    projectRoot,
  });

  const fileMap = new Map(
    filePaths.map((filePath) => {
      let file = readFileSync(join(projectRoot, filePath), 'utf8');

      // Move file to new extension
      const newFilePath = replaceExtension(filePath);
      renameSync(join(projectRoot, filePath), join(projectRoot, newFilePath));

      // Replace hbs`` template string with a <template> tag
      file = rewriteHbsTemplateString(file);

      return [newFilePath, file];
    }),
  );

  createFiles(fileMap, options);
}

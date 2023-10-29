import { readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { createFiles, findFiles } from '@codemod-utils/files';

import type { Options } from '../types/index.js';

import { AST } from '@codemod-utils/ast-javascript';

function replaceExtension(filePath: string): string {
  return filePath.replace('.js', '.gjs');
}

function rewriteHbsTemplateString(file: string): string {
  const traverse = AST.traverse();

  const ast = traverse(file, {
    visitIdentifier(path) {
      if (path.node.name === 'hbs' && path.name === 'tag') {
        let code = path.parentPath.value.quasi.quasis[0].value.raw;
        path.parentPath.parentPath.value[0] = AST.builders.jsxText('<template>' + code + '</template>');
      }
      return false;
    }
  });

  return AST.print(ast);
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

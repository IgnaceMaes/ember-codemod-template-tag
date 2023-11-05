import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createFiles, findFiles } from '@codemod-utils/files';

import type { Options } from '../types/index.js';
import { AST as AST_TEMPLATE_TAG } from '../utils/ast/template-tag.js';
import { isTypeScriptFile } from '../utils/general.js';

function removeImport(
  file: string,
  config: { appName: string; isTypeScript: boolean },
): string {
  const traverse = AST_TEMPLATE_TAG.traverse(config.isTypeScript);

  const { ast, contentTags } = traverse(file, {
    visitImportDeclaration(path) {
      if (path.value.source.value === 'ember-cli-htmlbars') {
        path.replace();
      }
      return false;
    },
  });

  return AST_TEMPLATE_TAG.print(ast, contentTags);
}

export function removeHbsImport(options: Options): void {
  const { appName, projectRoot } = options;

  const filePaths = findFiles('**/*-test.{gjs,gts}', {
    projectRoot,
  });

  const fileMap = new Map(
    filePaths.map((filePath) => {
      let file = readFileSync(join(projectRoot, filePath), 'utf8');

      file = removeImport(file, {
        appName,
        isTypeScript: isTypeScriptFile(filePath),
      });

      return [filePath, file];
    }),
  );

  createFiles(fileMap, options);
}

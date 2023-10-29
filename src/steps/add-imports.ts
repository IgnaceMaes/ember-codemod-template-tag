import { readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { createFiles, findFiles } from '@codemod-utils/files';

import type { Options } from '../types/index.js';

function replaceExtension(filePath: string): string {
  return filePath.replace('.js', '.gjs');
}

export function addImports(options: Options): void {
  const { projectRoot } = options;

  const filePaths = findFiles('**/*-test.js', {
    projectRoot,
  });

  const fileMap = new Map(
    filePaths.map((filePath) => {
      const file = readFileSync(join(projectRoot, filePath), 'utf8');

      // Move file to new extension
      const newFilePath = replaceExtension(filePath);
      renameSync(join(projectRoot, filePath), join(projectRoot, newFilePath));

      return [newFilePath, file];
    }),
  );

  createFiles(fileMap, options);
}

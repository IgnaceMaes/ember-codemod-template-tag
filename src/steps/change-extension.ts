import { readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { findFiles } from '@codemod-utils/files';

import type { Options } from '../types/index.js';
import { parse } from '../utils/ast/template-tag.js';
import { replaceExtensionWithGlimmer } from '../utils/general.js';

function isUsingTemplateTag(file: string): boolean {
  const contentTags = parse(file);

  return contentTags.length > 0;
}

export function changeExtension(options: Options): void {
  const { projectRoot } = options;

  const filePaths = findFiles('**/*-test.{js,ts}', {
    projectRoot,
  });

  filePaths.forEach((filePath) => {
    const file = readFileSync(join(projectRoot, filePath), 'utf8');

    const isTemplateTag = isUsingTemplateTag(file);

    if (isTemplateTag) {
      // Move file to new extension
      const newFilePath = replaceExtensionWithGlimmer(filePath);
      renameSync(join(projectRoot, filePath), join(projectRoot, newFilePath));
    }
  });
}

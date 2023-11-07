import { execSync } from 'node:child_process';

import { findFiles } from '@codemod-utils/files';

import finalize from './steps/finalize.js';
import { createOptions } from './steps/index.js';
import inlineTemplate from './steps/inline-template.js';
import renameJsToGjs from './steps/rename-js-to-gjs.js';
import resolveImports from './steps/resolve-imports.js';
import type { CodemodOptions } from './types/index.js';

export function runCodemod(codemodOptions: CodemodOptions): void {
  const options = createOptions(codemodOptions);

  const candidates = findFiles('**/*.hbs', {
    ignoreList: ['**/templates/**/*.hbs'],
    projectRoot: codemodOptions.projectRoot,
  });

  const converted: string[] = [];
  const skipped: [string, string][] = [];

  for (const candidate of candidates) {
    const goodRef = execSync('git rev-parse HEAD', {
      cwd: options.projectRoot,
      encoding: 'utf8',
    }).trim();

    try {
      console.log(`Converting ${candidate}`);

      execSync(`git reset --hard ${goodRef}`, {
        cwd: options.projectRoot,
        encoding: 'utf8',
        stdio: 'ignore',
      });

      options.filename = candidate;

      renameJsToGjs(options);
      resolveImports(options);
      inlineTemplate(options);
      finalize(options);

      console.log(
        execSync(`git show --color HEAD~`, {
          cwd: options.projectRoot,
          encoding: 'utf8',
        }),
      );

      converted.push(candidate);
    } catch (error: unknown) {
      let reason = String(error);

      if (error instanceof Error) {
        reason = error.message;
      }

      reason = reason.trim();

      console.warn(`Failed to convert ${candidate}: ${reason}`);

      execSync(`git reset --hard ${goodRef}`, {
        cwd: options.projectRoot,
        stdio: 'ignore',
      });

      skipped.push([candidate, reason]);
    }
  }

  if (converted.length) {
    console.log('Successfully converted %d files:\n', converted.length);

    for (const file of converted) {
      console.log(`- ${file}`);
    }

    console.log('\n');
  }

  if (skipped.length) {
    console.log('Skipped %d files:\n', skipped.length);

    for (const [file, reason] of skipped) {
      console.log(`- ${file}`);
      console.log(`  ${reason}`);
    }

    console.log('\n');
  }
}

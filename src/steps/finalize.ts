import { execSync } from 'node:child_process';
import { unlinkSync } from 'node:fs';
import path from 'node:path';

import type { Options } from '../types/index.js';

export default function finalize(options: Options): void {
  const hbs = path.join(options.projectRoot, options.filename);

  const gjs = path.join(
    options.projectRoot,
    options.filename.replace('.hbs', '.gjs'),
  );

  execSync(`yarn eslint --fix ${JSON.stringify(gjs)}`, {
    cwd: options.projectRoot,
  });

  execSync(`yarn prettier --write ${JSON.stringify(gjs)}`, {
    cwd: options.projectRoot,
  });

  execSync(`yarn ember-template-lint --fix ${JSON.stringify(hbs)}`, {
    cwd: options.projectRoot,
  });

  execSync(`yarn prettier --write ${JSON.stringify(hbs)}`, {
    cwd: options.projectRoot,
  });

  const label = path.basename(options.filename).replace('.hbs', '');
  const convert = JSON.stringify(`DEV: convert chat/${label} -> gjs`);

  execSync('git add .', { cwd: options.projectRoot });
  execSync(`git commit -m ${convert}`, {
    cwd: options.projectRoot,
    stdio: 'ignore',
  });

  unlinkSync(hbs);

  const cleanup = JSON.stringify(`DEV: cleanup chat/${label}`);

  execSync('git add .', { cwd: options.projectRoot });
  execSync(`git commit -m ${cleanup}`, {
    cwd: options.projectRoot,
    stdio: 'ignore',
  });
}

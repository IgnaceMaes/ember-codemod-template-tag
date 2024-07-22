import { execSync } from 'node:child_process';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { Options } from '../types/index.js';

export default function renameJsToGjs(options: Options): void {
  const src = path.join(
    options.projectRoot,
    options.filename.replace('.hbs', '.js'),
  );

  const dest = path.join(
    options.projectRoot,
    options.filename.replace('.hbs', '.gjs'),
  );

  if (existsSync(src)) {
    if (readFileSync(src, { encoding: 'utf8' }).includes(`.extend(`)) {
      throw new Error(
        `It appears to be a classic class, convert it to native class first!`,
      );
    }

    renameSync(src, dest);
  } else {
    if (options.filename.includes('/components/')) {
      writeFileSync(
        dest,
        `import Component from "@glimmer/component";\n` +
          `\n` +
          `export default class extends Component {\n` +
          `}\n`,
        { encoding: 'utf8' },
      );
    } else {
      throw new Error(`It does not appear to be a component!`);
    }
  }

  const label = path.basename(options.filename).replace('.hbs', '');
  const message = JSON.stringify(`DEV: mv chat/${label} -> gjs`);

  execSync('git add .', { cwd: options.projectRoot });
  execSync(`git commit -m ${message}`, {
    cwd: options.projectRoot,
    stdio: 'ignore',
  });
}

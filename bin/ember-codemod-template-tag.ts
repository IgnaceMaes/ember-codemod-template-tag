#!/usr/bin/env node
// eslint-disable-next-line n/shebang
'use strict';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { runCodemod } from '../src/index.js';
import type { CodemodOptions } from '../src/types/index.js';

// Provide a title to the process in `ps`
process.title = 'ember-codemod-template-tag';

// Set codemod options
const argv = yargs(hideBin(process.argv))
  .option('component-root', {
    describe: 'The path to your components folder (usually app-name/components)',
    type: 'string',
  })
  .option('root', {
    describe: 'Where to run the codemod',
    type: 'string',
  })
  .parseSync();

const ensureEndsWithSlash = (path: string): string => path.endsWith('/') ? path : `${path}/`;

const codemodOptions: CodemodOptions = {
  componentRoot: ensureEndsWithSlash(argv['component-root'] ?? 'example-app/components'),
  projectRoot: argv['root'] ?? process.cwd(),
};

runCodemod(codemodOptions);

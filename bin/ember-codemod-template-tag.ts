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
  .option('app-name', {
    describe: 'The name of the app, used in import paths',
    type: 'string',
  })
  .option('root', {
    describe: 'Where to run the codemod',
    type: 'string',
  })
  .parseSync();

const codemodOptions: CodemodOptions = {
  appName: argv['app-name'] ?? 'example-app',
  projectRoot: argv['root'] ?? process.cwd(),
};

runCodemod(codemodOptions);

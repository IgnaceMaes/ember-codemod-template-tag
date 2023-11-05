import { assertFixture, loadFixture, test } from '@codemod-utils/tests';

import { removeHbsImport } from '../../../src/steps/remove-import.js';
import {
  codemodOptions,
  options,
} from '../../helpers/shared-test-setups/convert-tests.js';

test('steps | remove-import > base case', function () {
  const inputProject = {
    'example-test.gjs':
      "import { hbs } from 'ember-cli-htmlbars';\n<template>Test</template>\n",
  };

  const outputProject = {
    'example-test.gjs': '<template>Test</template>\n',
  };

  loadFixture(inputProject, codemodOptions);

  removeHbsImport(options);

  assertFixture(outputProject, codemodOptions);
});

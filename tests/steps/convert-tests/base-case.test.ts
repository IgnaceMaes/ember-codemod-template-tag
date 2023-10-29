import { assertFixture, loadFixture, test } from '@codemod-utils/tests';

import { convertTests } from '../../../src/steps/index.js';
import {
  codemodOptions,
  options,
} from '../../helpers/shared-test-setups/convert-tests.js';

test('steps | convert-tests > base case', function () {
  const inputProject = {
    'file.txt': 'Hello world!\n',
  };

  const outputProject = {
    'file.txt': 'Hello world!\n',
  };

  loadFixture(inputProject, codemodOptions);

  convertTests(options);

  assertFixture(outputProject, codemodOptions);
});

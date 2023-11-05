import { assertFixture, loadFixture, test } from '@codemod-utils/tests';

import { changeExtension } from '../../../src/steps/change-extension.js';
import {
  codemodOptions,
  options,
} from '../../helpers/shared-test-setups/convert-tests.js';

test('steps | change-extension > base case', function () {
  const inputProject = {
    'example-test.js': "const foo = 'bar';\n<template>Test</template>\n",
    'no-template-tag-test.js': "const foo = 'bar';\nhbs`<foo>Bar</foo>`\n",
    'ts-test.ts': "const foo: string = 'bar';\n<template>Test</template>\n",
  };

  const outputProject = {
    'example-test.gjs': "const foo = 'bar';\n<template>Test</template>\n",
    'no-template-tag-test.js': "const foo = 'bar';\nhbs`<foo>Bar</foo>`\n",
    'ts-test.gts': "const foo: string = 'bar';\n<template>Test</template>\n",
  };

  loadFixture(inputProject, codemodOptions);

  changeExtension(options);

  assertFixture(outputProject, codemodOptions);
});

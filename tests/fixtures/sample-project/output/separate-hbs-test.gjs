import Foo from 'example-app/components/foo';
import { render } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'example-app/tests/helpers/component-test';
import { exists } from 'example-app/tests/helpers/qunit-helpers';

module('Integration | Component | foo', function (hooks) {
  setupRenderingTest(hooks);

  test('bar', async function (assert) {
    const template = <template><Foo @mode="css" /></template>;
    await render(template);
    assert.ok(exists('.foo'), 'it renders foo');
  });
});

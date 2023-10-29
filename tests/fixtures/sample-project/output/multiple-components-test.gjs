import Bar from 'example-app/components/bar';
import Foo from 'example-app/components/foo';
import { render } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'example-app/tests/helpers/component-test';

module('Integration | Component | foo', function (hooks) {
  setupRenderingTest(hooks);

  test('bar', async function (assert) {
    await render(<template><Foo><Bar /></Foo></template>);
    assert.ok(true);
  });
});

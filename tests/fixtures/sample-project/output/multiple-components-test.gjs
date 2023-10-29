import Bar from 'discourse/components/bar';
import Foo from 'discourse/components/foo';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'discourse/tests/helpers/component-test';

module('Integration | Component | foo', function (hooks) {
  setupRenderingTest(hooks);

  test('css editor', async function (assert) {
    await render(<template><Foo><Bar /></Foo></template>);
    assert.ok(true);
  });
});

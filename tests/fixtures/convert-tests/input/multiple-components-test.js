import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'example-app/tests/helpers/component-test';

module('Integration | Component | foo', function (hooks) {
  setupRenderingTest(hooks);

  test('bar', async function (assert) {
    await render(hbs`<Foo><Bar /></Foo>`);
    assert.ok(true);
  });
});

import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'example-app/tests/helpers/component-test';
import { exists } from 'example-app/tests/helpers/qunit-helpers';

module('Integration | Component | foo', function (hooks) {
  setupRenderingTest(hooks);

  test('bar', async function (assert) {
    await render(hbs`
      <Foo @mode="9000">
        Bar
      </Foo>
    `);
    assert.ok(exists('.foo'), 'it renders foo');
  });
});

import Button from 'example-app/components/ui/button';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'example-app/tests/helpers/component-test';
import { exists } from 'example-app/tests/helpers/qunit-helpers';

module('Integration | Component | ui/button', function (hooks) {
  setupRenderingTest(hooks);

  test('button', async function (assert) {
    await render(<template><Button @mode="css">Hello</Button></template>);
    assert.ok(exists('.button'), 'it renders the button');
  });
});

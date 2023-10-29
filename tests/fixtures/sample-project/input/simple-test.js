import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'discourse/tests/helpers/component-test';
import { exists } from 'discourse/tests/helpers/qunit-helpers';

module('Integration | Component | ace-editor', function (hooks) {
  setupRenderingTest(hooks);

  test('css editor', async function (assert) {
    await render(hbs`<AceEditor @mode="css" />`);
    assert.ok(exists('.ace_editor'), 'it renders the ace editor');
  });
});

import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'discourse/tests/helpers/component-test';
import { exists } from 'discourse/tests/helpers/qunit-helpers';
import AceEditor from 'discourse/components/ace-editor';

module('Integration | Component | ace-editor', function (hooks) {
  setupRenderingTest(hooks);

  test('css editor', async function (assert) {
    await render(<template><AceEditor @mode="css" /></template>);
    assert.ok(exists('.ace_editor'), 'it renders the ace editor');
  });
});

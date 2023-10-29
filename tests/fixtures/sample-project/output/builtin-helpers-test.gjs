import { array, concat, fn, get, hash } from '@ember/helper';
import Foo from 'example-app/components/foo';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'example-app/tests/helpers/component-test';
import { exists } from 'example-app/tests/helpers/qunit-helpers';

module('Integration | Component | foo', function (hooks) {
  setupRenderingTest(hooks);

  test('bar', async function (assert) {
    await render(<template>
          <Foo
            @a={{array 1 2 3}}
            @c={{concat "a" "b"}}
            @c={{fn this.x}}
            @d={{get this.x "y"}}
            @e={{hash x=1 y=2}}
          />
        </template>);
    assert.ok(exists('.foo'), 'it renders foo');
  });
});

[![This project uses GitHub Actions for continuous integration.](https://github.com/IgnaceMaes/ember-codemod-template-tag/actions/workflows/ci.yml/badge.svg)](https://github.com/IgnaceMaes/ember-codemod-template-tag/actions/workflows/ci.yml)

# ember-codemod-template-tag

Codemod to convert Glimmer components to the `<template>` tag authoring format in `.gjs` and `.gts`.

> **NOTE**
> This codemod is far from feature complete. Currently it only handles converting `*-test.js` files which use the `hbs` helper. PRs welcome!

## Functionality

### Features

- Rewrites the `hbs` template helper to the `<template>` tag
- Adds imports for components and removes `hbs` import
- Supports nested component paths (e.g. `Cards::CardHeader` will be used as `CardHeader`)
- Adds imports for built-in helpers (`concat`, `array`, `fn`, `get`, `hash`)
- Supports JavaScript and TypeScript

### Example

Given a file `foo-test.js`:

```sh
npx ember-codemod-template-tag --app-name example-app
```

```js
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'example-app/tests/helpers/component-test';

module('Integration | Component | foo', function (hooks) {
  setupRenderingTest(hooks);

  test('bar', async function (assert) {
    await render(hbs`<Foo::Bar @x={{array 1 2 3}} />`);
  });
});
```

The codemod will rewrite this to `foo-test.gts`:

```js
import { array } from '@ember/helper';
import Bar from 'example-app/components/foo/bar';
import { render } from '@ember/test-helpers';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'example-app/tests/helpers/component-test';

module('Integration | Component | foo', function (hooks) {
  setupRenderingTest(hooks);

  test('bar', async function (assert) {
    await render(<template><Bar @x={{array 1 2 3}}/></template>);
  });
});

```


## Usage

> **WARNING**
> As with most codemods, changes are made in place, meaning it will overwrite existing files. Make sure to run this codemod on a codebase that has been checked into version control to avoid losing progress.

### Arguments

You must pass the app name as an argument to the codemod. This value is used to provide import statements:

```sh
npx ember-codemod-template-tag --app-name <your-app-name>
```

<details>

<summary>Optional: Specify the project root</summary>

Pass `--root` to run the codemod somewhere else (i.e. not in the current directory).

```sh
npx ember-codemod-template-tag --root <path/to/your/project>
```

</details>

## Compatibility

- Node.js v18 or above


## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.


## License

This project is licensed under the [MIT License](LICENSE.md).

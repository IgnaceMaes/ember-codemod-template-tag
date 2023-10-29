[![This project uses GitHub Actions for continuous integration.](https://github.com/<your-github-handle>/<your-repo-name>/actions/workflows/ci.yml/badge.svg)](https://github.com/<your-github-handle>/<your-repo-name>/actions/workflows/ci.yml)

# ember-codemod-template-tag

Codemod to convert Glimmer components to the `<template>` tag authoring format in `.gjs` and `.gts`.

> **WARNING**
> This codemod is far from feature complete. Currently it only handles converting `*-test.js` files which use the `hbs` helper.

## Functionality

### Features

- Rewrites the `hbs` template helper to the `<template>` tag
- Supports nested component paths (e.g. `Cards::CardHeader` will be used as `CardHeader`)
- Adds imports for built-in helpers (`concat`, `array`, `fn`, `get`, `hash`)

### Example

Given a file `foo-test.js`:

```js
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'example-app/tests/helpers/component-test';

module('Integration | Component | foo', function (hooks) {
  setupRenderingTest(hooks);

  test('bar', async function (assert) {
    await render(hbs`<Foo @x={{array 1 2 3}} />`);
  });
});
```

The codemod will rewrite this to:

```js
import { array } from '@ember/helper';
import Foo from 'example-app/components/foo';
import { render } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { module, test } from 'qunit';
import { setupRenderingTest } from 'example-app/tests/helpers/component-test';

module('Integration | Component | foo', function (hooks) {
  setupRenderingTest(hooks);

  test('bar', async function (assert) {
    await render(<template><Foo @x={{array 1 2 3}}/></template>);
  });
});

```


## Usage

### Arguments

You must pass the component root directory. In most cases this will be `your-app-name/components`:

```sh
npx ember-codemod-template-tag --component-root <your-app-name/components>
```

<details>

<summary>Optional: Specify the project root</summary>

Pass `--root` to run the codemod somewhere else (i.e. not in the current directory).

```sh
npx ember-codemod-template-tag --root <path/to/your/project>
```

</details>


### Limitations

The codemod is designed to cover typical cases. It is not designed to cover one-off cases.

To better meet your needs, consider cloning the repo and running the codemod locally.

```sh
cd <path/to/cloned/repo>

# Compile TypeScript
pnpm build

# Run codemod
./dist/bin/ember-codemod-template-tag.js --root <path/to/your/project>
```


## Compatibility

- Node.js v18 or above


## Contributing

See the [Contributing](CONTRIBUTING.md) guide for details.


## License

This project is licensed under the [MIT License](LICENSE.md).

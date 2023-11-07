import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { AST } from '@codemod-utils/ast-javascript';

import type { Options } from '../types/index.js';

export default function inlineTemplate(options: Options): void {
  const hbs = path.join(options.projectRoot, options.filename);

  const hbsSource = readFileSync(hbs, { encoding: 'utf8' });

  const gjs = path.join(
    options.projectRoot,
    options.filename.replace('.hbs', '.gjs'),
  );

  const jsSource = readFileSync(gjs, { encoding: 'utf8' });

  const traverse = AST.traverse(false);

  let found = 0;

  const ast = traverse(jsSource, {
    visitClassDeclaration(path) {
      if (
        path.node.superClass?.type === 'Identifier' &&
        path.node.superClass.name === 'Component'
      ) {
        found++;

        path.node.body.body.push(
          AST.builders.classProperty(
            AST.builders.identifier('__template__'),
            null,
          ),
        );
      }

      return false;
    },
  });

  if (found === 0) {
    throw new Error('cannot find class');
  } else if (found > 1) {
    throw new Error('too many classes?');
  }

  const jsPlaceholder = AST.print(ast);

  const matches = [...jsPlaceholder.matchAll(/^\s*__template__;$/gm)];

  if (matches.length === 0) {
    throw new Error('cannot find placeholder');
  } else if (matches.length > 1) {
    throw new Error('too many placeholders?');
  }

  let templateTag = `\n`;

  templateTag += `  <template>\n`;

  for (const line of hbsSource.split('\n')) {
    templateTag += `    ${line}\n`;
  }

  templateTag += `  </template>`;

  const gjsSource = jsPlaceholder.replace(/^\s*__template__;$/m, templateTag);

  writeFileSync(gjs, gjsSource, { encoding: 'utf8' });
}

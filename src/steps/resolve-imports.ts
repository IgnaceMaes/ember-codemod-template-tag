import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path, { join } from 'node:path';

import { AST } from '@codemod-utils/ast-template';
import { KEYWORDS_TYPES, type KeywordType } from '@glimmer/syntax';
import { AST as GLimmerAST } from 'ember-template-recast';

import type { CodemodOptions, Options } from '../types/index.js';

type PathExpression = GLimmerAST.PathExpression;

export default function resolveImports(options: Options): void {
  const hbs = path.join(options.projectRoot, options.filename);

  const hbsSource = readFileSync(hbs, { encoding: 'utf8' });

  const gjs = path.join(
    options.projectRoot,
    options.filename.replace('.hbs', '.gjs'),
  );

  const jsSource = readFileSync(gjs, { encoding: 'utf8' });

  const hasActionImport = /^import.+action.+from "@ember\/object";$/m.test(
    jsSource,
  );

  const traverse = AST.traverse();

  const resolver = new Resolver(options);

  const ast = traverse(hbsSource, {
    BlockStatement: {
      enter(node) {
        if (node.path.type !== 'PathExpression') {
          throw new Error('unexpected block type ' + node.path.type);
        }

        resolver.resolve('Block', node.path);
      },

      keys: {
        program: {
          enter(node) {
            resolver.push(node.program.blockParams);
          },
          exit() {
            resolver.pop();
          },
        },
      },
    },

    ElementNode: {
      enter(node) {
        // e.g. `<this.foo>`
        if (node.tag.includes('.')) {
          return;
        }

        // e.g. `<@Foo>`
        if (node.tag.startsWith('@')) {
          return;
        }

        // e.g. `<:foo>`
        if (node.tag.startsWith(':')) {
          return;
        }

        // e.g. <li>
        if (node.tag[0] === node.tag[0]?.toLowerCase()) {
          return;
        }

        const resolved = resolver.resolveComponent(dasherize(node.tag));

        if (resolved) {
          if (node.tag !== resolved.identifier) {
            // If we return in enter, the new node will get visited again
            (node as { rename?: string }).rename = resolved.identifier;
          }
        }
      },

      keys: {
        children: {
          enter(node) {
            resolver.push(node.blockParams);
          },

          exit() {
            resolver.pop();
          },
        },
      },

      exit(node) {
        const { rename } = node as { rename?: string };

        if (rename) {
          return AST.builders.element(rename, {
            attrs: node.attributes,
            modifiers: node.modifiers,
            children: node.children,
            comments: node.comments,
            blockParams: node.blockParams,
            loc: node.loc,
          });
        } else {
          return node;
        }
      },
    },

    ElementModifierStatement(node) {
      if (node.path.type !== 'PathExpression') {
        throw new Error('unexpected mustache type ' + node.path.type);
      }

      if (hasActionImport && node.path.original === 'action') {
        throw new Error(
          'The template contains usage of the {{action}} keyword, ' +
            'but the JS side imports { action } from @ember/object. ' +
            'It would have shadowed the template keyword.',
        );
      }

      const resolved = resolver.resolve('Modifier', node.path);

      if (resolved) {
        if (node.path.original !== resolved.identifier) {
          node.path = AST.builders.path(resolved.identifier);
        }
      }
    },

    MustacheStatement(node) {
      // {{true}}, etc
      if (node.path.type !== 'PathExpression') {
        return;
      }

      if (hasActionImport && node.path.original === 'action') {
        throw new Error(
          'The template contains usage of the {{action}} keyword, ' +
            'but the JS side imports { action } from @ember/object. ' +
            'It would have shadowed the template keyword.',
        );
      }

      if (node.path.original === 'component') {
        throw new Error(
          'The template contains usage of the {{component}} keyword, ' +
            'this is potentially unsafe because strict mode templates ' +
            'cannot use {{component}} keyword for string-based resolution. ' +
            'If it is only used for arguments currying, that is fine, ' +
            'but this codemod is not currently sophisticated enough to ' +
            'tell the difference.',
        );
      }

      const resolved = resolver.resolve('Append', node.path);

      if (resolved) {
        if (node.path.original !== resolved.identifier) {
          node.path = AST.builders.path(resolved.identifier);
        }
      }
    },

    SubExpression(node) {
      // (true), etc
      if (node.path.type !== 'PathExpression') {
        return;
      }

      if (hasActionImport && node.path.original === 'action') {
        throw new Error(
          'The template contains usage of the {{action}} keyword, ' +
            'but the JS side imports { action } from @ember/object. ' +
            'It would have shadowed the template keyword.',
        );
      }

      if (node.path.original === 'component') {
        throw new Error(
          'The template contains usage of the (component) keyword, ' +
            'this is potentially unsafe because strict mode templates ' +
            'cannot use (component) keyword for string-based resolution. ' +
            'If it is only used for arguments currying, that is fine, ' +
            'but this codemod is not currently sophisticated enough to ' +
            'tell the difference.',
        );
      }

      const resolved = resolver.resolve('Call', node.path);

      if (resolved) {
        if (node.path.original !== resolved.identifier) {
          node.path = AST.builders.path(resolved.identifier);
        }
      }
    },
  });

  const hbsRewritten = AST.print(ast);
  const jsRewritten = resolver.imports() + jsSource;

  writeFileSync(hbs, hbsRewritten, { encoding: 'utf8' });
  writeFileSync(gjs, jsRewritten, { encoding: 'utf8' });
}

function dasherize(camelized: string): string {
  return camelized
    .replace(/::/g, '/')
    .replace(/([A-Z])/g, '-$1')
    .replace(/^-/, '')
    .replace(/\/-/g, '/')
    .toLowerCase();
}

function identifierFor(dasherized: string, upperCase = false): string {
  const parts = dasherized.split('/');
  const name = parts[parts.length - 1];

  if (!name) {
    throw new Error('unexpected fail: ' + dasherized);
  }

  const words = name?.split('-').map((part) => {
    return part.slice(0, 1).toUpperCase() + part.slice(1);
  });

  if (!upperCase) {
    if (!words[0]) {
      throw new Error('unexpected fail: ' + dasherized);
    }

    words[0] = words[0]?.toLowerCase();
  }

  return words?.join('');
}

interface ImportSpec {
  importPath: string;
  importType: 'default' | 'named';
}

interface Resolved extends ImportSpec {
  identifier: string;
}

interface Search {
  base: string;
  module: string;
}

class Resolver {
  private stack: string[][] = [];
  private resolved = new Map<string, Resolved>();

  constructor(private options: CodemodOptions) {}

  push(locals: string[]) {
    this.stack.push(locals);
  }

  pop() {
    this.stack.pop();
  }

  resolve(type: KeywordType, path: PathExpression): Resolved | undefined {
    if (path.tail.length !== 0) {
      return;
    }

    if (path.head.type !== 'VarHead') {
      return;
    }

    const name = path.head.name;

    if (this.isLocal(name)) {
      return;
    }

    if (this.isKeyword(type, name)) {
      return;
    }

    let resolved = this.resolved.get(`${type}:${name}`);

    if (!resolved) {
      if (type === 'Block') {
        resolved = this.resolveComponent(name, false);

        if (resolved) {
          throw new Error(
            `{{#${name}}} appears to be a component, convert it to <AngleBracket> first`,
          );
        }
      } else if (type === 'Append') {
        resolved = this.resolveComponent(name, false);

        if (resolved) {
          throw new Error(
            `{{${name}}} appears to be a component, convert it to <AngleBracket> first`,
          );
        }

        resolved = this.resolveHelper(name);
      } else if (type === 'Call') {
        resolved = this.resolveHelper(name);
      } else if (type === 'Modifier') {
        resolved = this.resolveModifier(name);
      } else {
        throw new Error(`unreachable ${type} ${name}`);
      }
    }

    if (resolved) {
      this.resolved.set(`${type}:${name}`, resolved);
      return resolved;
    } else {
      throw new Error(`Failed to resolve ${name} (${type})`);
    }
  }

  imports(): string {
    if (this.resolved.size === 0) {
      return '';
    }

    // I thought we could rely on eslint to fix { default as Foo }
    // and consolidate multiple import statements into one, but I
    // guess we don't have that rule set up?

    const normalized = new Map<string, string>();
    const imports = new Map<string, Set<string>>();
    const defaultImports = new Map<string, string>();

    for (const { importPath } of this.resolved.values()) {
      if (importPath.startsWith('discourse/plugins/chat')) {
        let relativePath = path.relative(
          path.dirname('discourse/plugins/chat/' + this.options.filename),
          importPath,
        );

        if (!relativePath.startsWith('.')) {
          relativePath = `./${relativePath}`;
        }

        normalized.set(importPath, relativePath);
      } else {
        normalized.set(importPath, importPath);
      }

      imports.set(importPath, new Set());
    }

    for (const {
      identifier,
      importPath,
      importType,
    } of this.resolved.values()) {
      if (importType === 'default') {
        defaultImports.set(importPath, identifier);
      } else {
        imports.get(importPath)!.add(identifier);
      }
    }

    let statements = '';

    for (const mod of imports) {
      const path = JSON.stringify(normalized.get(mod[0]));
      const parts = [];

      const defaultImport = defaultImports.get(mod[0]);

      if (defaultImport) {
        parts.push(defaultImport);
      }

      if (mod[1].size) {
        const namedImports = `{ ${[...mod[1]].join(', ')} }`;
        parts.push(namedImports);
      }

      statements += `import ${parts.join(', ')} from ${path};\n`;
    }

    return statements;
  }

  isLocal(identifier: string): boolean {
    return this.stack.flat().includes(identifier);
  }

  isKeyword(type: KeywordType, identifier: string): boolean {
    // For some reason, these aren't included in the list,
    // but should be
    if (identifier === 'action') {
      return true;
    }

    // And these are included in the list, but shouldn't be
    if (identifier === 'link-to') {
      return false;
    }

    const keywords = KEYWORDS_TYPES as {
      [identifier: string]: KeywordType[] | undefined;
    };

    return keywords[identifier]?.includes(type) ?? false;
  }

  resolveComponent(name: string, required = true): Resolved | undefined {
    let resolved = this.resolved.get(`Component:${name}`);

    if (!resolved) {
      switch (name) {
        case 'input':
          resolved = {
            identifier: 'Input',
            importPath: '@ember/component',
            importType: 'named',
          };
          break;

        case 'link-to':
          resolved = {
            identifier: 'LinkTo',
            importPath: '@ember/routing',
            importType: 'named',
          };
          break;

        case 'textarea':
          resolved = {
            identifier: 'Textarea',
            importPath: '@ember/component',
            importType: 'named',
          };
          break;
      }
    }

    if (!resolved) {
      let spec = this.search(
        name,
        [
          {
            base: '/Users/godfrey/code/discourse/app/assets/javascripts/discourse/app/components',
            module: 'discourse/components',
          },
          {
            base: '/Users/godfrey/code/discourse/app/assets/javascripts/float-kit/addon/components',
            module: 'float-kit/components',
          },
          {
            base: '/Users/godfrey/code/discourse/app/assets/javascripts/select-kit/addon/components',
            module: 'select-kit/components',
          },
          {
            base: '/Users/godfrey/code/discourse/plugins/chat/assets/javascripts/discourse/components',
            module: 'discourse/plugins/chat/discourse/components',
          },
        ],
        ['.gjs', '.js', '.hbs'],
      );

      if (!spec) {
        spec = this.search(
          // discourse special: <Chat::Notices> -> chat-notices
          name.replaceAll('/', '-'),
          [
            {
              base: '/Users/godfrey/code/discourse/app/assets/javascripts/discourse/app/components',
              module: 'discourse/components',
            },
            {
              base: '/Users/godfrey/code/discourse/app/assets/javascripts/float-kit/addon/components',
              module: 'float-kit/components',
            },
            {
              base: '/Users/godfrey/code/discourse/app/assets/javascripts/select-kit/addon/components',
              module: 'select-kit/components',
            },
            {
              base: '/Users/godfrey/code/discourse/plugins/chat/assets/javascripts/discourse/components',
              module: 'discourse/plugins/chat/discourse/components',
            },
          ],
          ['.gjs', '.js', '.hbs'],
        );
      }

      if (spec) {
        resolved = {
          identifier: identifierFor(name, true),
          ...spec,
        };
      }
    }

    if (resolved) {
      this.resolved.set(`Component:${name}`, resolved);
    } else if (required) {
      throw new Error(`Failed to resolve ${name} (Component)`);
    }

    return resolved;
  }

  resolveHelper(name: string): Resolved | undefined {
    switch (name) {
      case 'array':
        return {
          identifier: 'array',
          importPath: '@ember/helper',
          importType: 'named',
        };
      case 'concat':
        return {
          identifier: 'concat',
          importPath: '@ember/helper',
          importType: 'named',
        };
      case 'fn':
        return {
          identifier: 'fn',
          importPath: '@ember/helper',
          importType: 'named',
        };
      case 'get':
        return {
          identifier: 'get',
          importPath: '@ember/helper',
          importType: 'named',
        };
      case 'hash':
        return {
          identifier: 'hash',
          importPath: '@ember/helper',
          importType: 'named',
        };
    }

    const spec: ImportSpec | undefined = this.search(
      name,
      [
        {
          base: '/Users/godfrey/code/discourse/app/assets/javascripts/discourse/app/helpers',
          module: 'discourse/helpers',
        },
        {
          base: '/Users/godfrey/code/discourse/app/assets/javascripts/discourse-common/addon/helpers',
          module: 'discourse-common/helpers',
        },
        {
          base: '/Users/godfrey/code/discourse/app/assets/javascripts/truth-helpers/addon/helpers',
          module: 'truth-helpers/helpers',
        },
        {
          base: '/Users/godfrey/code/discourse/plugins/chat/assets/javascripts/discourse/helpers',
          module: 'discourse/plugins/chat/discourse/helpers',
        },
      ],
      ['.js'],
    );

    if (spec) {
      return {
        identifier: identifierFor(name),
        ...spec,
      };
    }
  }

  resolveModifier(name: string): Resolved | undefined {
    switch (name) {
      case 'on':
        return {
          identifier: 'on',
          importPath: '@ember/modifier',
          importType: 'named',
        };

      case 'did-insert':
        return {
          identifier: 'didInsert',
          importPath: '@ember/render-modifiers/modifiers/did-insert',
          importType: 'default',
        };
      case 'did-update':
        return {
          identifier: 'didUpdate',
          importPath: '@ember/render-modifiers/modifiers/did-update',
          importType: 'default',
        };
      case 'will-destroy':
        return {
          identifier: 'willDestroy',
          importPath: '@ember/render-modifiers/modifiers/will-destroy',
          importType: 'default',
        };
    }

    let spec: ImportSpec | undefined;

    if (name.startsWith('chat/')) {
      spec = this.search(
        name,
        [
          {
            base: '/Users/godfrey/code/discourse/plugins/chat/assets/javascripts/discourse/modifiers',
            module: 'discourse/plugins/chat/discourse/modifiers',
          },
        ],
        ['.js'],
      );
    }

    if (spec) {
      return {
        identifier: identifierFor(name),
        ...spec,
      };
    }
  }

  search(
    name: string,
    searches: Search[],
    extensions: string[],
  ): ImportSpec | undefined {
    for (const search of searches) {
      for (const extension of extensions) {
        if (existsSync(join(search.base, name + extension))) {
          return {
            importPath: `${search.module}/${name}`,
            importType: 'default',
          };
        }
      }
    }
  }
}

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AST as AST_JS } from '@codemod-utils/ast-javascript';
import { AST as AST_HBS } from '@codemod-utils/ast-template';
import { createFiles, findFiles } from '@codemod-utils/files';

import type { Options } from '../types/index.js';
import {
  convertComponentNameToPath,
  getComponentNameFromNestedPath,
} from '../utils/components.js';
import { BUILT_IN_HELPERS } from '../utils/constants.js';
import { isTypeScriptFile } from '../utils/general.js';

function rewriteHbsTemplateString(
  file: string,
  config: { appName: string; isTypeScript: boolean },
): string {
  const traverse = AST_JS.traverse(config.isTypeScript);
  let allComponentNames = new Set<string>();
  let allHelperNames = new Set<string>();

  const ast = traverse(file, {
    visitTaggedTemplateExpression(path) {
      if (path.value.tag.name === 'hbs') {
        let templateCode = path.value.quasi.quasis[0].value.raw;
        allComponentNames = new Set([
          ...allComponentNames,
          ...extractComponentsFromTemplate(templateCode),
        ]);
        allHelperNames = new Set([
          ...allHelperNames,
          ...extractHelpersFromTemplate(templateCode),
        ]);
        templateCode = convertToComponentImports(templateCode);
        path.replace(
          AST_JS.builders.jsxText('<template>' + templateCode + '</template>'),
        );
      }
      return false;
    },
  });
  addComponentImports(ast, allComponentNames, config.appName);
  addHelperImports(ast, allHelperNames);

  return AST_JS.print(ast);
}

function extractComponentsFromTemplate(template: string): string[] {
  const components: string[] = [];
  const traverse = AST_HBS.traverse();

  traverse(template, {
    ElementNode(node) {
      const componentName = node.tag;
      // Assume it's a component invocation if it starts with a capital letter
      if (componentName[0] === componentName[0]?.toUpperCase()) {
        components.push(componentName);
      }
    },
  });

  return components;
}

function extractHelpersFromTemplate(template: string): string[] {
  const helpers: string[] = [];
  const traverse = AST_HBS.traverse();

  traverse(template, {
    MustacheStatement(node) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const helperName = (node.path as any)?.original;
      helpers.push(helperName);
    },
  });

  return helpers;
}

function convertToComponentImports(template: string): string {
  const traverse = AST_HBS.traverse();

  const ast = traverse(template, {
    ElementNode(node) {
      const componentName = node.tag;
      // Assume it's a component invocation if it starts with a capital letter
      if (componentName[0] === componentName[0]?.toUpperCase()) {
        node.tag = getComponentNameFromNestedPath(componentName);
      }
    },
  });

  return AST_HBS.print(ast);
}

function addComponentImports(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ast: any,
  componentNames: Set<string>,
  appName: string,
) {
  [...componentNames].forEach((componentName) => {
    const actualComponentName = getComponentNameFromNestedPath(componentName);
    const importSpecifier = AST_JS.builders.importDefaultSpecifier(
      AST_JS.builders.identifier(actualComponentName),
    );
    const newImport = AST_JS.builders.importDeclaration(
      [importSpecifier],
      AST_JS.builders.stringLiteral(
        convertComponentNameToPath(appName, componentName),
      ),
    );
    ast.program.body.unshift(newImport);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addHelperImports(ast: any, helperNames: Set<string>) {
  const builtinHelpers = [...helperNames].filter((helper) =>
    BUILT_IN_HELPERS.includes(helper),
  );
  if (builtinHelpers.length) {
    const importSpecifiers = builtinHelpers.map((builtinHelper) =>
      AST_JS.builders.importSpecifier(
        AST_JS.builders.identifier(builtinHelper),
      ),
    );
    const newImport = AST_JS.builders.importDeclaration(
      importSpecifiers,
      AST_JS.builders.stringLiteral('@ember/helper'),
    );
    ast.program.body.unshift(newImport);
  }
}

export function convertTests(options: Options): void {
  const { appName, projectRoot } = options;

  const filePaths = findFiles(['**/*-test.js', '**/*-test.ts'], {
    projectRoot,
  });

  const fileMap = new Map(
    filePaths.map((filePath) => {
      let file = readFileSync(join(projectRoot, filePath), 'utf8');

      // Replace hbs`` template string with a <template> tag
      file = rewriteHbsTemplateString(file, {
        appName,
        isTypeScript: isTypeScriptFile(filePath),
      });

      return [filePath, file];
    }),
  );

  createFiles(fileMap, options);
}

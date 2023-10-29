import { readFileSync, renameSync } from 'node:fs';
import { join } from 'node:path';

import { createFiles, findFiles } from '@codemod-utils/files';

import type { Options } from '../types/index.js';

import { AST as AST_JS } from '@codemod-utils/ast-javascript';
import { AST as AST_HBS } from '@codemod-utils/ast-template';

import { kebabCase } from 'change-case';

function replaceExtension(filePath: string): string {
  return filePath.replace('.js', '.gjs');
}

function rewriteHbsTemplateString(file: string, componentRoot: string): string {
  const traverse = AST_JS.traverse();
  let allComponentNames = new Set<string>();
  let allHelperNames = new Set<string>();

  const ast = traverse(file, {
    visitIdentifier(path) {
      if (path.node.name === 'hbs' && path.name === 'tag') {
        let templateCode = path.parentPath.value.quasi.quasis[0].value.raw;
        allComponentNames = new Set([
          ...allComponentNames,
          ...extractComponentsFromTemplate(templateCode),
        ]);
        allHelperNames = new Set([
          ...allHelperNames,
          ...extractHelpersFromTemplate(templateCode),
        ]);
        templateCode = convertToComponentImports(templateCode);
        path.parentPath.parentPath.value[0] = AST_JS.builders.jsxText(
          '<template>' + templateCode + '</template>',
        );
      }
      return false;
    },
    visitImportDeclaration(path) {
      // Remove the `hbs` helper import
      if (path.value.source.value === 'ember-cli-htmlbars') {
        path.replace();
      }
      return false;
    }
  });
  addComponentImports(ast, allComponentNames, componentRoot);
  addHelperImports(ast, allHelperNames);

  return AST_JS.print(ast);
}

function extractComponentsFromTemplate(template: string): string[] {
  const components: string[] = [];
  const traverse = AST_HBS.traverse();

  traverse(template, {
    /* Use AST.builders to transform the tree */
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

const BUILT_IN_HELPERS = ['concat', 'array', 'fn', 'get', 'hash'];

function extractHelpersFromTemplate(template: string): string[] {
  const helpers: string[] = [];
  const traverse = AST_HBS.traverse();

  traverse(template, {
    MustacheStatement(node) {
      const helperName = (node.path as any)?.original;
      helpers.push(helperName);
    }
  });

  return helpers;
}

function convertToComponentImports(template: string): string {
  const traverse = AST_HBS.traverse();

  const ast = traverse(template, {
    /* Use AST.builders to transform the tree */
    ElementNode(node) {
      const componentName = node.tag;
      // Assume it's a component invocation if it starts with a capital letter
      if (componentName[0] === componentName[0]?.toUpperCase()) {
        node.tag = getComponentNameFromNestedPath(componentName)
      }
    },
  });

  return AST_HBS.print(ast);
}

function addComponentImports(ast: any, componentNames: Set<string>, componentRoot: string) {
  [...componentNames].forEach((componentName) => {
    const actualComponentName = getComponentNameFromNestedPath(componentName);
    const importSpecifier = AST_JS.builders.importDefaultSpecifier(AST_JS.builders.identifier(actualComponentName));
    const newImport = AST_JS.builders.importDeclaration(
      [importSpecifier],
      AST_JS.builders.stringLiteral(convertComponentNameToPath(componentRoot, componentName)),
    );
    ast.program.body.unshift(newImport);
  });
}

function addHelperImports(ast: any, helperNames: Set<string>) {
  const builtinHelpers = [...helperNames].filter((helper) => BUILT_IN_HELPERS.includes(helper));
  if (builtinHelpers.length) {
    const importSpecifiers = builtinHelpers.map((builtinHelper) => AST_JS.builders.importSpecifier(AST_JS.builders.identifier(builtinHelper)));
    const newImport = AST_JS.builders.importDeclaration(
      importSpecifiers,
      AST_JS.builders.stringLiteral('@ember/helper'),
    );
    ast.program.body.unshift(newImport);
  }
}

function convertComponentNameToPath(componentRoot: string, componentName: string): string {
  return componentRoot + [...componentName.split('::').map((componentPart) => kebabCase(componentPart))].join('/');
}

function getComponentNameFromNestedPath(componentPath: string): string {
  return componentPath.split('::').pop() ?? '';
}

export function convertTests(options: Options): void {
  const { componentRoot, projectRoot } = options;

  const filePaths = findFiles('**/*-test.js', {
    projectRoot,
  });

  const fileMap = new Map(
    filePaths.map((filePath) => {
      let file = readFileSync(join(projectRoot, filePath), 'utf8');

      // Move file to new extension
      const newFilePath = replaceExtension(filePath);
      renameSync(join(projectRoot, filePath), join(projectRoot, newFilePath));

      // Replace hbs`` template string with a <template> tag
      file = rewriteHbsTemplateString(file, componentRoot);

      return [newFilePath, file];
    }),
  );

  createFiles(fileMap, options);
}

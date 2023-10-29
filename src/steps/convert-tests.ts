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

function rewriteHbsTemplateString(file: string): string {
  const traverse = AST_JS.traverse();
  let allComponentNames = new Set<string>();

  const ast = traverse(file, {
    visitIdentifier(path) {
      if (path.node.name === 'hbs' && path.name === 'tag') {
        let code = path.parentPath.value.quasi.quasis[0].value.raw;
        allComponentNames = new Set([
          ...allComponentNames,
          ...extractComponentsFromTemplate(code),
        ]);
        code = convertToComponentImports(code);
        path.parentPath.parentPath.value[0] = AST_JS.builders.jsxText(
          '<template>' + code + '</template>',
        );
      }
      return false;
    },
  });
  addComponentImports(ast, allComponentNames);

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

function addComponentImports(ast: any, componentNames: Set<string>) {
  [...componentNames].forEach((componentName) => {
    const actualComponentName = getComponentNameFromNestedPath(componentName);
    const importSpecifier = AST_JS.builders.importDefaultSpecifier(AST_JS.builders.identifier(actualComponentName));
    const newImport = AST_JS.builders.importDeclaration(
      [importSpecifier],
      AST_JS.builders.stringLiteral(convertComponentNameToPath('example-app/components/', componentName)),
    );
    ast.program.body.unshift(newImport);
  });
}

function convertComponentNameToPath(componentRoot: string, componentName: string): string {
  return componentRoot + [...componentName.split('::').map((componentPart) => kebabCase(componentPart))].join('/');
}

function getComponentNameFromNestedPath(componentPath: string): string {
  return componentPath.split('::').pop() ?? '';
}

export function convertTests(options: Options): void {
  const { projectRoot } = options;

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
      file = rewriteHbsTemplateString(file);

      return [newFilePath, file];
    }),
  );

  createFiles(fileMap, options);
}

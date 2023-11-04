import { kebabCase } from 'change-case';

export function convertComponentNameToPath(
  appName: string,
  componentName: string,
): string {
  return (
    appName +
    '/components/' +
    [
      ...componentName
        .split('::')
        .map((componentPart) => kebabCase(componentPart)),
    ].join('/')
  );
}

export function getComponentNameFromNestedPath(componentPath: string): string {
  return componentPath.split('::').pop() ?? '';
}

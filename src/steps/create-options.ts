import type { CodemodOptions, Options } from '../types/index.js';

export function createOptions(codemodOptions: CodemodOptions): Options {
  const { appName: appName, projectRoot } = codemodOptions;

  return {
    appName: appName,
    projectRoot,
  };
}

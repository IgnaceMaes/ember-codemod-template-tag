import type { CodemodOptions, Options } from '../types/index.js';

export function createOptions(codemodOptions: CodemodOptions): Options {
  const { appName, filename, projectRoot } = codemodOptions;

  return {
    appName,
    filename,
    projectRoot,
  };
}

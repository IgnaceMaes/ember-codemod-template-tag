import { convertTests, createOptions } from './steps/index.js';
import { removeHbsImport } from './steps/remove-import.js';
import type { CodemodOptions } from './types/index.js';

export function runCodemod(codemodOptions: CodemodOptions): void {
  const options = createOptions(codemodOptions);

  convertTests(options);
  removeHbsImport(options);
}

import { changeExtension } from './steps/change-extension.js';
import { convertTests, createOptions } from './steps/index.js';
import { removeHbsImport } from './steps/remove-import.js';
import type { CodemodOptions } from './types/index.js';

export function runCodemod(codemodOptions: CodemodOptions): void {
  const options = createOptions(codemodOptions);

  convertTests(options);
  changeExtension(options);
  removeHbsImport(options);
}

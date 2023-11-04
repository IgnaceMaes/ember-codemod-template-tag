export function isTypeScriptFile(filePath: string) {
  return filePath.endsWith('.ts') || filePath.endsWith('.gts');
}

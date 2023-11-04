export function isTypeScriptFile(filePath: string) {
  return filePath.endsWith('.ts') || filePath.endsWith('.gts');
}

export function replaceExtensionWithGlimmer(filePath: string): string {
  return filePath.replace('.js', '.gjs').replace('.ts', '.gts');
}

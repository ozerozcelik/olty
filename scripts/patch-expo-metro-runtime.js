const fs = require('fs');
const path = require('path');

const runtimeFile = path.join(
  process.cwd(),
  'node_modules',
  '@expo',
  'metro-runtime',
  'src',
  'messageSocket.native.ts'
);

if (!fs.existsSync(runtimeFile)) {
  console.log('[patch-expo-metro-runtime] Skipped: runtime file not found.');
  process.exit(0);
}

const original = fs.readFileSync(runtimeFile, 'utf8');
const buggySnippet = [
  "  const getDevServer = require('react-native/Libraries/Core/Devtools/getDevServer');",
  '  const devServer = getDevServer();',
].join('\n');

const fixedSnippet = [
  "  const getDevServerModule = require('react-native/Libraries/Core/Devtools/getDevServer');",
  '  const getDevServer =',
  "    typeof getDevServerModule === 'function' ? getDevServerModule : getDevServerModule.default;",
  '  const devServer = getDevServer();',
].join('\n');

if (original.includes(fixedSnippet)) {
  console.log('[patch-expo-metro-runtime] Already patched.');
  process.exit(0);
}

if (!original.includes(buggySnippet)) {
  console.log('[patch-expo-metro-runtime] Skipped: expected snippet not found.');
  process.exit(0);
}

fs.writeFileSync(runtimeFile, original.replace(buggySnippet, fixedSnippet));
console.log('[patch-expo-metro-runtime] Applied compatibility patch.');

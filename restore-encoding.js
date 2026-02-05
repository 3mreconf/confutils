const fs = require('fs');
const { execSync } = require('child_process');

// Get the file content from git commit 0511df7
const content = execSync('git show 0511df7:src/i18n/translations.ts', { encoding: 'utf8' });

// Write with explicit UTF-8 encoding
fs.writeFileSync('src/i18n/translations.ts', content, { encoding: 'utf8' });

console.log('✓ Restored translations.ts with correct UTF-8 encoding');

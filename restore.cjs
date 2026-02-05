const fs = require('fs');
const { execSync } = require('child_process');

console.log('Restoring translations.ts from commit 0511df7...');

// Get content as Buffer (binary) to avoid any encoding mismatches during pipe
const content = execSync('git show 0511df7:src/i18n/translations.ts');

// Write buffer directly to file
fs.writeFileSync('src/i18n/translations.ts', content);

console.log('✓ Restored translations.ts (binary write)');

// Verify a known Turkish string
const text = fs.readFileSync('src/i18n/translations.ts', 'utf8');
if (text.includes("Sistem Özeti")) {
    console.log('✓ Verification Passed: "Sistem Özeti" found');
} else {
    console.error('✗ Verification Failed: "Sistem Özeti" NOT found');
    // Check what is found instead
    const match = text.match(/dashboard_title:\s*'([^']+)'/);
    if (match) console.log('  Found instead:', match[1]);
}

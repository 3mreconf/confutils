const fs = require('fs');

if (process.argv.length < 3) {
    console.error('Usage: node sync-version.js <new_version>');
    process.exit(1);
}

const newVersion = process.argv[2];
console.log(`Syncing version to ${newVersion}...`);

const files = [
    {
        path: 'src/PremiumApp.tsx',
        regex: /const currentVersion = '[0-9]+\.[0-9]+\.[0-9]+';/,
        replacement: `const currentVersion = '${newVersion}';`
    },
    {
        path: 'src/premium/pages/About.tsx',
        regex: /\{t\('version'\)\} [0-9]+\.[0-9]+\.[0-9]+/,
        replacement: `{t('version')} ${newVersion}`
    },
    {
        path: 'src/i18n/translations.ts',
        regex: /app_version: 'v[0-9]+\.[0-9]+\.[0-9]+'/,
        replacement: `app_version: 'v${newVersion}'`
    }
];

let errors = 0;

for (const file of files) {
    try {
        if (fs.existsSync(file.path)) {
            let content = fs.readFileSync(file.path, 'utf8');
            if (content.match(file.regex)) {
                const newContent = content.replace(file.regex, file.replacement);
                fs.writeFileSync(file.path, newContent, 'utf8');
                console.log(`✓ Synced: ${file.path}`);
            } else {
                console.warn(`! Pattern not found in: ${file.path}`);
            }
        } else {
            console.error(`✗ File not found: ${file.path}`);
            errors++;
        }
    } catch (err) {
        console.error(`✗ Error processing ${file.path}:`, err);
        errors++;
    }
}

if (errors > 0) process.exit(1);
console.log('Version sync complete.');

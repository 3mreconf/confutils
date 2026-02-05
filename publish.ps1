# ConfUtils Advanced Publish Script
# Usage: ./publish.ps1 -BumpType patch (default) | minor | major

param(
    [Parameter(Position=0)]
    [ValidateSet("patch", "minor", "major")]
    [string]$BumpType = "patch"
)

# 1. Check if required config files exist
if (!(Test-Path "package.json")) {
    Write-Host "[ERROR] Could not find package.json in the current directory." -ForegroundColor Red
    exit 1
}
$TauriConfigPath = "src-tauri/tauri.conf.json"
if (!(Test-Path $TauriConfigPath)) {
    Write-Host "[ERROR] Could not find tauri.conf.json at $TauriConfigPath" -ForegroundColor Red
    exit 1
}

Write-Host ">>> Creating release with version bump: $BumpType" -ForegroundColor Cyan

# 2. Get current version and bump it
Write-Host "`n[1/5] Bouncing version..." -ForegroundColor Yellow
$PackageJson = Get-Content "package.json" | ConvertFrom-Json
$OldVersion = $PackageJson.version

$versionParts = $OldVersion.Split('.')
if ($versionParts.Count -ne 3) {
    Write-Host "[ERROR] Could not parse version $OldVersion. Expected format X.Y.Z" -ForegroundColor Red
    exit 1
}

[int]$major = $versionParts[0]
[int]$minor = $versionParts[1]
[int]$patch = $versionParts[2]

switch ($BumpType) {
    "major" { 
        $major++
        $minor = 0
        $patch = 0
    }
    "minor" { 
        $minor++
        $patch = 0
    }
    "patch" { 
        $patch++
    }
}

$NewVersion = "$major.$minor.$patch"
$TagVersion = "v$NewVersion"

# 3. Update Config Files
Write-Host "`n[2/5] Updating configuration files..." -ForegroundColor Yellow
Write-Host "Updating package.json: $OldVersion -> $NewVersion" -ForegroundColor Green
$PackageJson.version = $NewVersion
$PackageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"

Write-Host "Updating tauri.conf.json: -> $NewVersion" -ForegroundColor Green
$TauriJson = Get-Content $TauriConfigPath | ConvertFrom-Json
$TauriJson.version = $NewVersion
$TauriJson | ConvertTo-Json -Depth 100 | Set-Content $TauriConfigPath

# 4. Update Source Files (Hardcoded versions)
Write-Host "`n[3/5] Syncing source code versions..." -ForegroundColor Yellow

# Function to replace version in file
function Sync-Version($Path, $Regex, $Replacement) {
    if (Test-Path $Path) {
        $content = Get-Content $Path -Raw
        $newContent = $content -replace $Regex, $Replacement
        $newContent | Set-Content $Path
        Write-Host "Synced: $Path" -ForegroundColor Gray
    } else {
        Write-Host "[WARNING] File not found: $Path" -ForegroundColor DarkYellow
    }
}

# Sync PremiumApp.tsx
Sync-Version "src/PremiumApp.tsx" "const currentVersion = '[0-9]+\.[0-9]+\.[0-9]+';" "const currentVersion = '$NewVersion';"

# Sync About.tsx
Sync-Version "src/premium/pages/About.tsx" "\{t\('version'\)\} [0-9]+\.[0-9]+\.[0-9]+" "{t('version')} $NewVersion"

# Sync translations.ts (app_version: 'v2.1.0')
Sync-Version "src/i18n/translations.ts" "app_version: 'v[0-9]+\.[0-9]+\.[0-9]+'" "app_version: 'v$NewVersion'"

# 5. Git operations
Write-Host "`n[4/5] Committing changes..." -ForegroundColor Yellow
git add .
git commit -m "chore: bump version to $NewVersion and sync all configs"

Write-Host "`n[5/5] Creating tag $TagVersion..." -ForegroundColor Yellow
git tag -a $TagVersion -m "Release $TagVersion"

# 6. Pushing to GitHub
Write-Host "`n>>> Pushing to GitHub..." -ForegroundColor Yellow
git push origin main
git push origin $TagVersion

Write-Host "`nSUCCESS: Release created! GitHub Actions will build and publish the release." -ForegroundColor Green
Write-Host "Release URL: https://github.com/3mreconf/confutils/releases/tag/$TagVersion" -ForegroundColor Cyan

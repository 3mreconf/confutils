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

# Use Node.js script for safe UTF-8 handling
node sync-version.cjs $NewVersion

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Version sync failed!" -ForegroundColor Red
    exit 1
}

# 5. Git operations
Write-Host "`n[4/5] Committing changes..." -ForegroundColor Yellow
git add .
git commit -m "chore: bump version to $NewVersion and sync all configs"

# 6. Sync with remote before tagging (avoid non-fast-forward)
Write-Host "`n[5/5] Syncing with remote..." -ForegroundColor Yellow
git pull --rebase origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Rebase failed. Resolve conflicts and rerun publish.ps1." -ForegroundColor Red
    exit 1
}

Write-Host "Creating tag $TagVersion..." -ForegroundColor Yellow
git tag -a $TagVersion -m "Release $TagVersion"

# 7. Pushing to GitHub (retry on transient failures)
Write-Host "`n>>> Pushing to GitHub..." -ForegroundColor Yellow
$maxRetries = 3
for ($i = 1; $i -le $maxRetries; $i++) {
    git push origin main --tags
    if ($LASTEXITCODE -eq 0) { break }
    if ($i -lt $maxRetries) {
        Write-Host "Push failed (attempt $i/$maxRetries). Retrying in 3 seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    } else {
        Write-Host "[ERROR] Push failed after $maxRetries attempts." -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nSUCCESS: Release created! GitHub Actions will build and publish the release." -ForegroundColor Green
Write-Host "Release URL: https://github.com/3mreconf/confutils/releases/tag/$TagVersion" -ForegroundColor Cyan
